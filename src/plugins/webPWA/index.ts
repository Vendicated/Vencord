/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { filters, waitFor } from "@webpack";
import { RelationshipStore } from "@webpack/common";
import type { FluxStore } from "@webpack/types";

const MANIFEST = {
  name: "Discord",
  short_name: "Discord",
  start_url: "https://discord.com/channels/@me", // URL when PWA launches
  display: "fullscreen",
  display_override: ["window-controls-overlay"],
  lang: "en-US",
  background_color: "#2a2a2f",
  theme_color: "#2a2a2f",
  scope: "https://discord.com", // scope of all possible URL"s
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

const isMac = navigator.platform.startsWith("Mac");

let GuildReadStateStore: FluxStore & { getTotalMentionCount: () => number; hasAnyUnread: () => boolean; };
let NotificationSettingsStore: FluxStore & { getDisableUnreadBadge: () => boolean; };

export default definePlugin({
  name: "WebPWA",
  description: "Allows Discord to be installable and usable as a PWA.",
  authors: [Devs.ThaUnknown],
  manifest: null,
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
    const url = URL.createObjectURL(new Blob([JSON.stringify(MANIFEST)], { type: "application/json" }));
    this.linkEl = document.createElement("link");
    this.linkEl.rel = "manifest";
    this.linkEl.href = url;

    let toFind = 3;

    const waitForAndSubscribeToStore = (name: string, cb?: (m: any) => void) => {
      waitFor(filters.byStoreName(name), (store: FluxStore) => {
        if (!this.started) return;
        cb?.(store);
        store.addChangeListener(this.setBadge);

        toFind--;
        if (toFind === 0) this.setBadge();
      });
    };
    waitForAndSubscribeToStore("GuildReadStateStore", store => (GuildReadStateStore = store));
    waitForAndSubscribeToStore("NotificationSettingsStore", store => (NotificationSettingsStore = store));
    waitForAndSubscribeToStore("RelationshipStore");
  },
  stop() {
    this.linkEl?.remove();
    navigator.setAppBadge(0);
    NotificationSettingsStore?.removeChangeListener(this.setBadge);
    GuildReadStateStore?.removeChangeListener(this.setBadge);
    RelationshipStore?.removeChangeListener(this.setBadge);
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
