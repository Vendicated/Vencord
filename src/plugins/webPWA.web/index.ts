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
  start() {
    enableStyle(style);
    const manifest = {
      name: "Discord",
      short_name: "Discord",
      start_url: 'https:' + window.GLOBAL_ENV.WEBAPP_ENDPOINT + "/app", // URL when PWA launches
      display: "fullscreen",
      display_override: ["window-controls-overlay"],
      lang: "en-US",
      background_color: "#2a2a2f",
      theme_color: "#2a2a2f",
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

    NotificationSettingsStore.addChangeListener(this.setBadge);
    GuildReadStateStore.addChangeListener(this.setBadge);
    RelationshipStore.addChangeListener(this.setBadge);
  },
  stop() {
    disableStyle(style);
    this.linkEl?.remove();
    navigator.setAppBadge(0);
    NotificationSettingsStore.removeChangeListener(this.setBadge);
    GuildReadStateStore.removeChangeListener(this.setBadge);
    RelationshipStore.removeChangeListener(this.setBadge);
  },
  patches: [
    {
      find: "platform-web",
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
    }
  ],

  getPlatformClass() {
    if (isMac) return "platform-osx";
    return "platform-win";
  }
});
