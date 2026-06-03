/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { definePluginSettings } from "@api/Settings";
import { managedStyleRootNode } from "@api/Styles";
import { Devs } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { MediaEngineStore, UserStore } from "@webpack/common";

const STREAMING_CLASS = "vc-blur-on-stream";

const settings = definePluginSettings({
    blurAmount: {
        type: OptionType.NUMBER,
        description: "Blur amount in pixels",
        default: 10,
        onChange: setCss,
    },
    hoverToReveal: {
        type: OptionType.BOOLEAN,
        description: "Hover over blurred content to reveal it",
        default: true,
        onChange: setCss,
    },
});

let style: HTMLStyleElement;
let removeTimeout: ReturnType<typeof setTimeout> | null = null;

function setCss() {
    style.textContent = `
        .${STREAMING_CLASS} [class*="messageContent"],
        .${STREAMING_CLASS} [class*="attachment"],
        .${STREAMING_CLASS} [class*="embed"],
        .${STREAMING_CLASS} [class*="sticker"],
        .${STREAMING_CLASS} [class*="reactions"],
        .${STREAMING_CLASS} [class*="replyBar"],
        .${STREAMING_CLASS} [class*="threadMessageAccessory"] {
            filter: blur(${settings.store.blurAmount}px);
            transition: filter 0.2s ease;
        }
        ${settings.store.hoverToReveal ? `
        .${STREAMING_CLASS} [class*="messageContent"]:hover,
        .${STREAMING_CLASS} [class*="attachment"]:hover,
        .${STREAMING_CLASS} [class*="embed"]:hover,
        .${STREAMING_CLASS} [class*="sticker"]:hover,
        .${STREAMING_CLASS} [class*="reactions"]:hover,
        .${STREAMING_CLASS} [class*="replyBar"]:hover,
        .${STREAMING_CLASS} [class*="threadMessageAccessory"]:hover {
            filter: blur(0);
        }` : ""}
    `;
}

function addStreamingClass() {
    if (removeTimeout) {
        clearTimeout(removeTimeout);
        removeTimeout = null;
    }
    document.documentElement.classList.add(STREAMING_CLASS);
}

function removeStreamingClass() {
    document.documentElement.classList.remove(STREAMING_CLASS);
}

function syncStreamingState() {
    if (MediaEngineStore.isScreenSharing()) {
        addStreamingClass();
    } else {
        removeStreamingClass();
    }
}

function checkInitialState() {
    syncStreamingState();
}

export default definePlugin({
    name: "BlurOnStream",
    description: "Blurs all messages when you're sharing your screen for privacy",
    tags: ["Privacy", "Appearance"],
    authors: [Devs.Egologic],
    settings,

    flux: {
        STREAM_CREATE() {
            syncStreamingState();
        },
        STREAM_DELETE() {
            syncStreamingState();
        },
        STREAM_UPDATE() {
            syncStreamingState();
        },
        STREAM_SET_PAUSED() {
            syncStreamingState();
        },
        MEDIA_ENGINE_SET_GO_LIVE_SOURCE() {
            syncStreamingState();
        },
        MEDIA_ENGINE_VIDEO_STATE_CHANGED() {
            syncStreamingState();
        },
    },

    start() {
        style = createAndAppendStyle("VcBlurOnStream", managedStyleRootNode);
        setCss();
        checkInitialState();
    },

    stop() {
        if (removeTimeout) {
            clearTimeout(removeTimeout);
            removeTimeout = null;
        }
        removeStreamingClass();
        style?.remove();
    },
});
