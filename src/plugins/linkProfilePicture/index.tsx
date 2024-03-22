/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


function LinkProfilePicture({ target }) {
    if (target.classList.contains("avatar__445f3") && target.parentElement?.parentElement?.classList.contains("header__7da4f")) {
        window.open(target.querySelector("img").src.replace(/\?.*$/, "?quality=lossless&size=4096"), "_blank");
    }
}

export default definePlugin({
    name: "LinkProfilePicture",
    description: "Lets you click users' avatars on their profile page to view a bigger version in your browser.",
    authors: [Devs.Loukios],
    start() {
        document.addEventListener("click", LinkProfilePicture, true);
    },
    stop() {
        document.removeEventListener.bind(document, "click", LinkProfilePicture, true);
    }
});
