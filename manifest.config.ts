import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "MdSide",
  description: "Markdown notebooks in your browser side panel.",
  version: "0.1.0",
  permissions: ["storage", "sidePanel"],
  action: {
    default_title: "Open Markdown Sidebar"
  },
  background: {
    service_worker: "src/background.ts",
    type: "module"
  },
  side_panel: {
    default_path: "src/sidepanel/index.html"
  },
  commands: {
    "open-side-panel": {
      suggested_key: {
        default: "Ctrl+Shift+Y",
        mac: "Command+Shift+Y"
      },
      description: "Open Markdown side panel"
    }
  }
});
