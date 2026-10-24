/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelMessages } from "@vencord/discord-types";

interface GuardedMessages extends ChannelMessages {
    readonly betterBackreadingTrimGuard?: boolean;
}

interface ScrollAnchor {
    id: string;
    offsetTop: number;
    offsetFromTop: number;
    offsetHeight: number;
}

interface ScrollManager {
    props: { messages: GuardedMessages; };
    ref: { current: { getScrollerNode(): HTMLElement | null; } | null; };
    messageFetchAnchor: ScrollAnchor | null;
    automaticAnchor: ScrollAnchor | null;
    getScrollerState(): { scrollTop: number; scrollHeight: number; offsetHeight: number; };
    getAnchorData(id: string, scrollTop: number): ScrollAnchor | null;
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
    },
    channelOpenScrollMode: {
        type: OptionType.SELECT,
        displayName: "Channel Opening Position",
        description: "Open unread channels at the saved position (or bottom), always the bottom, or defer to default unread behavior.",
        options: [
            { label: "Discord Default", value: "default" },
            { label: "Always Bottom", value: "bottom" },
            { label: "Saved Position", value: "saved", default: true }
        ]
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
    authors: [EquicordDevs.Etorix],
    tags: ["Chat", "Utility"],
    settings,
    scrollManagers,

    isActive(manager?: ScrollManager): boolean {
        if (manager) {
            return scrollManagers.has(manager) && manager.props.messages.betterBackreadingTrimGuard === true;
        }

        return Array.from(scrollManagers).some(manager => this.isActive(manager));
    },

    getChannelOpenScrollMode(manager: ScrollManager) {
        return this.isActive(manager) ? settings.store.channelOpenScrollMode : "default";
    },

    getImageScrollMargin() {
        const imageScrollMargin = boundedInteger(settings.store.imageScrollMargin, 300, 3000, 1500);
        const messageLoadBuffer = boundedInteger(settings.store.messageLoadBuffer, 500, 3000, 1500);
        return `${Math.min(imageScrollMargin, messageLoadBuffer)}px`;
    },

    getLoadMoreBuffer(manager?: ScrollManager) {
        return this.isActive(manager) ? boundedInteger(settings.store.messageLoadBuffer, 500, 3000, 1500) : 500;
    },

    getMessageCount(nativeCount: number, manager?: ScrollManager) {
        return !this.isActive(manager) || settings.store.useDiscordMessageCount ? nativeCount : getCustomMessageCount();
    },

    getWindowThreshold(nativeThreshold: number) {
        return !this.isActive() || settings.store.useDiscordMessageCount ? nativeThreshold : Math.max(nativeThreshold, 4 * getCustomMessageCount());
    },

    getAutomaticAnchorScrollTop(manager: ScrollManager, anchor: ScrollAnchor, fallback: number) {
        const { scrollTop, scrollHeight, offsetHeight } = manager.getScrollerState();
        const current = manager.getAnchorData(anchor.id, scrollTop);

        if (!current) {
            return fallback;
        }

        // Shorter content can force the scrollbar upward without the user scrolling.
        const maximum = Math.max(0, scrollHeight - offsetHeight);
        const savedScrollTop = Math.min(maximum, Math.max(0, anchor.offsetTop - anchor.offsetFromTop));
        const target = current.offsetTop - anchor.offsetFromTop + scrollTop - savedScrollTop;

        // Record the correction before it can trigger another resize callback.
        anchor.offsetTop = current.offsetTop;
        anchor.offsetFromTop = current.offsetTop - target;

        return target;
    },

    getWindowTarget(nativeTarget: number, messages: GuardedMessages, edge: "Top" | "Bottom") {
        if (!this.isActive() || messages.betterBackreadingTrimGuard !== true) {
            return nativeTarget;
        }

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
            find: "updateAutomaticAnchor(",
            group: true,
            replacement: [
                {
                    // Keep the saved anchor offset current while the user scrolls, preventing height correction rubberbanding.
                    match: /(this\.updateAutomaticAnchor\(\i\.scrollTop),!0(?=\):this\.setAutomaticAnchor)/,
                    replace: "$1,!$self.isActive(this)"
                },
                {
                    // Remember where the saved message was before an embed changed height.
                    match: /(\i)\.offsetFromTop=this\.automaticAnchor\.offsetFromTop(?=\))/,
                    replace: "$&,$self.isActive(this)&&($1.offsetTop=this.automaticAnchor.offsetTop)"
                },
                {
                    // Keep ongoing scrolling when correcting for embed height changes.
                    match: /(?<=fixedScrollTop:)\i\.offsetTop-\((\i)\.offsetFromTop\+\i\)/,
                    replace: "$self.isActive(this)&&$1===this.automaticAnchor?$self.getAutomaticAnchorScrollTop(this,$1,$&):$&"
                }
            ]
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
                    replace: "$self.getLoadMoreBuffer(this)"
                },
                {
                    // Include unread history without changing where Discord restores the unread view.
                    match: /(\i<=this\.getOffsetToTriggerLoading\("top",\i\))(?=&&\i>\i\?1:)/,
                    replace: "$1+(this.props.hasUnreads&&$self.isActive(this)?$self.getLoadMoreBuffer(this):0)"
                }
            ]
        },
        {
            // Apply the selected opening position while preserving explicit message jumps.
            find: "restoreScroll(){",
            group: true,
            replacement: [
                {
                    match: /(let\{initialScrollTop:(\i)\}=this;)/,
                    replace: "$1if($self.getChannelOpenScrollMode(this)===\"bottom\")$2=null;"
                },
                {
                    match: /this\.props\.hasUnreads(?=&&this\.props\.channel\.type)/,
                    replace: "$self.getChannelOpenScrollMode(this)===\"default\"&&$&"
                }
            ]
        },
        {
            // Prevent scroll jumps at either placeholder boundary while messages load.
            find: "handleScrollSpeed(",
            replacement: {
                match: /([12]===\i&&)(?=\i\+\i[<>]=)/g,
                replace: "$1(!$self.isActive(this)||!this.isLoading())&&"
            }
        },
        {
            // Prevent held Escape from repeatedly requesting the latest messages.
            find: '"esc","shift+pagedown"',
            replacement: {
                match: /action\((\i)\)\{/,
                replace: "$&if($1?.repeat&&$1.key===\"Escape\"&&$self.isActive())return!1;"
            }
        },
        {
            find: "mergePropsAndUpdate_(",
            group: true,
            replacement: [
                {
                    // Notice when loading a new batch also discards messages from the other end.
                    match: /(mergePropsAndUpdate_\((\i)\)\{let (\i)=this\.props\.messages)/,
                    replace: "$1,betterBackreadingSmoothScrollWindowShifted=$self.isActive(this)&&$3.length>0&&$2.messages.length>0&&$3.first()?.id!==$2.messages.first()?.id&&$3.last()?.id!==$2.messages.last()?.id"
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
                match: /(?<=channelId:(\i)\.props\.channel\.id,before:\i,after:\i,limit:)Math\.min\(\i\.\i,2\*\(0,\i\.\i\)\("scrollManager\.loadMore"\)\)/,
                replace: "$self.getMessageCount($&,$1)"
            }
        },
        {
            find: "MessageActionCreators",
            group: true,
            replacement: [
                {
                    // Use the custom batch size when jumping to a linked message.
                    match: /(?<=limit:)\i\.\i(?=,jump:\{messageId:)/,
                    replace: "$self.getMessageCount($&)"
                },
                {
                    // Use the custom batch size when jumping to the latest messages.
                    match: /jumpToPresent\(\i,(\i)\)\{/,
                    replace: "$&$1=$self.getMessageCount($1);"
                }
            ]
        },
        {
            // Request archived forum posts in the sort order selected instead of always by most recently active.
            find: 'sort_by:"last_message_time"',
            replacement: {
                match: /(sortOrder:(\i).{0,100}sort_by:)"last_message_time"/,
                replace: '$1$2===1?"creation_time":"last_message_time"'
            }
        },
        {
            // Keep visible messages and the preload area when Discord trims its message list.
            // Also, register a flag indicating this group applied successfully. Without this group,
            // the earlier message preloading in conjunction with post-request truncation can result
            // in visible messages being discarded and more being requested in a loop.
            find: "truncateBottom(",
            group: true,
            replacement: [
                {
                    match: /(?<=this\.length<=)\i\.\i(?=\?)/,
                    replace: "$self.getWindowThreshold($&)"
                },
                {
                    match: /(?<=this\.length>)\i\.\i(?=\?)/,
                    replace: "$self.getWindowThreshold($&)"
                },
                {
                    match: /truncateTop\((\i)\)\{/,
                    replace: "get betterBackreadingTrimGuard(){return true;}$&$1=$self.getWindowTarget($1,this,\"Top\");"
                },
                {
                    match: /truncateBottom\((\i)\)\{/,
                    replace: "$&$1=$self.getWindowTarget($1,this,\"Bottom\");"
                }
            ]
        },
        {
            // Read each open chat's current viewport when deciding which messages can be discarded.
            // Keep tracking a chat view when Discord hides it and shows it again.
            find: "getOffsetToTriggerLoading(",
            group: true,
            replacement: [
                {
                    match: /mergePropsAndUpdate\(\i\)\{/,
                    replace: "$&$self.scrollManagers.add(this);"
                },
                {
                    match: /cleanup\(\)\{(?=this\.acking=)/,
                    replace: "$&$self.scrollManagers.delete(this);"
                }
            ]
        }
    ]
});
