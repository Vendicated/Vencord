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


import { findOption, RequiredMessageOption } from "@api/Commands";
import {
    addPreSendListener,
    MessageObject,
    removePreSendListener,
} from "@api/MessageEvents";
import { Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "bypasser",
    description: "uses unnoticeable characters to bypass most automods",
    authors: [Devs.echo],
    dependencies: ["MessageEventsAPI"],
    options: {
        ignoreBlockedMessages: {
            description:
                "always active (if disabled, messages will not bypass automatically, and you have to use the command to bypass)",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        },
    },
    commands: [
        {
            name: "bypass",
            description: "bypass automod",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "").replaceAll(
                    /(.)/g,
                    "$1​‍‍⁤"
                ),
            }),
        },
    ],

    addPrefix(msg: MessageObject) {
        msg.content = msg.content.replaceAll(/(.)/g, "$1​‍‍⁤");
    },

    start() {
        if (Settings.plugins.bypasser.linkPrefix) {
            this.preSend = addPreSendListener((_, msg) => this.addPrefix(msg));
        }
    },

    stop() {
        if (Settings.plugins.bypasser.linkPrefix) {
            removePreSendListener(this.preSend);
        }
    },
});
