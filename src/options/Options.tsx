import { useState, useEffect } from "react";
import type { ServiceConfig, ServiceType } from "@/services/types";
import { SERVICE_CONFIG, ALL_SERVICES } from "@/lib/constants";
import { getServiceConfigs, saveServiceConfigs } from "@/lib/storage";

type ConfigField = "apiToken" | "baseUrl" | "username" | "password";

interface ServiceFieldDef {
  key: ConfigField;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
}

const SERVICE_FIELDS: Partial<Record<ServiceType, ServiceFieldDef[]>> = {
  chatwork: [
    {
      key: "apiToken",
      label: "API Token",
      type: "password",
      placeholder: "Chatwork API Token",
    },
  ],
  garoon: [
    {
      key: "baseUrl",
      label: "Garoon URL",
      type: "url",
      placeholder: "https://garoon.example.com",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      placeholder: "username",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      placeholder: "password",
    },
  ],
  teams: [
    {
      key: "baseUrl",
      label: "Azure AD Client ID",
      type: "text",
      placeholder: "Azure Application (client) ID",
    },
  ],
  slack: [
    {
      key: "apiToken",
      label: "Bot/User Token",
      type: "password",
      placeholder: "xoxb-... or xoxp-...",
    },
  ],
};

export default function Options(): React.JSX.Element {
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getServiceConfigs().then((loaded) => {
      if (loaded.length === 0) {
        const defaults: ServiceConfig[] = ALL_SERVICES.map((type) => ({
          type,
          enabled: false,
          pollingIntervalSec: SERVICE_CONFIG[type].pollingIntervalSec,
        }));
        setConfigs(defaults);
      } else {
        setConfigs(loaded);
      }
    });
  }, []);

  const getConfig = (type: ServiceType): ServiceConfig => {
    return (
      configs.find((c) => c.type === type) ?? {
        type,
        enabled: false,
        pollingIntervalSec: SERVICE_CONFIG[type].pollingIntervalSec,
      }
    );
  };

  const updateConfig = (
    type: ServiceType,
    updates: Partial<ServiceConfig>,
  ): void => {
    setConfigs((prev) =>
      prev.map((c) => (c.type === type ? { ...c, ...updates } : c)),
    );
    setSaved(false);
  };

  const handleSave = async (): Promise<void> => {
    await saveServiceConfigs(configs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async (type: ServiceType): Promise<void> => {
    try {
      await chrome.runtime.sendMessage({
        type: "REQUEST_REFRESH",
        service: type,
      });
      alert(`${SERVICE_CONFIG[type].label}: Connection test triggered. Check side panel for results.`);
    } catch {
      alert("Failed to test connection.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Unified Messenger Settings
      </h1>

      <div className="space-y-6">
        {ALL_SERVICES.map((type) => {
          const config = getConfig(type);
          const serviceInfo = SERVICE_CONFIG[type];
          const fields = SERVICE_FIELDS[type];

          return (
            <div
              key={type}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              {/* Header with toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${serviceInfo.color}15` }}
                  >
                    {serviceInfo.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {serviceInfo.label}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {getAuthDescription(type)}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.enabled}
                    onChange={() =>
                      updateConfig(type, { enabled: !config.enabled })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Config fields */}
              {config.enabled && fields && (
                <div className="space-y-3 mt-4 pt-3 border-t border-gray-100">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={(config[field.key] as string) ?? ""}
                        onChange={(e) =>
                          updateConfig(type, { [field.key]: e.target.value })
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => handleTestConnection(type)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Test Connection
                  </button>
                </div>
              )}

              {/* Content script info */}
              {config.enabled && (type === "discord" || type === "line") && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {type === "discord"
                      ? "discord.com を開いている時に自動的にデータを取得します。"
                      : "chat.line.me を開いている時に自動的にデータを取得します。"}
                  </p>
                </div>
              )}

              {/* OAuth info */}
              {config.enabled &&
                (type === "gmail" || type === "google-chat") && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Google OAuth で自動認証されます。初回は認証ダイアログが表示されます。
                    </p>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 bg-gray-50 py-4 mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>
        {saved && (
          <span className="text-sm text-green-600">Saved!</span>
        )}
      </div>
    </div>
  );
}

function getAuthDescription(type: ServiceType): string {
  switch (type) {
    case "gmail":
    case "google-chat":
      return "Google OAuth (auto)";
    case "chatwork":
      return "API Token required";
    case "garoon":
      return "Basic Auth (on-prem)";
    case "teams":
      return "Azure AD OAuth";
    case "slack":
      return "Bot/User Token required";
    case "discord":
      return "Content Script (discord.com)";
    case "line":
      return "Content Script (chat.line.me)";
  }
}
