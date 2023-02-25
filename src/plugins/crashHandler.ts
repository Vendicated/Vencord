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
import { ContextMenu, FluxDispatcher, NavigationRouter } from "@webpack/common";

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
    required: true,

    settings,

    patches: [
        {
            find: ".Messages.ERRORS_UNEXPECTED_CRASH",
            replacement: [
                {
                    match: /(?=this\.setState\()/,
                    replace: ""
                        + "$self.maybePromptToUpdateVencord();"
                        + "$self.settings.store.attemptToPreventCrashes?$self.handlePreventCrash(this):"
                }
            ]
        }
    ],

    async maybePromptToUpdateVencord() {
        try {
            const outdated = await checkForUpdates();
            if (!outdated) return;

            if (isNewer) return alert("Vencord has found an update available that might fix this crash. However your local copy has more recent commits. Please stash or reset them.");

            if (confirm("Uh oh, Discord has just crashed... but good news, there is a Vencord update available that might fix this issue! Would you like to update now?")) {
                try {
                    if (await update()) {
                        const needFullRestart = await rebuild();
                        if (needFullRestart) window.DiscordNative.app.relaunch();
                        else location.reload();
                    }
                } catch (err) {
                    UpdateLogger.error("Failed to update", err);
                }
            }
        } catch (err) {
            CrashHandlerLogger.error("Failed to check for updates.", err);
        }
    },

    handlePreventCrash(_this) {
        try {
            showNotification({
                color: "#eed202",
                title: "Discord has crashed!",
                body: "Attempting to recover...",
            });
        } catch { }

        try {
            ContextMenu.close();
        } catch (err) {
            CrashHandlerLogger.debug("Failed to close open context menu.", err);
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
