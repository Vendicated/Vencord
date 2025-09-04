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

import { Devs, IS_MAC } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ComponentDispatch, FluxDispatcher, NavigationRouter, SelectedGuildStore, SettingsRouter } from "@webpack/common";

const KeyBinds = findByPropsLazy("JUMP_TO_GUILD", "SERVER_NEXT");

export default definePlugin({
    name: "WebKeybinds",
    description: "Re-adds keybinds missing in the web version of Discord: ctrl+t, ctrl+shift+t, ctrl+tab, ctrl+shift+tab, ctrl+1-9, ctrl+,. Only works fully on Vesktop/Legcord, not inside your browser",
    authors: [Devs.Ven],
    enabledByDefault: true,

    onKey(e: KeyboardEvent) {
        const hasCtrl = e.ctrlKey || (e.metaKey && IS_MAC);

        if (hasCtrl) switch (e.key) {
            case "t":
            case "T":
                if (!IS_VESKTOP) return;
                e.preventDefault();
                if (e.shiftKey) {
                    if (SelectedGuildStore.getGuildId()) NavigationRouter.transitionToGuild("@me");
                    ComponentDispatch.safeDispatch("TOGGLE_DM_CREATE");
                } else {
                    FluxDispatcher.dispatch({
                        type: "QUICKSWITCHER_SHOW",
                        query: "",
                        queryMode: null
                    });
                }
                break;
            case "Tab":
                if (!IS_VESKTOP) return;
                const handler = e.shiftKey ? KeyBinds.SERVER_PREV : KeyBinds.SERVER_NEXT;
                handler.action(e);
                break;
            case ",":
                e.preventDefault();
                SettingsRouter.open("My Account");
                break;
            default:
                if (e.key >= "1" && e.key <= "9") {
                    e.preventDefault();
                    KeyBinds.JUMP_TO_GUILD.action(e, `mod+${e.key}`);
                }
                break;
        }
    },

    start() {
        document.addEventListener("keydown", this.onKey);
    },

    stop() {
        document.removeEventListener("keydown", this.onKey);
    }
});
