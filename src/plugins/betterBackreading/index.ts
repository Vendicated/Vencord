/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    imageScrollMargin: {
        type: OptionType.STRING,
        displayName: "Image Preload Distance",
        description: "How far ahead to load images, in pixels (300-5000).",
        default: "1500",
        isValid: value => validateInteger(value, 300, 5000),
        restartNeeded: true
    },
    messageLoadBuffer: {
        type: OptionType.STRING,
        displayName: "Message Load Buffer",
        description: "How far ahead to fetch more messages, in pixels (500-5000).",
        default: "1500",
        isValid: value => validateInteger(value, 500, 5000)
    },
    useDiscordMessageCount: {
        type: OptionType.BOOLEAN,
        displayName: "Use Discord's Dynamic Message Count",
        description: "Let Discord choose how many messages to fetch based on your window and chat settings.",
        default: true
    },
    messageCount: {
        type: OptionType.STRING,
        displayName: "Custom Message Count",
        description: "How many messages to fetch per history request when the dynamic count is disabled (30-100).",
        default: "50",
        isValid: value => validateInteger(value, 30, 100)
    }
}, {
    messageCount: {
        disabled() {
            return this.store.useDiscordMessageCount;
        }
    }
});

function validateInteger(value: unknown, min: number, max: number) {
    const parsedValue = Number(value);
    return Number.isInteger(parsedValue) && parsedValue >= min && parsedValue <= max || `Enter a whole number from ${min} to ${max}.`;
}

function boundedInteger(value: string | number, min: number, max: number, fallback: number) {
    const parsedValue = Number(value);
    return Math.min(max, Math.max(min, Math.round(Number.isFinite(parsedValue) ? parsedValue : fallback)));
}

function getCustomMessageCount() {
    return boundedInteger(settings.store.messageCount, 30, 100, 50);
}

export default definePlugin({
    name: "BetterBackreading",
    description: "Improve backreading with earlier message loading and less rubberbanding.",
    authors: [Devs.Etorix],
    tags: ["Chat", "Utility"],
    settings,

    getImageScrollMargin() {
        return `${boundedInteger(settings.store.imageScrollMargin, 300, 5000, 1500)}px`;
    },

    getLoadMoreBuffer() {
        return boundedInteger(settings.store.messageLoadBuffer, 500, 5000, 1500);
    },

    getMessageCount(nativeCount: number) {
        return settings.store.useDiscordMessageCount ? nativeCount : getCustomMessageCount();
    },

    getWindowThreshold(nativeThreshold: number) {
        return settings.store.useDiscordMessageCount ? nativeThreshold : Math.max(nativeThreshold, 4 * getCustomMessageCount());
    },

    getWindowTarget(nativeTarget: number) {
        return settings.store.useDiscordMessageCount ? nativeTarget : Math.max(nativeTarget, 2 * getCustomMessageCount());
    },

    patches: [
        {
            // Keep the saved anchor offset current while the user scrolls, preventing height correction rubberbanding.
            find: "updateAutomaticAnchor(",
            replacement: {
                match: /(this\.updateAutomaticAnchor\(\i\.scrollTop),!0(?=\):this\.setAutomaticAnchor)/,
                replace: "$1"
            }
        },
        {
            // Reduce image pop-in as embeds approach the visible message area.
            find: "_lazyLoadTargets",
            replacement: {
                match: /(?<=rootMargin:"300px")/,
                replace: ",scrollMargin:$self.getImageScrollMargin()"
            }
        },
        {
            // Request messages earlier as scrolling approaches a loading boundary.
            find: "getOffsetToTriggerLoading(",
            replacement: {
                match: /500(?=;return \i\.hasMoreAfter)|(?<=\i\.hasMoreAfter\?\i-\i-\i-)500/g,
                replace: "$self.getLoadMoreBuffer()"
            }
        },
        {
            // Prevent downward jumps at the top placeholder while older messages load.
            find: "handleScrollSpeed(",
            replacement: {
                match: /(1===\i&&)(?=\i\+\i<=0)/,
                replace: "$1!this.isLoading()&&"
            }
        },
        {
            // Allow fast middle-click scrolling through messages without getting stuck in a placeholder display.
            find: "mergePropsAndUpdate_(",
            group: true,
            replacement: [
                {
                    match: /(mergePropsAndUpdate_\((\i)\)\{let (\i)=this\.props\.messages)/,
                    replace: "$1,betterBackreadingSmoothScrollWindowShifted=$3.length>0&&$2.messages.length>0&&$3.first()?.id!==$2.messages.first()?.id&&$3.last()?.id!==$2.messages.last()?.id"
                },
                {
                    match: /(this\.loadMorePausedUntilUserScroll\|\|\i<100)/,
                    replace: "$1&&!betterBackreadingSmoothScrollWindowShifted"
                }
            ]
        },
        {
            // Choose how many messages are fetched with each history request.
            find: '"scrollManager.loadMore"',
            replacement: {
                match: /Math\.min\(\i\.\i,2\*\(0,\i\.\i\)\("scrollManager\.loadMore"\)\)/,
                replace: "$self.getMessageCount($&)"
            }
        },
        {
            // Keep more existing messages when loading larger batches.
            find: "truncateBottom(",
            group: true,
            replacement: [
                {
                    match: /(?<=this\.length(?:<=|>))\i\.\i(?=\?)/g,
                    replace: "$self.getWindowThreshold($&)"
                },
                {
                    match: /(?<=\.truncate(?:Top|Bottom)\()\i\.\i/g,
                    replace: "$self.getWindowTarget($&)"
                }
            ]
        }
    ]
});
