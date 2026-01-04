/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";

import { closeAllWindows, setCurrentChannelId } from "./components/FloatingWindow";
import { logger } from "./constants";
import { streamContextPatch, userContextPatch } from "./contextMenus";
import { handleStreamDelete, handleVoiceStateUpdates } from "./fluxHandlers";
import { WindowStore } from "./stores";
import { handleWindowChange, unhookWindow, getWindowStore } from "./windowHooks";

// Initialize debug utilities
import "./utils/debug";

export default definePlugin({
    name: "PopIn's",
    description: "Right-click on a stream or webcam tile to pop it out to a floating window",
    authors: [Devs.Ven],

    contextMenus: {
        "stream-context": streamContextPatch,
        "user-context": userContextPatch
    },

    flux: {
        VOICE_STATE_UPDATES: handleVoiceStateUpdates,
        STREAM_DELETE: handleStreamDelete
    },

    start() {
        logger.info("PopIn's starting...");

        // Initialize current channel if already in voice
        const voiceChannelId = SelectedChannelStore.getVoiceChannelId();
        if (voiceChannelId) {
            setCurrentChannelId(voiceChannelId);
        }

        // Setup window hooks
        if (WindowStore) {
            logger.info("WindowStore available, initializing window hooks");
            handleWindowChange();
            WindowStore.addChangeListener(handleWindowChange);
        } else {
            logger.error("WindowStore NOT available at start");
        }
    },

    stop() {
        logger.info("PopIn's stopping...");
        closeAllWindows();
        setCurrentChannelId(null);

        // Cleanup main window
        unhookWindow(window);

        // Cleanup all other windows
        const store = getWindowStore();
        if (store) {
            const windowKeys = store.getWindowKeys();
            for (const key of windowKeys) {
                const win = store.getWindow(key);
                if (win) unhookWindow(win);
            }
            store.removeChangeListener(handleWindowChange);
        }

        // Remove any remaining injected elements
        document.querySelectorAll(".vc-pin-inject-btn").forEach(el => el.remove());
    }
});
