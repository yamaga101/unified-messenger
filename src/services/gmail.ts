import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";
import { getGoogleAuthToken } from "@/lib/auth";
import { MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
  internalDate?: string;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  resultSizeEstimate?: number;
}

export class GmailService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    const token = await getGoogleAuthToken();
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${MAX_MESSAGES_PER_SERVICE}&q=is:unread`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!listRes.ok) {
      throw new Error(`Gmail API error: ${listRes.status}`);
    }

    const listData: GmailListResponse = await listRes.json();
    if (!listData.messages?.length) return [];

    const messages = await Promise.all(
      listData.messages.slice(0, MAX_MESSAGES_PER_SERVICE).map((m) =>
        this.fetchMessageDetail(token, m.id),
      ),
    );

    return messages.filter((m): m is UnifiedMessage => m !== null);
  }

  private async fetchMessageDetail(
    token: string,
    messageId: string,
  ): Promise<UnifiedMessage | null> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) return null;

    const msg: GmailMessage = await res.json();
    const headers = msg.payload?.headers ?? [];
    const from = headers.find((h) => h.name === "From")?.value ?? "Unknown";
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";

    return {
      id: `gmail-${msg.id}`,
      serviceType: "gmail",
      sender: this.extractSenderName(from),
      content: subject || msg.snippet || "",
      timestamp: Number(msg.internalDate ?? Date.now()),
      isUnread: msg.labelIds?.includes("UNREAD") ?? true,
      deepLink: this.getDeepLink(msg.id),
    };
  }

  private extractSenderName(from: string): string {
    const match = from.match(/^"?(.+?)"?\s*<.+>$/);
    return match ? match[1] : from;
  }

  async getUnreadCount(): Promise<number> {
    const token = await getGoogleAuthToken(false);
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/labels/UNREAD",
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) return 0;

    const data = await res.json();
    return data.messagesUnread ?? 0;
  }

  getDeepLink(messageId: string): string {
    const rawId = messageId.replace("gmail-", "");
    return `https://mail.google.com/mail/u/0/#inbox/${rawId}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const token = await getGoogleAuthToken(false);
      const res = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
