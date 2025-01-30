/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { RelationshipStore } from "@webpack/common";
import type { FluxStore } from "@webpack/types";

import style from "./styles.css?managed";

const isMac = navigator.platform.startsWith("Mac");

const GuildReadStateStore: FluxStore & { getTotalMentionCount: () => number; hasAnyUnread: () => boolean; } = findStoreLazy("GuildReadStateStore");
const NotificationSettingsStore: FluxStore & { getDisableUnreadBadge: () => boolean; } = findStoreLazy("NotificationSettingsStore");

let _keybinds: Record<string, { onTrigger: () => any; }>;

export default definePlugin({
  name: "WebPWA",
  description: "Allows Discord to be installable and usable as a PWA.",
  authors: [Devs.ThaUnknown],
  flux: {
    KEYBINDS_REGISTER_GLOBAL_KEYBIND_ACTIONS: ({ keybinds }: { keybinds: Record<string, { onTrigger: () => any; }>; }) => {
      _keybinds = keybinds;
    }
  },
  start() {
    if (!IS_EXTENSION) return;

    // css
    enableStyle(style);
    // installability
    const manifest = {
      name: "Discord",
      short_name: "Discord",
      start_url: "https:" + window.GLOBAL_ENV.WEBAPP_ENDPOINT + "/app", // URL when PWA launches
      display: "fullscreen",
      display_override: ["window-controls-overlay"],
      lang: "en-US",
      background_color: "#2b2d31", // var(--background-secondary)
      theme_color: "#1e1f22", // var(--background-tertiary)
      scope: "/", // scope of all possible URL"s
      description: "Imagine a place...",
      orientation: "landscape",
      icons: [
        {
          src: document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href,
          sizes: "256x256",
          type: "image/png"
        }
      ]
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/json" }));
    this.linkEl = document.createElement("link");
    this.linkEl.rel = "manifest";
    this.linkEl.href = url;
    document.head.appendChild(this.linkEl);

    // notifications
    NotificationSettingsStore.addChangeListener(this.setBadge);
    GuildReadStateStore.addChangeListener(this.setBadge);
    RelationshipStore.addChangeListener(this.setBadge);

    // title bar
    if ("windowControlsOverlay" in navigator) { // firefox!
      const { height } = navigator.windowControlsOverlay!.getTitlebarAreaRect();
      document.body.style.setProperty("--vencord-titlebar-size", height + "px");
      navigator.windowControlsOverlay!.addEventListener(
        "geometrychange",
        this.handleGeometryChange
      );
    }

    // keybinds
    window.addEventListener("message", this.keybindListener);
  },
  stop() {
    if (!IS_EXTENSION) return;

    if ("windowControlsOverlay" in navigator) {
      navigator.windowControlsOverlay!.removeEventListener(
        "geometrychange",
        this.handleGeometryChange
      );
      navigator.setAppBadge(0);
    }
    window.removeEventListenerEventListener("message", this.keybindListener);
    disableStyle(style);
    this.linkEl?.remove();
    NotificationSettingsStore.removeChangeListener(this.setBadge);
    GuildReadStateStore.removeChangeListener(this.setBadge);
    RelationshipStore.removeChangeListener(this.setBadge);
  },
  patches: [
    {
      find: "platform-web", // patches title bar color and button position [unused]
      replacement: {
        match: /(?<=" platform-overlay"\):)\i/,
        replace: "$self.getPlatformClass()"
      }
    },
    {
      find: "\"NotificationSettingsStore",
      replacement: {
        match: /\.isPlatformEmbedded(?=\?\i\.\i\.ALL)/g,
        replace: "$&||true"
      }
    },
    {
      find: ".wordmarkWindows",
      replacement: [
        {
          match: /case \i\.\i\.WINDOWS:/,
          replace: 'case "WEB":'
        },
        // these 3 buttons should never actually be clickable, since we expect the user to install the PWA
        // these methods don't work outside of PWA's so is there a point?
        ...["close", "minimize", "maximize"].map(op => ({
          match: new RegExp(String.raw`\i\.\i\.${op}\b`),
          replace: ""
        }))
      ]
    },
    {
      find: ".browserNotice",
      replacement: {
        match: /className:(\i)\.browserNotice,children:[^}]+}\)/,
        replace: "className:$1.browserNotice,children:$self.customNotice()"
      }
    }
  ],
  customNotice() {
    return (
      <div>
        Custom global keybinds are supported. Navigate to <a onClick={() => { window.postMessage({ type: "OPEN_SHORTCUTS" }, "*"); }}>about://extensions/shortcuts</a> to change them.
      </div>
    );
  },
  keybindListener: (e: MessageEvent) => {
    if (e.data?.type === "vencord:keybinds") {
      const { meta } = e.data;
      if (meta in _keybinds!) _keybinds![meta].onTrigger();
    }
  },
  setBadge: () => {
    try {
      const mentionCount = GuildReadStateStore.getTotalMentionCount();
      const pendingRequests = RelationshipStore.getPendingCount();
      const hasUnread = GuildReadStateStore.hasAnyUnread();
      const disableUnreadBadge = NotificationSettingsStore.getDisableUnreadBadge();

      let totalCount = mentionCount + pendingRequests;
      if (!totalCount && hasUnread && !disableUnreadBadge) totalCount = -1;

      navigator.setAppBadge(totalCount);
    } catch (e) {
      console.error(e);
    }
  },
  handleGeometryChange(event: WindowControlsOverlayGeometryChangeEvent) {
    // we want the title bar to be of consistent size, no matter the zoom level, device pixel ratio or OS
    if (event.visible) {
      document.body.style.setProperty("--vencord-titlebar-size", event.titlebarAreaRect.height + "px");
    } else {
      document.body.style.setProperty("--vencord-titlebar-size", "0px");
    }
  },
  getPlatformClass() {
    if (isMac) return "platform-osx";
    return "platform-win";
  }
});
