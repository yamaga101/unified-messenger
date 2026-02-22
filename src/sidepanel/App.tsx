import { useState, useEffect, useCallback } from "react";
import type { ServiceStatus, UnifiedMessage, ServiceType } from "@/services/types";
import { ServiceCard } from "./components/ServiceCard";
import { StatusBar } from "./components/StatusBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { ALL_SERVICES } from "@/lib/constants";

export default function App(): React.JSX.Element {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [expandedService, setExpandedService] = useState<ServiceType | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_ALL_DATA" });
      if (response?.statuses) setStatuses(response.statuses);
      if (response?.messages) setMessages(response.messages);
    } catch {
      // Extension context may not be ready yet
    }
  }, []);

  useEffect(() => {
    loadData();

    // Poll for updates every 5 seconds
    const interval = setInterval(loadData, 5000);

    // Also listen for storage changes
    const handleChange = () => loadData();
    chrome.storage.onChanged.addListener(handleChange);

    return () => {
      clearInterval(interval);
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, [loadData]);

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await chrome.runtime.sendMessage({ type: "REQUEST_REFRESH" });
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshService = async (serviceType: ServiceType): Promise<void> => {
    await chrome.runtime.sendMessage({
      type: "REQUEST_REFRESH",
      service: serviceType,
    });
    await loadData();
  };

  const handleToggleExpand = (serviceType: ServiceType): void => {
    setExpandedService((prev) => (prev === serviceType ? null : serviceType));
  };

  const totalUnread = statuses
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.unreadCount, 0);

  const enabledStatuses = statuses.filter((s) => s.enabled);
  const sortedStatuses = [...enabledStatuses].sort((a, b) => {
    // Services with unread messages first
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
    // Then by service order
    return ALL_SERVICES.indexOf(a.type) - ALL_SERVICES.indexOf(b.type);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Unified Messenger</h1>
            {totalUnread > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px]">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              title="Refresh all"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-1.5 hover:bg-gray-100 rounded-md transition-colors ${showSettings ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              title="Quick Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Quick Settings Panel */}
      {showSettings && <SettingsPanel />}

      {/* Status Bar */}
      <StatusBar statuses={enabledStatuses} />

      {/* Service Cards */}
      <main className="p-2 space-y-1">
        {sortedStatuses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No services enabled.</p>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Open Settings
            </button>
          </div>
        ) : (
          sortedStatuses.map((status) => (
            <ServiceCard
              key={status.type}
              status={status}
              messages={messages.filter((m) => m.serviceType === status.type)}
              expanded={expandedService === status.type}
              onToggleExpand={() => handleToggleExpand(status.type)}
              onRefresh={() => handleRefreshService(status.type)}
            />
          ))
        )}
      </main>
    </div>
  );
}
