/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function onMouseUp(e: MouseEvent) {
    // middle button/mouse wheel click
    if (e.button === 1) {
        e.preventDefault();
    }
}

export default definePlugin({
    name: "DisableMiddlePaste",
    description: "Disables middle-click paste on Linux so you don't accidentally paste things into the message box.",
    authors: [Devs.Darxoon],

    start() {
        window.addEventListener("mouseup", onMouseUp);
    },

    stop() {
        window.removeEventListener("mouseup", onMouseUp);
    },
});
