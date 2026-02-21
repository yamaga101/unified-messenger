import type {
  ServiceConfig,
  ServiceStatus,
  ServiceType,
  UnifiedMessage,
} from "./types";

export abstract class BaseService {
  protected config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  get type(): ServiceType {
    return this.config.type;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  updateConfig(config: ServiceConfig): void {
    this.config = config;
  }

  abstract fetchMessages(): Promise<UnifiedMessage[]>;

  abstract getUnreadCount(): Promise<number>;

  abstract getDeepLink(messageId: string): string;

  abstract testConnection(): Promise<boolean>;

  createStatus(
    overrides: Partial<ServiceStatus> = {},
  ): ServiceStatus {
    return {
      type: this.type,
      enabled: this.enabled,
      connected: false,
      unreadCount: 0,
      lastFetched: 0,
      ...overrides,
    };
  }
}
