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
import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import { closeAllModals } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { checkForUpdates, isNewer, rebuild, update, UpdateLogger } from "@utils/updater";
import { filters, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, NavigationRouter } from "@webpack/common";
import { ReactElement } from "react";

const UserActivityActions = mapMangledModuleLazy('dispatch({type:"MODAL_POP_ALL"})', {
    popAllModals: filters.byCode("MODAL_POP_ALL", "CHANNEL_SETTINGS_CLOSE", "EMAIL_VERIFICATION_MODAL_CLOSE")
}) as { popAllModals: () => void; };

const CrashHandlerLogger = new Logger("CrashHandler");

const settings = definePluginSettings({
    attemptToPreventCrashes: {
        type: OptionType.BOOLEAN,
        description: "Wheter to attempt to prevent Discord crashes.",
        default: true
    },
    attemptToNavigateToHome: {
        type: OptionType.BOOLEAN,
        description: "Wheter to attempt to navigate to the home when preventing Discord crashes.",
        default: false
    }
});

export default definePlugin({
    name: "CrashHandler",
    description: "Utility plugin for handling Discord crashes caused or not by Vencord.",
    authors: [Devs.Nuckyz],
    enabledByDefault: true,

    settings,

    patches: [
        {
            find: ".Messages.ERRORS_UNEXPECTED_CRASH",
            replacement: {
                match: /(?=this\.setState\()/,
                replace: ""
                    + "$self.maybePromptToUpdateVencord();"
                    + "$self.settings.store.attemptToPreventCrashes?$self.handlePreventCrash(this):"
            }
        },
        {
            find: 'dispatch({type:"MODAL_POP_ALL"})',
            replacement: {
                match: /(?<=\i:\(\)=>\i)(?=}.+?(?<popAll>\i)=function\(\){\(0,\i\.\i\)\(\);\i\.\i\.dispatch\({type:"MODAL_POP_ALL"}\))/,
                replace: ",ch1:()=>$<popAll>"
            }
        }
    ],

    async maybePromptToUpdateVencord() {
        if (IS_WEB || IS_DEV) return;

        try {
            const outdated = await checkForUpdates();

            if (isNewer) return alert("Vencord has found an update available that might fix this crash. However your local copy has more recent commits. Please stash or reset them.");
            if (!outdated) return;

            if (confirm("Uh oh, Discord has just crashed... but good news, there is a Vencord update available that might fix this issue! Would you like to update now?")) {
                try {
                    if (await update()) {
                        const needFullRestart = await rebuild();
                        if (needFullRestart) window.DiscordNative.app.relaunch();
                        else location.reload();
                    }
                } catch (err) {
                    alert("Vencord has failed to update.");
                    UpdateLogger.error("Failed to update", err);
                    CrashHandlerLogger.error("Failed to update Vencord.");
                }
            }
        } catch (err) {
            CrashHandlerLogger.error("Failed to check for updates.", err);
        }
    },

    handlePreventCrash(_this: ReactElement & { forceUpdate: () => void; }) {
        try {
            showNotification({
                color: "#eed202",
                title: "Discord has crashed!",
                body: "Attempting to recover...",
            });
        } catch { }

        try {
            FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" });
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close open context menu.", err);
        }
        try {
            UserActivityActions.popAllModals();
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

        _this.forceUpdate();
    }
});
