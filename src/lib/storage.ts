import { STORAGE_KEYS } from "./constants";
import type {
  ServiceConfig,
  ServiceStatus,
  UnifiedMessage,
} from "@/services/types";

export async function getServiceConfigs(): Promise<ServiceConfig[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SERVICE_CONFIGS);
  return (result[STORAGE_KEYS.SERVICE_CONFIGS] as ServiceConfig[] | undefined) ?? [];
}

export async function saveServiceConfigs(
  configs: ServiceConfig[],
): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SERVICE_CONFIGS]: configs,
  });
}

export async function getMessages(): Promise<UnifiedMessage[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.MESSAGES);
  return (result[STORAGE_KEYS.MESSAGES] as UnifiedMessage[] | undefined) ?? [];
}

export async function saveMessages(messages: UnifiedMessage[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.MESSAGES]: messages,
  });
}

export async function getStatuses(): Promise<ServiceStatus[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATUSES);
  return (result[STORAGE_KEYS.STATUSES] as ServiceStatus[] | undefined) ?? [];
}

export async function saveStatuses(statuses: ServiceStatus[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.STATUSES]: statuses,
  });
}
