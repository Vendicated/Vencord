/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { closeAllModals } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { maybePromptToUpdate } from "@utils/updater";
import { FluxDispatcher, NavigationRouter } from "@webpack/common";
import type { ReactElement } from "react";

const CrashHandlerLogger = new Logger("CrashHandler");

const settings = definePluginSettings({
    attemptToPreventCrashes: {
        type: OptionType.BOOLEAN,
        description: "Whether to attempt to prevent Discord crashes.",
        default: true
    },
    attemptToNavigateToHome: {
        type: OptionType.BOOLEAN,
        description: "Whether to attempt to navigate to the home when preventing Discord crashes.",
        default: false
    }
});

let crashCount: number = 0;
let lastCrashTimestamp: number = 0;
let shouldAttemptNextHandle = false;

export default definePlugin({
    name: "CrashHandler",
    description: "Utility plugin for handling and possibly recovering from Crashes without a restart",
    authors: [Devs.Nuckyz],
    enabledByDefault: true,

    popAllModals: undefined as (() => void) | undefined,

    settings,

    patches: [
        {
            find: ".Messages.ERRORS_UNEXPECTED_CRASH",
            replacement: {
                match: /(?=this\.setState\()/,
                replace: "$self.handleCrash(this)||"
            }
        },
        {
            find: 'dispatch({type:"MODAL_POP_ALL"})',
            replacement: {
                match: /"MODAL_POP_ALL".+?};(?<=(\i)=function.+?)/,
                replace: (m, popAll) => `${m}$self.popAllModals=${popAll};`
            }
        }
    ],

    handleCrash(_this: ReactElement & { forceUpdate: () => void; }) {
        if (Date.now() - lastCrashTimestamp <= 1_000 && !shouldAttemptNextHandle) return true;

        shouldAttemptNextHandle = false;

        if (++crashCount > 5) {
            try {
                showNotification({
                    color: "#eed202",
                    title: "Discord has crashed!",
                    body: "Awn :( Discord has crashed more than five times, not attempting to recover.",
                    noPersist: true,
                });
            } catch { }

            lastCrashTimestamp = Date.now();
            return false;
        }

        setTimeout(() => crashCount--, 60_000);

        try {
            if (crashCount === 1) maybePromptToUpdate("Uh oh, Discord has just crashed... but good news, there is a Vencord update available that might fix this issue! Would you like to update now?", true);

            if (settings.store.attemptToPreventCrashes) {
                this.handlePreventCrash(_this);
                return true;
            }

            return false;
        } catch (err) {
            CrashHandlerLogger.error("Failed to handle crash", err);
            return false;
        } finally {
            lastCrashTimestamp = Date.now();
        }
    },

    handlePreventCrash(_this: ReactElement & { forceUpdate: () => void; }) {
        if (Date.now() - lastCrashTimestamp >= 1_000) {
            try {
                showNotification({
                    color: "#eed202",
                    title: "Discord has crashed!",
                    body: "Attempting to recover...",
                    noPersist: true,
                });
            } catch { }
        }

        try {
            FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close open context menu.", err);
        }
        try {
            this.popAllModals?.();
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close old modals.", err);
        }
        try {
            closeAllModals();
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close all open modals.", err);
        }
        try {
            FluxDispatcher.dispatch({ type: "USER_PROFILE_MODAL_CLOSE" });
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close user popout.", err);
        }
        try {
            FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
        } catch (err) {
            CrashHandlerLogger.debug("Failed to pop all layers.", err);
        }
        if (settings.store.attemptToNavigateToHome) {
            try {
                NavigationRouter.transitionTo("/channels/@me");
            } catch (err) {
                CrashHandlerLogger.debug("Failed to navigate to home", err);
            }
        }

        try {
            shouldAttemptNextHandle = true;
            _this.forceUpdate();
        } catch (err) {
            CrashHandlerLogger.debug("Failed to update crash handler component.", err);
        }
    }
});
