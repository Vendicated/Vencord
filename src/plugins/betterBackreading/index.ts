/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelMessages } from "@vencord/discord-types";

interface ScrollManager {
    props: { messages: ChannelMessages; };
    ref: { current: { getScrollerNode(): HTMLElement | null; } | null; };
    messageFetchAnchor: { id: string; } | null;
    automaticAnchor: { id: string; } | null;
    getScrollerState(): { scrollTop: number; offsetHeight: number; };
    getAnchorData(id: string, scrollTop: number): { offsetFromTop: number; offsetHeight: number; } | null;
}

const scrollManagers = new Set<ScrollManager>();

const settings = definePluginSettings({
    imageScrollMargin: {
        type: OptionType.STRING,
        displayName: "Image Preload Distance",
        description: "How far ahead to load images, in pixels (300-3000).",
        default: "1500",
        isValid: value => validateInteger(value, 300, 3000),
        restartNeeded: true
    },
    messageLoadBuffer: {
        type: OptionType.STRING,
        displayName: "Message Load Buffer",
        description: "How far ahead to fetch more messages, in pixels (500-3000).",
        default: "1500",
        isValid: value => validateInteger(value, 500, 3000),
        restartNeeded: true
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
    scrollManagers,

    getImageScrollMargin() {
        return `${Math.min(boundedInteger(settings.store.imageScrollMargin, 300, 3000, 1500), this.getLoadMoreBuffer())}px`;
    },

    getLoadMoreBuffer() {
        return boundedInteger(settings.store.messageLoadBuffer, 500, 3000, 1500);
    },

    getMessageCount(nativeCount: number) {
        return settings.store.useDiscordMessageCount ? nativeCount : getCustomMessageCount();
    },

    getWindowThreshold(nativeThreshold: number) {
        return settings.store.useDiscordMessageCount ? nativeThreshold : Math.max(nativeThreshold, 4 * getCustomMessageCount());
    },

    getWindowTarget(nativeTarget: number, messages: ChannelMessages, edge: "Top" | "Bottom") {
        const minimum = settings.store.useDiscordMessageCount ? nativeTarget : Math.max(nativeTarget, 2 * getCustomMessageCount());
        const target = Math.max(minimum, Math.ceil(messages.length / 2));

        // Keep the whole list when it is already small enough.
        if (target >= messages.length) {
            return target;
        }

        const truncateTop = edge === "Top";
        const cut = truncateTop ? messages.length - target : target - 1;
        const margin = this.getLoadMoreBuffer() + 100;

        // Check each open view of this channel before discarding loaded messages.
        for (const manager of scrollManagers) {
            if (manager.props.messages.channelId !== messages.channelId) {
                continue;
            }

            const node = manager.ref.current?.getScrollerNode();
            const { scrollTop, offsetHeight } = manager.getScrollerState();

            // Skip chat views that are closed, collapsed, or not laid out yet.
            if (!node?.getClientRects().length || offsetHeight <= 0) {
                continue;
            }

            const boundary = manager.getAnchorData(messages._array[cut].id, scrollTop);

            // Keep every message if the cut cannot be measured or would remove visible or preloaded content.
            if (!boundary || (truncateTop ? boundary.offsetFromTop > -margin : boundary.offsetFromTop + boundary.offsetHeight < offsetHeight + margin)) {
                return messages.length;
            }

            // Check whether trimming would remove a message Discord uses to maintain scroll position.
            for (const anchor of [manager.messageFetchAnchor, manager.automaticAnchor]) {
                if (!anchor) {
                    continue;
                }

                const index = messages._array.findIndex(message => message.id === anchor.id);

                // Keep every message if the cut would remove one Discord needs to restore user position.
                if (index >= 0 && (truncateTop ? index < cut : index > cut)) {
                    return messages.length;
                }
            }
        }

        return target;
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
            find: "getOffsetToTriggerLoading(",
            group: true,
            replacement: [
                {
                    // Request messages earlier as scrolling approaches a loading boundary.
                    match: /500(?=;return \i\.hasMoreAfter)|(?<=\i\.hasMoreAfter\?\i-\i-\i-)500/g,
                    replace: "$self.getLoadMoreBuffer()"
                },
                {
                    // Include unread history without changing where Discord restores the unread view.
                    match: /(\i<=this\.getOffsetToTriggerLoading\("top",\i\))(?=&&\i>\i\?1:)/,
                    replace: "$1+(this.props.hasUnreads?$self.getLoadMoreBuffer():0)"
                }
            ]
        },
        {
            // Prevent scroll jumps at either placeholder boundary while messages load.
            find: "handleScrollSpeed(",
            replacement: {
                match: /([12]===\i&&)(?=\i\+\i[<>]=)/g,
                replace: "$1!this.isLoading()&&"
            }
        },
        {
            find: "mergePropsAndUpdate_(",
            group: true,
            replacement: [
                {
                    // Notice when loading a new batch also discards messages from the other end.
                    match: /(mergePropsAndUpdate_\((\i)\)\{let (\i)=this\.props\.messages)/,
                    replace: "$1,betterBackreadingSmoothScrollWindowShifted=$3.length>0&&$2.messages.length>0&&$3.first()?.id!==$2.messages.first()?.id&&$3.last()?.id!==$2.messages.last()?.id"
                },
                {
                    // Allow fast middle-click scrolling through messages without getting stuck in a placeholder boundary.
                    match: /(this\.loadMorePausedUntilUserScroll\|\|\i<100)/,
                    replace: "$1&&!betterBackreadingSmoothScrollWindowShifted"
                },
                {
                    // Restore the reading position even when added and discarded messages have equal height.
                    match: /(?<=this\.isHeightChange\(\i,\i\))(?=;if\(this\.offsetHeightCache=)/,
                    replace: "||betterBackreadingSmoothScrollWindowShifted"
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
            // Keep visible messages and the preload area when Discord trims its message list.
            find: "truncateBottom(",
            group: true,
            replacement: [
                {
                    match: /(?<=this\.length(?:<=|>))\i\.\i(?=\?)/g,
                    replace: "$self.getWindowThreshold($&)"
                },
                {
                    match: /(\i)\.truncate(Top|Bottom)\((\i\.\i)/g,
                    replace: "$1.truncate$2($self.getWindowTarget($3,$1,\"$2\")"
                }
            ]
        },
        {
            // Read each open chat's current viewport when deciding which messages can be discarded.
            find: "getOffsetToTriggerLoading(",
            group: true,
            replacement: [
                {
                    match: /(constructor\((\i)\)\{)(?=if\(this\.props=\2,this\.loading=)/,
                    replace: "$1$self.scrollManagers.add(this);"
                },
                {
                    match: /cleanup\(\)\{(?=this\.acking=)/,
                    replace: "$&$self.scrollManagers.delete(this);"
                }
            ]
        }
    ]
});
