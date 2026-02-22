import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";
import { MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";

interface GaroonNotification {
  id: string;
  moduleId: string;
  creator: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
  operation: string;
  url: string;
  title: string;
  body: string;
  isRead: boolean;
}

interface GaroonNotificationResponse {
  notifications: GaroonNotification[];
  hasNext: boolean;
}

export class GaroonService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  private get baseUrl(): string {
    return (this.config.baseUrl ?? "").replace(/\/+$/, "");
  }

  /**
   * Garoon uses X-Cybozu-Authorization (base64 of user:pass) for app login.
   * Optionally, a web server / reverse proxy Basic Auth is sent as Authorization header.
   */
  private buildHeaders(): Record<string, string> {
    const user = this.config.username ?? "";
    const pass = this.config.password ?? "";
    const headers: Record<string, string> = {
      "X-Cybozu-Authorization": btoa(`${user}:${pass}`),
      "Content-Type": "application/json",
    };

    // Optional: web server / reverse proxy Basic Auth (separate layer)
    const proxyUser = this.config.proxyUsername ?? "";
    const proxyPass = this.config.proxyPassword ?? "";
    if (proxyUser) {
      headers["Authorization"] = `Basic ${btoa(`${proxyUser}:${proxyPass}`)}`;
    }

    return headers;
  }

  private async apiFetch<T>(path: string): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("Garoon URL not configured");
    }

    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      headers: this.buildHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Garoon API error: ${res.status}`);
    }

    return res.json();
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    const data = await this.apiFetch<GaroonNotificationResponse>(
      "/notification/items?limit=20&fields=id,creator,createdAt,title,body,url,isRead",
    );

    return data.notifications
      .filter((n) => !n.isRead)
      .slice(0, MAX_MESSAGES_PER_SERVICE)
      .map((n) => ({
        id: `garoon-${n.id}`,
        serviceType: "garoon" as const,
        sender: n.creator.name,
        content: n.title || n.body.slice(0, 200),
        timestamp: new Date(n.createdAt).getTime(),
        isUnread: !n.isRead,
        deepLink: this.getDeepLink(n.id, n.url),
      }));
  }

  async getUnreadCount(): Promise<number> {
    const data = await this.apiFetch<GaroonNotificationResponse>(
      "/notification/items?limit=100&fields=id,isRead",
    );
    return data.notifications.filter((n) => !n.isRead).length;
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
      await this.apiFetch("/notification/items?limit=1");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Request host permission for the configured Garoon on-prem URL.
   */
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
