import { BaseService } from "./base";
import type { ServiceConfig, UnifiedMessage } from "./types";

/**
 * LINE service: relies on content script for data.
 * Messages come via chrome.runtime.sendMessage from content-scripts/line.ts.
 */
export class LineService extends BaseService {
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
    return "https://chat.line.me/";
  }

  async testConnection(): Promise<boolean> {
    const tabs = await chrome.tabs.query({ url: "https://chat.line.me/*" });
    return tabs.length > 0;
  }
}
