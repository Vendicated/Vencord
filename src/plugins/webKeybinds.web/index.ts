/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
                SettingsRouter.openUserSettings("my_account_panel");
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
