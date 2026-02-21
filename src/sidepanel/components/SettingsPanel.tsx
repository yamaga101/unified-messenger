import { useState, useEffect } from "react";
import type { ServiceConfig, ServiceType } from "@/services/types";
import { SERVICE_CONFIG, ALL_SERVICES } from "@/lib/constants";
import { getServiceConfigs, saveServiceConfigs } from "@/lib/storage";

export function SettingsPanel(): React.JSX.Element {
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);

  useEffect(() => {
    getServiceConfigs().then(setConfigs);
  }, []);

  const handleToggle = async (serviceType: ServiceType): Promise<void> => {
    const updated = configs.map((c) =>
      c.type === serviceType ? { ...c, enabled: !c.enabled } : c,
    );
    setConfigs(updated);
    await saveServiceConfigs(updated);
  };

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Quick Settings</h2>
      {ALL_SERVICES.map((type) => {
        const config = configs.find((c) => c.type === type);
        const serviceInfo = SERVICE_CONFIG[type];
        return (
          <div key={type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{serviceInfo.icon}</span>
              <span className="text-sm text-gray-700">{serviceInfo.label}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config?.enabled ?? false}
                onChange={() => handleToggle(type)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        );
      })}
    </div>
  );
}
