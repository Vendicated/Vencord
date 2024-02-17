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
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ComponentDispatch, FluxDispatcher, NavigationRouter, SelectedGuildStore, SettingsRouter } from "@webpack/common";

const settings = definePluginSettings({
    mainModifierKey: {
        type: OptionType.SELECT,
        description: "Main modifier key",
        options: [
            { "label": "Ctrl/Cmd", "value": "ctrl", default: true },
            { "label": "Shift", "value": "shift" },
            { "label": "Alt", "value": "alt" }
        ] as const
    },
    quickSwitcherKey: {
        type: OptionType.SELECT,
        description: "Quick Switcher key",
        options: [
            { "label": "Disable keybind", "value": "off" },
            { "label": "A", "value": "a" },
            { "label": "B", "value": "b" },
            { "label": "C", "value": "c" },
            { "label": "D", "value": "d" },
            { "label": "E", "value": "e" },
            { "label": "F", "value": "f" },
            { "label": "G", "value": "g" },
            { "label": "H", "value": "h" },
            { "label": "I", "value": "i" },
            { "label": "J", "value": "j" },
            { "label": "K", "value": "k" },
            { "label": "L", "value": "l" },
            { "label": "M", "value": "m" },
            { "label": "N", "value": "n" },
            { "label": "O", "value": "o" },
            { "label": "P", "value": "p" },
            { "label": "Q", "value": "q" },
            { "label": "R", "value": "r" },
            { "label": "S", "value": "s" },
            { "label": "T", "value": "t", default: true },
            { "label": "U", "value": "u" },
            { "label": "V", "value": "v" },
            { "label": "W", "value": "w" },
            { "label": "X", "value": "x" },
            { "label": "Y", "value": "y" },
            { "label": "Z", "value": "z" },
            { "label": "0", "value": "0" },
            { "label": "1", "value": "1" },
            { "label": "2", "value": "2" },
            { "label": "3", "value": "3" },
            { "label": "4", "value": "4" },
            { "label": "5", "value": "5" },
            { "label": "6", "value": "6" },
            { "label": "7", "value": "7" },
            { "label": "8", "value": "8" },
            { "label": "9", "value": "9" },
            { "label": "Tab", "value": "tab" },
            { "label": ",", "value": "comma" }
        ] as const
    },
    quickSwitcherModifierKey: {
        type: OptionType.SELECT,
        description: "Quick Switcher modifier key",
        options: [
            { "label": "None", "value": "none", default: true },
            { "label": "Ctrl/Cmd", "value": "ctrl" },
            { "label": "Shift", "value": "shift" },
            { "label": "Alt", "value": "alt" }
        ] as const
    },
    createGroupDMKey: {
        type: OptionType.SELECT,
        description: "Create group DM key",
        options: [
            { "label": "Disable keybind", "value": "off" },
            { "label": "A", "value": "a" },
            { "label": "B", "value": "b" },
            { "label": "C", "value": "c" },
            { "label": "D", "value": "d" },
            { "label": "E", "value": "e" },
            { "label": "F", "value": "f" },
            { "label": "G", "value": "g" },
            { "label": "H", "value": "h" },
            { "label": "I", "value": "i" },
            { "label": "J", "value": "j" },
            { "label": "K", "value": "k" },
            { "label": "L", "value": "l" },
            { "label": "M", "value": "m" },
            { "label": "N", "value": "n" },
            { "label": "O", "value": "o" },
            { "label": "P", "value": "p" },
            { "label": "Q", "value": "q" },
            { "label": "R", "value": "r" },
            { "label": "S", "value": "s" },
            { "label": "T", "value": "t", default: true },
            { "label": "U", "value": "u" },
            { "label": "V", "value": "v" },
            { "label": "W", "value": "w" },
            { "label": "X", "value": "x" },
            { "label": "Y", "value": "y" },
            { "label": "Z", "value": "z" },
            { "label": "0", "value": "0" },
            { "label": "1", "value": "1" },
            { "label": "2", "value": "2" },
            { "label": "3", "value": "3" },
            { "label": "4", "value": "4" },
            { "label": "5", "value": "5" },
            { "label": "6", "value": "6" },
            { "label": "7", "value": "7" },
            { "label": "8", "value": "8" },
            { "label": "9", "value": "9" },
            { "label": "Tab", "value": "tab" },
            { "label": ",", "value": "comma" }
        ] as const
    },
    createGroupDMModifierKey: {
        type: OptionType.SELECT,
        description: "Create group DM modifier key",
        options: [
            { "label": "None", "value": "none" },
            { "label": "Ctrl/Cmd", "value": "ctrl" },
            { "label": "Shift", "value": "shift", default: true },
            { "label": "Alt", "value": "alt" }
        ] as const
    },
    switchNextServerKey: {
        type: OptionType.SELECT,
        description: "Switch to next server key",
        options: [
            { "label": "Disable keybind", "value": "off" },
            { "label": "A", "value": "a" },
            { "label": "B", "value": "b" },
            { "label": "C", "value": "c" },
            { "label": "D", "value": "d" },
            { "label": "E", "value": "e" },
            { "label": "F", "value": "f" },
            { "label": "G", "value": "g" },
            { "label": "H", "value": "h" },
            { "label": "I", "value": "i" },
            { "label": "J", "value": "j" },
            { "label": "K", "value": "k" },
            { "label": "L", "value": "l" },
            { "label": "M", "value": "m" },
            { "label": "N", "value": "n" },
            { "label": "O", "value": "o" },
            { "label": "P", "value": "p" },
            { "label": "Q", "value": "q" },
            { "label": "R", "value": "r" },
            { "label": "S", "value": "s" },
            { "label": "T", "value": "t" },
            { "label": "U", "value": "u" },
            { "label": "V", "value": "v" },
            { "label": "W", "value": "w" },
            { "label": "X", "value": "x" },
            { "label": "Y", "value": "y" },
            { "label": "Z", "value": "z" },
            { "label": "0", "value": "0" },
            { "label": "1", "value": "1" },
            { "label": "2", "value": "2" },
            { "label": "3", "value": "3" },
            { "label": "4", "value": "4" },
            { "label": "5", "value": "5" },
            { "label": "6", "value": "6" },
            { "label": "7", "value": "7" },
            { "label": "8", "value": "8" },
            { "label": "9", "value": "9" },
            { "label": "Tab", "value": "tab", default: true },
            { "label": ",", "value": "comma" }
        ] as const
    },
    switchNextServerModifierKey: {
        type: OptionType.SELECT,
        description: "Switch to next server modifier key",
        options: [
            { "label": "None", "value": "none", default: true },
            { "label": "Ctrl/Cmd", "value": "ctrl" },
            { "label": "Shift", "value": "shift" },
            { "label": "Alt", "value": "alt" }
        ] as const
    },
    switchPreviousServerKey: {
        type: OptionType.SELECT,
        description: "Switch to previous server key",
        options: [
            { "label": "Disable keybind", "value": "off" },
            { "label": "A", "value": "a" },
            { "label": "B", "value": "b" },
            { "label": "C", "value": "c" },
            { "label": "D", "value": "d" },
            { "label": "E", "value": "e" },
            { "label": "F", "value": "f" },
            { "label": "G", "value": "g" },
            { "label": "H", "value": "h" },
            { "label": "I", "value": "i" },
            { "label": "J", "value": "j" },
            { "label": "K", "value": "k" },
            { "label": "L", "value": "l" },
            { "label": "M", "value": "m" },
            { "label": "N", "value": "n" },
            { "label": "O", "value": "o" },
            { "label": "P", "value": "p" },
            { "label": "Q", "value": "q" },
            { "label": "R", "value": "r" },
            { "label": "S", "value": "s" },
            { "label": "T", "value": "t" },
            { "label": "U", "value": "u" },
            { "label": "V", "value": "v" },
            { "label": "W", "value": "w" },
            { "label": "X", "value": "x" },
            { "label": "Y", "value": "y" },
            { "label": "Z", "value": "z" },
            { "label": "0", "value": "0" },
            { "label": "1", "value": "1" },
            { "label": "2", "value": "2" },
            { "label": "3", "value": "3" },
            { "label": "4", "value": "4" },
            { "label": "5", "value": "5" },
            { "label": "6", "value": "6" },
            { "label": "7", "value": "7" },
            { "label": "8", "value": "8" },
            { "label": "9", "value": "9" },
            { "label": "Tab", "value": "tab", default: true },
            { "label": ",", "value": "comma" }
        ] as const
    },
    switchPreviousServerModifierKey: {
        type: OptionType.SELECT,
        description: "Switch to previous server modifier key",
        options: [
            { "label": "None", "value": "none" },
            { "label": "Ctrl/Cmd", "value": "ctrl" },
            { "label": "Shift", "value": "shift", default: true },
            { "label": "Alt", "value": "alt" }
        ] as const
    },
    switchServersFrom1To9Key: {
        type: OptionType.SELECT,
        description: "Switch from 1st to 9th servers key",
        options: [
            { "label": "Disable keybind", "value": "off" },
            { "label": "1 to 9", "value": "1to9", default: true }
        ] as const
    },
    switchServersFrom1To9MModifierKey: {
        type: OptionType.SELECT,
        description: "Switch from 1st to 9th servers modifier key",
        options: [
            { "label": "None", "value": "none", default: true },
            { "label": "Ctrl/Cmd", "value": "ctrl" },
            { "label": "Shift", "value": "shift" },
            { "label": "Alt", "value": "alt" }
        ] as const
    },
    openUserProfileKey: {
        type: OptionType.SELECT,
        description: "Open user profile key",
        options: [
            { "label": "Disable keybind", "value": "off" },
            { "label": "A", "value": "a" },
            { "label": "B", "value": "b" },
            { "label": "C", "value": "c" },
            { "label": "D", "value": "d" },
            { "label": "E", "value": "e" },
            { "label": "F", "value": "f" },
            { "label": "G", "value": "g" },
            { "label": "H", "value": "h" },
            { "label": "I", "value": "i" },
            { "label": "J", "value": "j" },
            { "label": "K", "value": "k" },
            { "label": "L", "value": "l" },
            { "label": "M", "value": "m" },
            { "label": "N", "value": "n" },
            { "label": "O", "value": "o" },
            { "label": "P", "value": "p" },
            { "label": "Q", "value": "q" },
            { "label": "R", "value": "r" },
            { "label": "S", "value": "s" },
            { "label": "T", "value": "t" },
            { "label": "U", "value": "u" },
            { "label": "V", "value": "v" },
            { "label": "W", "value": "w" },
            { "label": "X", "value": "x" },
            { "label": "Y", "value": "y" },
            { "label": "Z", "value": "z" },
            { "label": "0", "value": "0" },
            { "label": "1", "value": "1" },
            { "label": "2", "value": "2" },
            { "label": "3", "value": "3" },
            { "label": "4", "value": "4" },
            { "label": "5", "value": "5" },
            { "label": "6", "value": "6" },
            { "label": "7", "value": "7" },
            { "label": "8", "value": "8" },
            { "label": "9", "value": "9" },
            { "label": "Tab", "value": "tab" },
            { "label": ",", "value": "comma", default: true }
        ] as const
    },
    openUserProfileModifierKey: {
        type: OptionType.SELECT,
        description: "Open user profile modifier key",
        options: [
            { "label": "None", "value": "none", default: true },
            { "label": "Ctrl/Cmd", "value": "ctrl" },
            { "label": "Shift", "value": "shift" },
            { "label": "Alt", "value": "alt" }
        ] as const
    },
});

const KeyBinds = findByPropsLazy("JUMP_TO_GUILD", "SERVER_NEXT");

export default definePlugin({
    name: "WebKeybinds",
    description: "Re-adds keybinds missing in the web version of Discord: ctrl+t, ctrl+shift+t, ctrl+tab, ctrl+shift+tab, ctrl+1-9, ctrl+,. Only works fully on Vesktop/ArmCord, not inside your browser",
    authors: [Devs.Ven],
    settings,
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
                const handler = e.shiftKey ? KeyBinds.SERVER_PREV : KeyBinds.SERVER_NEXT;
                handler.action(e);
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
