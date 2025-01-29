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

export default definePlugin({
  name: "WebPWA",
  description: "Allows Discord to be installable and usable as a PWA.",
  authors: [Devs.ThaUnknown],
  start() {
    // css
    enableStyle(style);
    // installability
    const manifest = {
      name: "Discord",
      short_name: "Discord",
      start_url: 'https:' + window.GLOBAL_ENV.WEBAPP_ENDPOINT + "/app", // URL when PWA launches
      display: "fullscreen",
      display_override: ["window-controls-overlay"],
      lang: "en-US",
      background_color: "#2b2d31",
      theme_color: "#1e1f22",
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
      document.body.style.setProperty('--vencord-titlebar-size', height + 'px');
      navigator.windowControlsOverlay!.addEventListener(
        "geometrychange",
        this.handleGeometryChange
      );
    }
  },
  stop() {
    if ("windowControlsOverlay" in navigator) {
      navigator.windowControlsOverlay!.removeEventListener(
        "geometrychange",
        this.handleGeometryChange
      );
    }
    disableStyle(style);
    this.linkEl?.remove();
    navigator.setAppBadge(0);
    NotificationSettingsStore.removeChangeListener(this.setBadge);
    GuildReadStateStore.removeChangeListener(this.setBadge);
    RelationshipStore.removeChangeListener(this.setBadge);
  },
  patches: [
    {
      find: "platform-web", // patches title bar color and button position [unused]
      replacement: {
        // eslint-disable-next-line no-useless-escape
        match: /(?<=" platform-overlay"\):)\i/,
        replace: "$self.getPlatformClass()"
      }
    },
    {
      find: "\"NotificationSettingsStore",
      replacement: {
        // eslint-disable-next-line no-useless-escape
        match: /\.isPlatformEmbedded(?=\?\i\.\i\.ALL)/g,
        replace: "$&||true"
      }
    },
    {
      find: ".wordmarkWindows",
      replacement: [
        {
          // eslint-disable-next-line no-useless-escape
          match: /case \i\.\i\.WINDOWS:/,
          replace: 'case "WEB":'
        },
        // these 3 buttons should never actually be clickable, since we expect the user to install the PWA
        // these methods don't work outside of PWA's so is there a point?
        ...["close", "minimize", "maximize"].map(op => ({
          match: new RegExp(String.raw`\i\.\i\.${op}\b`),
          replace: ``
        }))
      ]
    }
  ],
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
      document.body.style.setProperty('--vencord-titlebar-size', event.titlebarAreaRect.height + 'px');
    } else {
      document.body.style.setProperty('--vencord-titlebar-size', '0px');
    }
  },
  getPlatformClass() {
    if (isMac) return "platform-osx";
    return "platform-win";
  }
});
