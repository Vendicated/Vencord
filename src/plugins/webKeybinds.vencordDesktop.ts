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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findLazy, mapMangledModuleLazy } from "@webpack";
import { ComponentDispatch, FluxDispatcher, NavigationRouter, SelectedGuildStore, SettingsRouter } from "@webpack/common";

const GuildNavBinds = mapMangledModuleLazy("mod+alt+down", {
    CtrlTab: m => m.binds?.at(-1) === "ctrl+tab",
    CtrlShiftTab: m => m.binds?.at(-1) === "ctrl+shift+tab",
});

const DigitBinds = findLazy(m => m.binds?.[0] === "mod+1");

export default definePlugin({
    name: "WebKeybinds",
    description: "Re-adds keybinds missing in the web version of Discord: ctrl+t, ctrl+shift+t, ctrl+tab, ctrl+shift+tab, ctrl+1-9, ctrl+,",
    authors: [Devs.Ven],
    enabledByDefault: true,

    onKey(e: KeyboardEvent) {
        const hasCtrl = e.ctrlKey || (e.metaKey && navigator.platform.includes("Mac"));

        if (hasCtrl) switch (e.key) {
            case "t":
            case "T":
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
            case ",":
                e.preventDefault();
                SettingsRouter.open("My Account");
                break;
            case "Tab":
                const handler = e.shiftKey ? GuildNavBinds.CtrlShiftTab : GuildNavBinds.CtrlTab;
                handler.action(e);
                break;
            default:
                if (e.key >= "1" && e.key <= "9") {
                    e.preventDefault();
                    DigitBinds.action(e, `mod+${e.key}`);
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
