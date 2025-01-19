/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function onKeyDown(e: KeyboardEvent) {
    if (e.key == ';' && e.ctrlKey) {
        const btn = <HTMLButtonElement | null> document.querySelector('div[class^=jumpButton]');
        if (btn) btn.click();
    }
};

export default definePlugin({
    name: "InboxJumpKeybind",
    description: "Adds a keybind (Ctrl + semicolon) for that tiny jump button in the inbox",
    authors: [Devs.arutonee],

    start() {
        document.addEventListener("keydown", onKeyDown);
    },
    stop() {
        document.removeEventListener("keydown", onKeyDown);
    },
});
