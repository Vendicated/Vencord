/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { DataStore } from "@api/index";
import { Devs, SUPPORT_CHANNEL_ID } from "@utils/constants";
import { makeCodeblock } from "@utils/misc";
import definePlugin from "@utils/types";
import { isOutdated } from "@utils/updater";
import { Alerts, FluxDispatcher, Forms, UserStore } from "@webpack/common";

import gitHash from "~git-hash";
import plugins from "~plugins";

import settings from "./settings";

const REMEMBER_DISMISS_KEY = "Vencord-SupportHelper-Dismiss";

export default definePlugin({
    name: "SupportHelper",
    required: true,
    description: "Helps me provide support to you",
    authors: [Devs.Ven],

    commands: [{
        name: "vencord-debug",
        description: "Send Vencord Debug info",
        predicate: ctx => ctx.channel.id === SUPPORT_CHANNEL_ID,
        execute() {
            const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

            const debugInfo = `
**Vencord Debug Info**

> Discord Branch: ${RELEASE_CHANNEL}
> Client: ${typeof DiscordNative === "undefined" ? window.armcord ? "Armcord" : `Web (${navigator.userAgent})` : `Desktop (Electron v${settings.electronVersion})`}
> Platform: ${window.navigator.platform}
> Vencord Version: ${gitHash}${settings.additionalInfo}
> Outdated: ${isOutdated}
> Enabled Plugins:
${makeCodeblock(Object.keys(plugins).filter(Vencord.Plugins.isPluginEnabled).join(", "))}
`;

            return {
                content: debugInfo.trim()
            };
        }
    }],

    rememberDismiss() {
        DataStore.set(REMEMBER_DISMISS_KEY, gitHash);
    },

    start() {
        FluxDispatcher.subscribe("CHANNEL_SELECT", async ({ channelId }) => {
            if (channelId !== SUPPORT_CHANNEL_ID) return;
            if (UserStore.getCurrentUser().id in Devs) return;

            if (isOutdated && gitHash !== await DataStore.get(REMEMBER_DISMISS_KEY)) {
                Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>You are using an outdated version of Vencord! Chances are, your issue is already fixed.</Forms.FormText>
                        <Forms.FormText>
                            Please first update using the Updater Page in Settings, or use the VencordInstaller (Update Vencord Button)
                            to do so, in case you can't access the Updater page.
                        </Forms.FormText>
                    </div>,
                    onCancel: this.rememberDismiss,
                    onConfirm: this.rememberDismiss
                });
            }
        });
    }
});
