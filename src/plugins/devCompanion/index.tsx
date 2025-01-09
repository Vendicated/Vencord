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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, ReporterTestable } from "@utils/types";

import { initWs, socket, stopWs } from "./initWs";
console.log("imported");
export const PORT = 8485;
const NAV_ID = "dev-companion-reconnect";

export const logger = new Logger("DevCompanion");

export const settings = definePluginSettings({
    notifyOnAutoConnect: {
        description: "Whether to notify when Dev Companion has automatically connected.",
        type: OptionType.BOOLEAN,
        default: true
    },
    usePatchedModule: {
        description: "On extract requests, reply with the current patched module (if it is patched) instead of the original.",
        default: true,
        type: OptionType.BOOLEAN,
    },
    reloadAfterToggle: {
        description: "Reload after a disable/enable plugin command is recived.",
        default: true,
        type: OptionType.BOOLEAN
    }
});

export default definePlugin({
    name: "DevCompanion",
    description: "Dev Companion Plugin",
    authors: [Devs.Ven, Devs.sadan, Devs.Samwich],
    reporterTestable: ReporterTestable.None,
    settings,

    toolboxActions: {
        "Reconnect"() {
            socket?.close(1000, "Reconnecting");
            initWs(true);
        }
    },

    start() {
        // if we're running the reporter, we need to initws in the reporter file to avoid a race condition
        if (!IS_COMPANION_TEST)
            initWs();
    },

    stop: stopWs,
});
