import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";

/**
 * Discord service: relies on content script for data.
 * Messages come via chrome.runtime.sendMessage from content-scripts/discord.ts.
 */
export class DiscordService extends BaseService {
  private cachedMessages: UnifiedMessage[] = [];
  private cachedUnreadCount = 0;

  constructor(config: ServiceConfig) {
    super(config);
  }

  updateFromContentScript(count: number, messages: UnifiedMessage[] = []): void {
    this.cachedUnreadCount = count;
    this.cachedMessages = messages;
  }

  async fetchMessages(): Promise<UnifiedMessage[]> {
    return this.cachedMessages;
  }

  async getUnreadCount(): Promise<number> {
    return this.cachedUnreadCount;
  }

  getDeepLink(_messageId: string): string {
    return "https://discord.com/channels/@me";
  }

  async testConnection(): Promise<boolean> {
    // Check if discord.com tab is open
    const tabs = await chrome.tabs.query({ url: "https://discord.com/*" });
    return tabs.length > 0;
  }
}
