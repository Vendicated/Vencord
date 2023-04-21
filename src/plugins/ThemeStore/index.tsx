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

import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";

import { Store } from "./components/Store";
import { getThemes } from "./API";
import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { SettingsRouter } from "@webpack/common";

const themeStoreLogger = new Logger("ThemeStore");

export default definePlugin({
    name: "Theme Store",
    authors: [Devs.Arjix],
    description: "",
    getThemes,

    patches: [
        {
            find: "Messages.ACTIVITY_SETTINGS",
            replacement: {
                // Below the "Appearance" section
                match: /\{section:.{1,2}\.ID\.HEADER,\s*label:.{1,2}\..{1,2}\.Messages\.APP_SETTINGS\},\{.*?\}/,
                replace: "$&,$self.addSection()"
            }
        }
    ],

    addSection() {
        return {
            section: "ThemeStoreSettings",
            label: "Theme Store",
            element: () => <Store />
        };
    },

    ctxMenuPatch(children) {
        const section = children.find(c => Array.isArray(c) && c.some(it => it?.props?.id === "ThemeStoreSettings")) as any;
        section?.forEach(c => {
            if (c?.props?.id?.startsWith("ThemeStore")) {
                c.props.action = () => SettingsRouter.open(c.props.id);
            }
        });
    },
    start() {
        addContextMenuPatch("user-settings-cog", this.ctxMenuPatch);
    },
    stop() {
        removeContextMenuPatch("user-settings-cog", this.ctxMenuPatch);
    },
});
