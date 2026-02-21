import type { UnifiedMessage, ServiceType } from "@/services/types";
import { SERVICE_CONFIG } from "@/lib/constants";

const SHOWN_NOTIFICATION_IDS = new Set<string>();

export function showNotification(message: UnifiedMessage): void {
  if (SHOWN_NOTIFICATION_IDS.has(message.id)) return;
  SHOWN_NOTIFICATION_IDS.add(message.id);

  // Keep the set from growing unbounded
  if (SHOWN_NOTIFICATION_IDS.size > 500) {
    const entries = Array.from(SHOWN_NOTIFICATION_IDS);
    for (let i = 0; i < 250; i++) {
      SHOWN_NOTIFICATION_IDS.delete(entries[i]);
    }
  }

  const serviceLabel = SERVICE_CONFIG[message.serviceType].label;
  const title = message.channelName
    ? `${serviceLabel} - ${message.channelName}`
    : serviceLabel;

  chrome.notifications.create(message.id, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("public/icons/icon128.png"),
    title,
    message: `${message.sender}: ${message.content.slice(0, 100)}`,
    priority: 1,
  });
}

export function updateBadge(totalUnread: number): void {
  const text = totalUnread > 0 ? String(totalUnread) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
}

export function setupNotificationClickHandler(): void {
  chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.notifications.clear(notificationId);
    // Open the deep link — stored messages will be checked by service worker
  });
}
