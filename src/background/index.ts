import { PollingManager } from "./polling-manager";
import {
  showNotification,
  updateBadge,
  setupNotificationClickHandler,
} from "./notifications";
import { ALL_SERVICES, SERVICE_CONFIG, MAX_MESSAGES_PER_SERVICE } from "@/lib/constants";
import {
  getServiceConfigs,
  saveServiceConfigs,
  getMessages,
  saveMessages,
  getStatuses,
  saveStatuses,
} from "@/lib/storage";
import { withRetry } from "@/lib/retry";
import type {
  MessageAction,
  ServiceConfig,
  ServiceStatus,
  ServiceType,
  UnifiedMessage,
} from "@/services/types";

// Service imports
import { GmailService } from "@/services/gmail";
import { ChatworkService } from "@/services/chatwork";
import { GaroonService } from "@/services/garoon";
import { GoogleChatService } from "@/services/google-chat";
import { TeamsService } from "@/services/teams";
import { SlackService } from "@/services/slack";
import { DiscordService } from "@/services/discord";
import { LineService } from "@/services/line";
import type { BaseService } from "@/services/base";

// --- Service registry ---

const services = new Map<ServiceType, BaseService>();

function createService(config: ServiceConfig): BaseService {
  switch (config.type) {
    case "gmail":
      return new GmailService(config);
    case "chatwork":
      return new ChatworkService(config);
    case "garoon":
      return new GaroonService(config);
    case "google-chat":
      return new GoogleChatService(config);
    case "teams":
      return new TeamsService(config);
    case "slack":
      return new SlackService(config);
    case "discord":
      return new DiscordService(config);
    case "line":
      return new LineService(config);
  }
}

async function initializeServices(): Promise<void> {
  let configs = await getServiceConfigs();

  // Create default configs for services that don't have one yet
  if (configs.length === 0) {
    configs = ALL_SERVICES.map((type) => ({
      type,
      enabled: type === "gmail" || type === "chatwork",
      notificationsEnabled: true,
      pollingIntervalSec: SERVICE_CONFIG[type].pollingIntervalSec,
    }));
    await saveServiceConfigs(configs);
  }

  // Initialize statuses
  const statuses: ServiceStatus[] = configs.map((c) => ({
    type: c.type,
    enabled: c.enabled,
    connected: false,
    unreadCount: 0,
    lastFetched: 0,
  }));
  await saveStatuses(statuses);

  // Create service instances
  for (const config of configs) {
    services.set(config.type, createService(config));
  }
}

// --- Polling ---

async function pollService(serviceType: ServiceType): Promise<void> {
  const service = services.get(serviceType);
  if (!service || !service.enabled) return;

  const statuses = await getStatuses();
  const statusIdx = statuses.findIndex((s) => s.type === serviceType);

  try {
    const messages = await withRetry(() => service.fetchMessages());
    const unreadCount = messages.filter((m) => m.isUnread).length;

    // Update storage
    const allMessages = await getMessages();
    const otherMessages = allMessages.filter(
      (m) => m.serviceType !== serviceType,
    );
    const updatedMessages = [
      ...otherMessages,
      ...messages.slice(0, MAX_MESSAGES_PER_SERVICE),
    ].sort((a, b) => b.timestamp - a.timestamp);
    await saveMessages(updatedMessages);

    // Check for new messages to notify
    const configs = await getServiceConfigs();
    const serviceConfig = configs.find((c) => c.type === serviceType);
    if (serviceConfig?.notificationsEnabled !== false) {
      const oldIds = new Set(
        allMessages
          .filter((m) => m.serviceType === serviceType)
          .map((m) => m.id),
      );
      const newMessages = messages.filter(
        (m) => m.isUnread && !oldIds.has(m.id),
      );
      for (const msg of newMessages.slice(0, 3)) {
        showNotification(msg);
      }
    }

    // Update status
    if (statusIdx >= 0) {
      statuses[statusIdx] = {
        ...statuses[statusIdx],
        connected: true,
        unreadCount,
        lastFetched: Date.now(),
        error: undefined,
      };
    }
  } catch (err) {
    if (statusIdx >= 0) {
      statuses[statusIdx] = {
        ...statuses[statusIdx],
        connected: false,
        error: err instanceof Error ? err.message : "Unknown error",
        lastFetched: Date.now(),
      };
    }
  }

  await saveStatuses(statuses);

  // Update total badge
  const allStatuses = await getStatuses();
  const totalUnread = allStatuses
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.unreadCount, 0);
  updateBadge(totalUnread);
}

// --- Message handling ---

chrome.runtime.onMessage.addListener(
  (message: MessageAction, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch(console.error);
    return true; // Async response
  },
);

async function handleMessage(
  message: MessageAction,
): Promise<unknown> {
  switch (message.type) {
    case "BADGE_UPDATE": {
      // From content scripts (Discord/LINE)
      const service = services.get(message.service);
      if (service && "updateFromContentScript" in service) {
        (service as DiscordService | LineService).updateFromContentScript(
          message.count,
        );
      }

      // Update status
      const statuses = await getStatuses();
      const idx = statuses.findIndex((s) => s.type === message.service);
      if (idx >= 0) {
        statuses[idx] = {
          ...statuses[idx],
          connected: true,
          unreadCount: message.count,
          lastFetched: Date.now(),
        };
        await saveStatuses(statuses);
      }

      // Update total badge
      const totalUnread = statuses
        .filter((s) => s.enabled)
        .reduce((sum, s) => sum + s.unreadCount, 0);
      updateBadge(totalUnread);

      return { ok: true };
    }

    case "REQUEST_REFRESH": {
      if (message.service) {
        await pollService(message.service);
      } else {
        const configs = await getServiceConfigs();
        await Promise.allSettled(
          configs.filter((c) => c.enabled).map((c) => pollService(c.type)),
        );
      }
      return { ok: true };
    }

    case "GET_ALL_DATA": {
      const [statuses, messages] = await Promise.all([
        getStatuses(),
        getMessages(),
      ]);
      return { type: "ALL_DATA_RESPONSE", statuses, messages };
    }

    default:
      return { ok: false, error: "Unknown message type" };
  }
}

// --- Side panel ---

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// --- Init ---

const pollingManager = new PollingManager(pollService);

chrome.runtime.onInstalled.addListener(async () => {
  await initializeServices();
  await pollingManager.start();
  setupNotificationClickHandler();

  // Set side panel behavior
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeServices();
  await pollingManager.start();
  setupNotificationClickHandler();
});

// Listen for config changes from options page
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.serviceConfigs) {
    const newConfigs = changes.serviceConfigs.newValue as ServiceConfig[];
    for (const config of newConfigs) {
      const existing = services.get(config.type);
      if (existing) {
        existing.updateConfig(config);
      } else {
        services.set(config.type, createService(config));
      }
    }
    await pollingManager.start(); // Restart with new config
  }
});
