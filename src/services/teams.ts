import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";
import { launchWebAuthFlow } from "@/lib/auth";
import { MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";

interface TeamsChat {
  id: string;
  topic?: string;
  chatType: string;
}

interface TeamsMessage {
  id: string;
  createdDateTime: string;
  body: {
    contentType: string;
    content: string;
  };
  from?: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  chatId?: string;
}

const GRAPH_API = "https://graph.microsoft.com/v1.0";

export class TeamsService extends BaseService {
  private accessToken: string | null = null;

  constructor(config: ServiceConfig) {
    super(config);
  }

  private async getToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    if (this.config.apiToken) {
      this.accessToken = this.config.apiToken;
      return this.accessToken;
    }

    // Azure AD OAuth flow
    const clientId = this.config.baseUrl ?? ""; // Store Azure client ID in baseUrl
    const redirectUrl = chrome.identity.getRedirectURL();
    const authUrl =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUrl)}` +
      `&scope=${encodeURIComponent("Chat.Read ChatMessage.Read")}`;

    const responseUrl = await launchWebAuthFlow(authUrl);
    const hash = new URL(responseUrl).hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");

    if (!token) throw new Error("Failed to get Teams access token");
    this.accessToken = token;
    return token;
  }

  private async apiFetch<T>(path: string): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${GRAPH_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      this.accessToken = null;
      throw new Error("Teams token expired");
    }

    if (!res.ok) {
      throw new Error(`Teams API error: ${res.status}`);
    }

    return res.json();
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    const chatsData = await this.apiFetch<{ value: TeamsChat[] }>("/me/chats?$top=10");
    const allMessages: UnifiedMessage[] = [];

    for (const chat of chatsData.value) {
      try {
        const msgData = await this.apiFetch<{ value: TeamsMessage[] }>(
          `/me/chats/${chat.id}/messages?$top=5&$orderby=createdDateTime desc`,
        );

        for (const msg of msgData.value) {
          if (!msg.from?.user) continue;

          allMessages.push({
            id: `teams-${msg.id}`,
            serviceType: "teams",
            sender: msg.from.user.displayName,
            content: this.stripHtml(msg.body.content).slice(0, 200),
            timestamp: new Date(msg.createdDateTime).getTime(),
            isUnread: true,
            deepLink: this.getDeepLink(msg.id, chat.id),
            channelName: chat.topic ?? "Chat",
          });
        }
      } catch {
        // Skip chats with errors
      }
    }

    return allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_MESSAGES_PER_SERVICE);
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
  }

  async getUnreadCount(): Promise<number> {
    const messages = await this.fetchMessages();
    return messages.filter((m) => m.isUnread).length;
  }

  getDeepLink(_messageId: string, chatId?: string): string {
    if (chatId) {
      return `https://teams.microsoft.com/l/chat/${chatId}/0`;
    }
    return "https://teams.microsoft.com/";
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
