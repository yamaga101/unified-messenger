import type { ServiceStatus } from "@/services/types";
import { SERVICE_CONFIG } from "@/lib/constants";

interface StatusBarProps {
  statuses: ServiceStatus[];
}

export function StatusBar({ statuses }: StatusBarProps): React.JSX.Element {
  if (statuses.length === 0) return <></>;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-gray-100 overflow-x-auto">
      {statuses.map((status) => {
        const config = SERVICE_CONFIG[status.type];
        return (
          <div
            key={status.type}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs flex-shrink-0"
            title={`${config.label}: ${status.connected ? "Connected" : "Disconnected"}${status.error ? ` - ${status.error}` : ""}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.connected ? "bg-green-400" : status.error ? "bg-red-400" : "bg-gray-300"
              }`}
            />
            <span className="text-[10px] text-gray-500">{config.icon}</span>
          </div>
        );
      })}
    </div>
  );
}
