import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";
import { getGoogleAuthToken } from "@/lib/auth";
import { MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";

interface ChatSpace {
  name: string;
  displayName: string;
  type: string;
}

interface ChatMessage {
  name: string;
  sender: {
    name: string;
    displayName: string;
    type: string;
  };
  createTime: string;
  text?: string;
  thread?: {
    name: string;
  };
}

interface ChatSpacesResponse {
  spaces?: ChatSpace[];
}

interface ChatMessagesResponse {
  messages?: ChatMessage[];
}

export class GoogleChatService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  private async apiFetch<T>(path: string): Promise<T> {
    const token = await getGoogleAuthToken();
    const res = await fetch(`https://chat.googleapis.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 403 || res.status === 404) {
      throw new Error("Google Chat requires a Google Workspace account");
    }

    if (!res.ok) {
      throw new Error(`Google Chat API error: ${res.status}`);
    }

    return res.json();
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    const spacesData = await this.apiFetch<ChatSpacesResponse>("/spaces");
    const spaces = spacesData.spaces ?? [];

    const allMessages: UnifiedMessage[] = [];

    for (const space of spaces.slice(0, 5)) {
      try {
        const msgData = await this.apiFetch<ChatMessagesResponse>(
          `/${space.name}/messages?pageSize=5&orderBy=createTime desc`,
        );

        for (const msg of msgData.messages ?? []) {
          if (msg.sender.type === "BOT") continue;

          allMessages.push({
            id: `gchat-${msg.name}`,
            serviceType: "google-chat",
            sender: msg.sender.displayName,
            content: msg.text?.slice(0, 200) ?? "",
            timestamp: new Date(msg.createTime).getTime(),
            isUnread: true,
            deepLink: this.getDeepLink(msg.name),
            channelName: space.displayName,
          });
        }
      } catch {
        // Skip spaces with errors
      }
    }

    return allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_MESSAGES_PER_SERVICE);
  }

  async getUnreadCount(): Promise<number> {
    // Google Chat API does not provide a direct unread count
    // Use messages count as approximation
    const messages = await this.fetchMessages();
    return messages.length;
  }

  getDeepLink(messageName: string): string {
    // Extract space name to build URL
    const parts = messageName.replace("gchat-", "").split("/");
    const spaceId = parts[1] ?? "";
    return `https://chat.google.com/room/${spaceId}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.apiFetch<ChatSpacesResponse>("/spaces?pageSize=1");
      return true;
    } catch {
      return false;
    }
  }
}
