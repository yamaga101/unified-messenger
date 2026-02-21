import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";
import { MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";

interface ChatworkRoom {
  room_id: number;
  name: string;
  unread_num: number;
}

interface ChatworkMessage {
  message_id: string;
  account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  body: string;
  send_time: number;
  update_time: number;
}

export class ChatworkService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  private get apiToken(): string {
    return this.config.apiToken ?? "";
  }

  private async apiFetch<T>(path: string): Promise<T> {
    if (!this.apiToken) {
      throw new Error("Chatwork API token not configured");
    }

    const res = await fetch(`https://api.chatwork.com/v2${path}`, {
      headers: { "X-ChatWorkToken": this.apiToken },
    });

    if (!res.ok) {
      throw new Error(`Chatwork API error: ${res.status}`);
    }

    return res.json();
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    const rooms = await this.apiFetch<ChatworkRoom[]>("/rooms");
    const unreadRooms = rooms
      .filter((r) => r.unread_num > 0)
      .sort((a, b) => b.unread_num - a.unread_num)
      .slice(0, 5);

    const allMessages: UnifiedMessage[] = [];

    for (const room of unreadRooms) {
      try {
        const messages = await this.apiFetch<ChatworkMessage[]>(
          `/rooms/${room.room_id}/messages?force=1`,
        );

        const recent = messages.slice(-MAX_MESSAGES_PER_SERVICE);
        for (const msg of recent) {
          allMessages.push({
            id: `chatwork-${msg.message_id}`,
            serviceType: "chatwork",
            sender: msg.account.name,
            senderAvatar: msg.account.avatar_image_url,
            content: msg.body.slice(0, 200),
            timestamp: msg.send_time * 1000,
            isUnread: true,
            deepLink: this.getDeepLink(msg.message_id, room.room_id),
            channelName: room.name,
          });
        }
      } catch {
        // Skip rooms with errors
      }
    }

    return allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_MESSAGES_PER_SERVICE);
  }

  async getUnreadCount(): Promise<number> {
    const rooms = await this.apiFetch<ChatworkRoom[]>("/rooms");
    return rooms.reduce((sum, r) => sum + r.unread_num, 0);
  }

  getDeepLink(messageId: string, roomId?: number): string {
    const rawId = messageId.replace("chatwork-", "");
    if (roomId) {
      return `https://www.chatwork.com/#!rid${roomId}-${rawId}`;
    }
    return `https://www.chatwork.com/`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.apiFetch("/me");
      return true;
    } catch {
      return false;
    }
  }
}
