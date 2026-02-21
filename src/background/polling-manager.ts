import type { ServiceType } from "@/services/types";
import { SERVICE_CONFIG, ALL_SERVICES } from "@/lib/constants";
import { getServiceConfigs } from "@/lib/storage";

type PollCallback = (serviceType: ServiceType) => Promise<void>;

const ALARM_PREFIX = "poll-";

export class PollingManager {
  private callback: PollCallback;

  constructor(callback: PollCallback) {
    this.callback = callback;
  }

  async start(): Promise<void> {
    // Clear existing alarms
    await chrome.alarms.clearAll();

    const configs = await getServiceConfigs();
    const enabledTypes = new Set(
      configs.filter((c) => c.enabled).map((c) => c.type),
    );

    for (const serviceType of ALL_SERVICES) {
      const intervalSec = SERVICE_CONFIG[serviceType].pollingIntervalSec;
      if (intervalSec <= 0) continue; // Content script-based services
      if (!enabledTypes.has(serviceType)) continue;

      const alarmName = `${ALARM_PREFIX}${serviceType}`;
      await chrome.alarms.create(alarmName, {
        delayInMinutes: 0.1, // Start soon
        periodInMinutes: intervalSec / 60,
      });
    }

    // Listen for alarms
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (!alarm.name.startsWith(ALARM_PREFIX)) return;
      const serviceType = alarm.name.slice(ALARM_PREFIX.length) as ServiceType;
      this.callback(serviceType).catch(console.error);
    });
  }

  async stopService(serviceType: ServiceType): Promise<void> {
    await chrome.alarms.clear(`${ALARM_PREFIX}${serviceType}`);
  }

  async restartService(serviceType: ServiceType): Promise<void> {
    await this.stopService(serviceType);
    const intervalSec = SERVICE_CONFIG[serviceType].pollingIntervalSec;
    if (intervalSec <= 0) return;

    await chrome.alarms.create(`${ALARM_PREFIX}${serviceType}`, {
      delayInMinutes: 0.1,
      periodInMinutes: intervalSec / 60,
    });
  }

  async stopAll(): Promise<void> {
    await chrome.alarms.clearAll();
  }
}
