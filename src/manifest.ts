import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Unified Messenger",
  version: "0.1.5",
  description:
    "8つのメッセージングサービスを1つのサイドパネルに統合するダッシュボード",
  permissions: [
    "storage",
    "identity",
    "alarms",
    "notifications",
    "sidePanel",
    "activeTab",
  ],
  host_permissions: [
    "https://gmail.googleapis.com/*",
    "https://chat.googleapis.com/*",
    "https://www.googleapis.com/*",
    "https://api.chatwork.com/*",
    "https://graph.microsoft.com/*",
    "https://slack.com/api/*",
    "https://*.cybozu.com/*",
  ],
  optional_host_permissions: ["https://*/*"],
  oauth2: {
    client_id: "550331176292-kjl3kcttsjbrs476p4fluosfk92qe4ue.apps.googleusercontent.com",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/chat.messages.readonly",
      "https://www.googleapis.com/auth/chat.spaces.readonly",
    ],
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  action: {
    default_icon: {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png",
    },
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  options_page: "src/options/index.html",
  icons: {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png",
  },
  content_scripts: [
    {
      matches: [
        "https://discord.com/*",
        "https://ptb.discord.com/*",
        "https://canary.discord.com/*",
      ],
      js: ["src/content-scripts/discord.ts"],
    },
    {
      matches: ["https://chat.line.me/*"],
      js: ["src/content-scripts/line.ts"],
    },
  ],
  commands: {
    "toggle-sidepanel": {
      suggested_key: { default: "Alt+M", mac: "MacCtrl+M" },
      description: "サイドパネルを開く",
    },
  },
});
