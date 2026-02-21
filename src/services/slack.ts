import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";
import { MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  num_members: number;
  unread_count?: number;
  unread_count_display?: number;
}

interface SlackMessage {
  ts: string;
  type: string;
  text: string;
  user?: string;
  username?: string;
  channel?: string;
}

interface SlackUserProfile {
  real_name: string;
  display_name: string;
  image_48: string;
}

const SLACK_API = "https://slack.com/api";

export class SlackService extends BaseService {
  private userCache = new Map<string, SlackUserProfile>();

  constructor(config: ServiceConfig) {
    super(config);
  }

  private get token(): string {
    return this.config.apiToken ?? "";
  }

  private async apiFetch<T>(method: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.token) {
      throw new Error("Slack token not configured");
    }

    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${SLACK_API}/${method}?${query}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!res.ok) {
      throw new Error(`Slack API error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  private async getUserName(userId: string): Promise<string> {
    const cached = this.userCache.get(userId);
    if (cached) return cached.display_name || cached.real_name;

    try {
      const data = await this.apiFetch<{ user: { profile: SlackUserProfile } }>(
        "users.info",
        { user: userId },
      );
      this.userCache.set(userId, data.user.profile);
      return data.user.profile.display_name || data.user.profile.real_name;
    } catch {
      return userId;
    }
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    const channelsData = await this.apiFetch<{ channels: SlackChannel[] }>(
      "conversations.list",
      { types: "public_channel,private_channel,im,mpim", limit: "20" },
    );

    const unreadChannels = channelsData.channels
      .filter((c) => c.is_member && (c.unread_count_display ?? 0) > 0)
      .slice(0, 5);

    const allMessages: UnifiedMessage[] = [];

    for (const ch of unreadChannels) {
      try {
        const histData = await this.apiFetch<{ messages: SlackMessage[] }>(
          "conversations.history",
          { channel: ch.id, limit: "5" },
        );

        for (const msg of histData.messages) {
          if (msg.type !== "message") continue;

          const sender = msg.user
            ? await this.getUserName(msg.user)
            : msg.username ?? "Unknown";

          allMessages.push({
            id: `slack-${ch.id}-${msg.ts}`,
            serviceType: "slack",
            sender,
            content: msg.text.slice(0, 200),
            timestamp: parseFloat(msg.ts) * 1000,
            isUnread: true,
            deepLink: this.getDeepLink(msg.ts, ch.id),
            channelName: ch.name,
          });
        }
      } catch {
        // Skip channels with errors
      }
    }

    return allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_MESSAGES_PER_SERVICE);
  }

  async getUnreadCount(): Promise<number> {
    const data = await this.apiFetch<{ channels: SlackChannel[] }>(
      "conversations.list",
      { types: "public_channel,private_channel,im,mpim", limit: "100" },
    );

    return data.channels
      .filter((c) => c.is_member)
      .reduce((sum, c) => sum + (c.unread_count_display ?? 0), 0);
  }

  getDeepLink(messageTs: string, channelId?: string): string {
    if (channelId) {
      return `https://app.slack.com/client/T00000000/${channelId}/p${messageTs.replace(".", "")}`;
    }
    return "https://app.slack.com/";
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.apiFetch("auth.test");
      return true;
    } catch {
      return false;
    }
  }
}
