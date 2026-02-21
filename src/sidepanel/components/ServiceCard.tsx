import type { ServiceStatus, UnifiedMessage, ServiceType } from "@/services/types";
import { SERVICE_CONFIG } from "@/lib/constants";
import { MessageItem } from "./MessageItem";

interface ServiceCardProps {
  status: ServiceStatus;
  messages: UnifiedMessage[];
  expanded: boolean;
  onToggleExpand: () => void;
  onRefresh: () => void;
}

export function ServiceCard({
  status,
  messages,
  expanded,
  onToggleExpand,
  onRefresh,
}: ServiceCardProps): React.JSX.Element {
  const config = SERVICE_CONFIG[status.type];

  const timeSinceLastFetch = status.lastFetched
    ? formatTimeAgo(status.lastFetched)
    : "Never";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Service header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        {/* Service icon + color indicator */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <span>{config.icon}</span>
        </div>

        {/* Service name + status */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900">
              {config.label}
            </span>
            <ConnectionDot connected={status.connected} />
          </div>
          <p className="text-xs text-gray-400 truncate">
            {status.error ?? timeSinceLastFetch}
          </p>
        </div>

        {/* Unread badge */}
        {status.unreadCount > 0 && (
          <span
            className="flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white rounded-full min-w-[20px]"
            style={{ backgroundColor: config.color }}
          >
            {status.unreadCount}
          </span>
        )}

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded message list */}
      {expanded && (
        <div className="border-t border-gray-100">
          {messages.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-gray-400">
                {status.connected ? "No unread messages" : "Not connected"}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                className="mt-1 text-xs text-blue-500 hover:underline"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectionDot({ connected }: { connected: boolean }): React.JSX.Element {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        connected ? "bg-green-400" : "bg-gray-300"
      }`}
      title={connected ? "Connected" : "Disconnected"}
    />
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
