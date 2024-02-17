/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { closeAllModals } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { maybePromptToUpdate } from "@utils/updater";
import { filters, findBulk, proxyLazyWebpack } from "@webpack";
import { FluxDispatcher, NavigationRouter, SelectedChannelStore } from "@webpack/common";

const CrashHandlerLogger = new Logger("CrashHandler");
const { ModalStack, DraftManager, DraftType, closeExpressionPicker } = proxyLazyWebpack(() => {
    const modules = findBulk(
        filters.byProps("pushLazy", "popAll"),
        filters.byProps("clearDraft", "saveDraft"),
        filters.byProps("DraftType"),
        filters.byProps("closeExpressionPicker", "openExpressionPicker"),
    );

    return {
        ModalStack: modules[0],
        DraftManager: modules[1],
        DraftType: modules[2]?.DraftType,
        closeExpressionPicker: modules[3]?.closeExpressionPicker,
    };
});

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

let hasCrashedOnce = false;
let isRecovering = false;
let shouldAttemptRecover = true;

export default definePlugin({
    name: "CrashHandler",
    description: "Utility plugin for handling and possibly recovering from crashes without a restart",
    authors: [Devs.Nuckyz],
    enabledByDefault: true,

    settings,

    patches: [
        {
            find: ".Messages.ERRORS_UNEXPECTED_CRASH",
            replacement: {
                match: /this\.setState\((.+?)\)/,
                replace: "$self.handleCrash(this,$1);"
            }
        }
    ],

    handleCrash(_this: any, errorState: any) {
        _this.setState(errorState);

        // Already recovering, prevent error which happens more than once too fast to trigger another recover
        if (isRecovering) return;
        isRecovering = true;

        // 1 ms timeout to avoid react breaking when re-rendering
        setTimeout(() => {
            try {
                // Prevent a crash loop with an error that could not be handled
                if (!shouldAttemptRecover) {
                    try {
                        showNotification({
                            color: "#eed202",
                            title: "Discord has crashed!",
                            body: "Awn :( Discord has crashed two times rapidly, not attempting to recover.",
                            noPersist: true
                        });
                    } catch { }

                    return;
                }

                shouldAttemptRecover = false;
                // This is enough to avoid a crash loop
                setTimeout(() => shouldAttemptRecover = true, 500);
            } catch { }

            try {
                if (!hasCrashedOnce) {
                    hasCrashedOnce = true;
                    maybePromptToUpdate("Uh oh, Discord has just crashed... but good news, there is a Vencord update available that might fix this issue! Would you like to update now?", true);
                }
            } catch { }

            try {
                if (settings.store.attemptToPreventCrashes) {
                    this.handlePreventCrash(_this);
                }
            } catch (err) {
                CrashHandlerLogger.error("Failed to handle crash", err);
            }
        }, 1);
    },

    handlePreventCrash(_this: any) {
        try {
            showNotification({
                color: "#eed202",
                title: "Discord has crashed!",
                body: "Attempting to recover...",
                noPersist: true
            });
        } catch { }

        try {
            const channelId = SelectedChannelStore.getChannelId();

            DraftManager.clearDraft(channelId, DraftType.ChannelMessage);
            DraftManager.clearDraft(channelId, DraftType.FirstThreadMessage);
        } catch (err) {
            CrashHandlerLogger.debug("Failed to clear drafts.", err);
        }
        try {
            closeExpressionPicker();
        }
        catch (err) {
            CrashHandlerLogger.debug("Failed to close expression picker.", err);
        }
        try {
            FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close open context menu.", err);
        }
        try {
            ModalStack.popAll();
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


        // Set isRecovering to false before setting the state to allow us to handle the next crash error correcty, in case it happens
        setImmediate(() => isRecovering = false);

        try {
            _this.setState({ error: null, info: null });
        } catch (err) {
            CrashHandlerLogger.debug("Failed to update crash handler component.", err);
        }
    }
});
