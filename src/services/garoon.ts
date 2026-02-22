import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";
import { MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";

interface SoapNotification {
  moduleId: string;
  item: string;
  status: string;
  subject: string;
  senderName: string;
  senderId: string;
  receiveDatetime: string;
  subjectUrl: string;
}

export class GaroonService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  private get baseUrl(): string {
    return (this.config.baseUrl ?? "").replace(/\/+$/, "");
  }

  private get soapUrl(): string {
    const base = this.baseUrl;
    // Strip REST API path if present
    const cleaned = base.replace(/\/api\/v1\/?$/, "");
    // Strip trailing /grn.cgi if present, then re-add
    const root = cleaned.replace(/\/grn\.cgi\/?$/, "");
    return `${root}/grn.cgi/cbpapi/notification/api`;
  }

  private buildSoapHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/soap+xml; charset=utf-8",
    };

    const user = this.config.username ?? "";
    const pass = this.config.password ?? "";
    headers["X-Cybozu-Authorization"] = btoa(`${user}:${pass}`);

    const proxyUser = this.config.proxyUsername ?? "";
    const proxyPass = this.config.proxyPassword ?? "";
    if (proxyUser) {
      headers["Authorization"] = `Basic ${btoa(`${proxyUser}:${proxyPass}`)}`;
    }

    return headers;
  }

  private buildVersionsEnvelope(): string {
    const user = this.config.username ?? "";
    const pass = this.config.password ?? "";
    const now = new Date().toISOString();
    // Fetch notifications from the last 7 days
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header>
    <Action>NotificationGetNotificationVersions</Action>
    <Timestamp>
      <Created>${now}</Created>
      <Expires>2037-08-12T14:45:00Z</Expires>
    </Timestamp>
    <Locale>ja</Locale>
    <Security>
      <UsernameToken>
        <Username>${escapeXml(user)}</Username>
        <Password>${escapeXml(pass)}</Password>
      </UsernameToken>
    </Security>
  </soap:Header>
  <soap:Body>
    <NotificationGetNotificationVersions>
      <parameters start="${start}" end="${now}"></parameters>
    </NotificationGetNotificationVersions>
  </soap:Body>
</soap:Envelope>`;
  }

  private buildGetByIdEnvelope(
    items: Array<{ moduleId: string; item: string }>,
  ): string {
    const user = this.config.username ?? "";
    const pass = this.config.password ?? "";
    const now = new Date().toISOString();

    const notificationIds = items
      .map(
        (i) =>
          `<notification_id module_id="${escapeXml(i.moduleId)}" item="${escapeXml(i.item)}" />`,
      )
      .join("\n        ");

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header>
    <Action>NotificationGetNotificationsById</Action>
    <Timestamp>
      <Created>${now}</Created>
      <Expires>2037-08-12T14:45:00Z</Expires>
    </Timestamp>
    <Locale>ja</Locale>
    <Security>
      <UsernameToken>
        <Username>${escapeXml(user)}</Username>
        <Password>${escapeXml(pass)}</Password>
      </UsernameToken>
    </Security>
  </soap:Header>
  <soap:Body>
    <NotificationGetNotificationsById>
      <parameters>
        ${notificationIds}
      </parameters>
    </NotificationGetNotificationsById>
  </soap:Body>
</soap:Envelope>`;
  }

  private async soapFetch(envelope: string): Promise<string> {
    if (!this.baseUrl) {
      throw new Error("Garoon URL not configured");
    }

    const res = await fetch(this.soapUrl, {
      method: "POST",
      headers: this.buildSoapHeaders(),
      body: envelope,
      credentials: "omit",
    });

    if (!res.ok) {
      throw new Error(`Garoon SOAP error: ${res.status}`);
    }

    const text = await res.text();
    if (text.includes("<soap:Fault>")) {
      const match = text.match(/<Detail[^>]*>([\s\S]*?)<\/Detail>/i);
      throw new Error(`Garoon SOAP fault: ${match?.[1] ?? "unknown"}`);
    }

    return text;
  }

  private parseVersions(
    xml: string,
  ): Array<{ moduleId: string; item: string }> {
    const results: Array<{ moduleId: string; item: string }> = [];
    const regex =
      /notification_item_version[^>]*operation="(?!delete)[^"]*"[^>]*>[\s\S]*?<notification_id\s+module_id="([^"]+)"\s+item="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      results.push({ moduleId: match[1], item: match[2] });
    }

    // Fallback: simpler regex if the above didn't match
    if (results.length === 0) {
      const simpleRegex =
        /notification_id\s+module_id="([^"]+)"\s+item="([^"]+)"/g;
      while ((match = simpleRegex.exec(xml)) !== null) {
        results.push({ moduleId: match[1], item: match[2] });
      }
    }

    return results;
  }

  private parseNotifications(xml: string): SoapNotification[] {
    const results: SoapNotification[] = [];
    const regex =
      /<notification\s+([^>]+)\/?>|<notification\s+([^>]+)>[\s\S]*?<\/notification>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const attrs = match[1] || match[2];
      const notification = parseAttributes(attrs);
      if (notification.is_history === "true") continue;

      results.push({
        moduleId: notification.module_id ?? "",
        item: notification.item ?? "",
        status: notification.status ?? "",
        subject: unescapeXml(notification.subject ?? ""),
        senderName: unescapeXml(notification.sender_name ?? ""),
        senderId: notification.sender_id ?? "",
        receiveDatetime: notification.receive_datetime ?? "",
        subjectUrl: notification.subject_url ?? "",
      });
    }
    return results;
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    // Step 1: Get notification versions (IDs of unread notifications)
    const versionsXml = await this.soapFetch(this.buildVersionsEnvelope());
    const versionItems = this.parseVersions(versionsXml);

    if (versionItems.length === 0) return [];

    // Step 2: Get notification details by ID (limit to 20)
    const targetItems = versionItems.slice(0, MAX_MESSAGES_PER_SERVICE);
    const detailsXml = await this.soapFetch(
      this.buildGetByIdEnvelope(targetItems),
    );
    const notifications = this.parseNotifications(detailsXml);

    return notifications.slice(0, MAX_MESSAGES_PER_SERVICE).map((n) => ({
      id: `garoon-${n.moduleId}-${n.item}`,
      serviceType: "garoon" as const,
      sender: n.senderName,
      content: n.subject,
      timestamp: n.receiveDatetime
        ? new Date(n.receiveDatetime).getTime()
        : Date.now(),
      isUnread: true,
      deepLink: this.getDeepLink(n.item, n.subjectUrl),
    }));
  }

  async getUnreadCount(): Promise<number> {
    const versionsXml = await this.soapFetch(this.buildVersionsEnvelope());
    return this.parseVersions(versionsXml).length;
  }

  getDeepLink(messageId: string, url?: string): string {
    if (url) {
      if (url.startsWith("http")) return url;
      return `${this.baseUrl}${url}`;
    }
    return `${this.baseUrl}/`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.soapFetch(this.buildVersionsEnvelope());
      return true;
    } catch {
      return false;
    }
  }

  async requestHostPermission(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const origin = new URL(this.baseUrl).origin + "/*";
      return await chrome.permissions.request({
        origins: [origin],
      });
    } catch {
      return false;
    }
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, "\n");
}

function parseAttributes(attrString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}
