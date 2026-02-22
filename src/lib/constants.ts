import type { ServiceType } from "@/services/types";

export const SERVICE_CONFIG = {
  gmail: {
    label: "Gmail",
    color: "#EA4335",
    pollingIntervalSec: 30,
    icon: "📧",
  },
  "google-chat": {
    label: "Google Chat",
    color: "#00AC47",
    pollingIntervalSec: 60,
    icon: "💬",
  },
  chatwork: {
    label: "Chatwork",
    color: "#E5302E",
    pollingIntervalSec: 60,
    icon: "🔴",
  },
  garoon: {
    label: "Garoon",
    color: "#1E88E5",
    pollingIntervalSec: 300,
    icon: "🏢",
  },
  teams: {
    label: "Teams",
    color: "#6264A7",
    pollingIntervalSec: 60,
    icon: "👥",
  },
  slack: {
    label: "Slack",
    color: "#4A154B",
    pollingIntervalSec: 120,
    icon: "💜",
  },
  discord: {
    label: "Discord",
    color: "#5865F2",
    pollingIntervalSec: 0, // Real-time via content script
    icon: "🎮",
  },
  line: {
    label: "LINE",
    color: "#06C755",
    pollingIntervalSec: 0, // Real-time via content script
    icon: "🟢",
  },
} as const satisfies Record<ServiceType, {
  label: string;
  color: string;
  pollingIntervalSec: number;
  icon: string;
}>;

export const ALL_SERVICES: ServiceType[] = [
  "gmail",
  "google-chat",
  "chatwork",
  "garoon",
  "teams",
  "slack",
  "discord",
  "line",
];

export const STORAGE_KEYS = {
  SERVICE_CONFIGS: "serviceConfigs",
  MESSAGES: "messages",
  STATUSES: "statuses",
} as const;

export const MAX_MESSAGES_PER_SERVICE = 20;
