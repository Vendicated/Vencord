/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

// Define plugin settings
const settings = definePluginSettings({
    hideNameplateBackground: {
        type: OptionType.BOOLEAN,
        description: "Hide Discord Nitro nameplate background gradient",
        default: true,
        restartNeeded: true
    },
    hideNameplateVideo: {
        type: OptionType.BOOLEAN,
        description: "Hide Discord Nitro nameplate video",
        default: true,
        restartNeeded: true
    },
    hideImgAvatarDecor: {
        type: OptionType.BOOLEAN,
        description: "Hide avatar decorations (img)",
        default: true,
        restartNeeded: true
    },
    hideSvgAvatarDecor: {
        type: OptionType.BOOLEAN,
        description: "Hide avatar decorations (svg)",
        default: true,
        restartNeeded: true
    },
    hideProfileEffects: {
        type: OptionType.BOOLEAN,
        description: "Hide profile effects",
        default: true,
        restartNeeded: true
    },
    hideBoosterIcon: {
        type: OptionType.BOOLEAN,
        description: "Hide boosters icon svg",
        default: false,
        restartNeeded: true
    },
    hideServerTag: {
        type: OptionType.BOOLEAN,
        description: "Hide server tag chiplets (clan tags)",
        default: false,
        restartNeeded: true
    },
    hideRoleIcons: {
        type: OptionType.BOOLEAN,
        description: "Hide role icons in chat/members list",
        default: false,
        restartNeeded: true
    },
    hideSuperReactions: {
        type: OptionType.BOOLEAN,
        description: "Hide Discord's Super Reactions",
        default: false,
        restartNeeded: true
    },
    hideBurstEffect: {
        type: OptionType.BOOLEAN,
        description: "Hide Discord's Super Reactions Burst Effect",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "CleanCord",
    description: "Hide Discord's visual clutter like nameplates, decorations, tags, role icons, and super reactions. Fully configurable in settings!",
    authors: [Devs.Minato],
    settings,

    start() {
        const selectors: string[] = [];

        // Nameplate background
        if (settings.store.hideNameplateBackground)
            selectors.push('div[class^="container__"][style*="background: linear-gradient"]');

        // Nameplate video
        if (settings.store.hideNameplateVideo)
            selectors.push('div[class^="container__"] video[class^="img__"]');

        // Other decorations
        if (settings.store.hideImgAvatarDecor)
            selectors.push('img[class^="avatarDecoration_"]');
        if (settings.store.hideSvgAvatarDecor)
            selectors.push('svg[class^="avatarDecoration__"]');
        if (settings.store.hideProfileEffects)
            selectors.push('div[class^="profileEffects__"]');
        if (settings.store.hideBoosterIcon)
            selectors.push('svg[class^="premiumIcon__"]');

        // Server Tag chiplets
        if (settings.store.hideServerTag)
            selectors.push('span[class^="chipletContainerInner__"][aria-label^="Server Tag:"]');

        // Role icons
        if (settings.store.hideRoleIcons)
            selectors.push('img[class^="roleIcon__"][aria-label^="Role icon"]');

        // Super Reactions
        if (settings.store.hideSuperReactions) {
            selectors.push('div[class^="reactionInner__"][aria-label*="super reactions"]');
            selectors.push('div[class^="reactionInner__"][aria-label*="super reactions"] .burstGlow__');
        }

        // Super Reactions burst effect
        if (settings.store.hideBurstEffect) {
            selectors.push('div[class^="effectsWrapper_"]');
        }

        if (selectors.length === 0) return;

        this.style = document.createElement("style");
        this.style.textContent = `${selectors.join(", ")} { display: none !important; }`;
        document.head.appendChild(this.style);
    },

    stop() {
        if (this.style) this.style.remove();
    }
});
