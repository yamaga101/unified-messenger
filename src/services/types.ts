export type ServiceType =
  | "gmail"
  | "google-chat"
  | "chatwork"
  | "garoon"
  | "teams"
  | "slack"
  | "discord"
  | "line";

export interface UnifiedMessage {
  id: string;
  serviceType: ServiceType;
  sender: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
  isUnread: boolean;
  deepLink: string;
  channelName?: string;
}

export interface ServiceStatus {
  type: ServiceType;
  enabled: boolean;
  connected: boolean;
  unreadCount: number;
  lastFetched: number;
  error?: string;
}

export interface ServiceConfig {
  type: ServiceType;
  enabled: boolean;
  pollingIntervalSec: number;
  // Service-specific config
  apiToken?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
}

export type MessageAction =
  | { type: "MESSAGES_UPDATE"; service: ServiceType; messages: UnifiedMessage[] }
  | { type: "STATUS_UPDATE"; service: ServiceType; status: Partial<ServiceStatus> }
  | { type: "BADGE_UPDATE"; service: ServiceType; count: number }
  | { type: "REQUEST_REFRESH"; service?: ServiceType }
  | { type: "GET_ALL_DATA" }
  | {
      type: "ALL_DATA_RESPONSE";
      statuses: ServiceStatus[];
      messages: UnifiedMessage[];
    };
