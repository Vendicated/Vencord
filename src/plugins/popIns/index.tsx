import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";

import { closeAllWindows, setCurrentChannelId } from "./components/FloatingWindow";
import { streamContextPatch, userContextPatch } from "./contextMenus";
import { handleStreamDelete, handleVoiceStateUpdates } from "./fluxHandlers";
import { WindowStore } from "./stores";
import { handleWindowChange, unhookWindow, getWindowStore } from "./windowHooks";

export default definePlugin({
    name: "PopIn's",
    description: "Right-click on a stream or webcam tile to pop it out to a floating window inside the discord",
    authors: [Devs.fantik],

    contextMenus: {
        "stream-context": streamContextPatch,
        "user-context": userContextPatch
    },

    flux: {
        VOICE_STATE_UPDATES: handleVoiceStateUpdates,
        STREAM_DELETE: handleStreamDelete
    },

    start() {

        // Initialize current channel if already in voice
        const voiceChannelId = SelectedChannelStore.getVoiceChannelId();
        if (voiceChannelId) {
            setCurrentChannelId(voiceChannelId);
        }

        // Setup window hooks
        if (WindowStore) {
            handleWindowChange();
            WindowStore.addChangeListener(handleWindowChange);
        }
    },

    stop() {
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
