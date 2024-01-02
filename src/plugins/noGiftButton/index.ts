/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

const STYLE_ELEMENT_ID = "551041413043978242-removeGiftButton";

export default definePlugin({
    name: "NoGiftButton",
    description: "Removes the gift button in the message bar",
    authors: [{
        id: 551041413043978242n,
        name: "sin",
    }],
    patches: [],
    start() {
        console.log("[removeGiftButton] plugin start called");

        const buttonsToHide = ["Send a gift", "Boost this server"];
        let css = "";

        for (const button of buttonsToHide) {
            css = css.concat(`[aria-label="${button}"]{display:none}`);
        }
        css = css.concat('[id="channel-attach-THREAD"]{display:none}');

        const style = document.createElement("style");
        style.innerHTML = css;
        style.id = STYLE_ELEMENT_ID;
        document.body.appendChild(style);
    },
    stop() {
        console.log("[removeGiftButton] plugin stop called");

        const styleElement = document.querySelector(`[id="${STYLE_ELEMENT_ID}"]`);
        if (styleElement) {
            styleElement.remove();
        } else {
            console.error("[removeGiftButton] Style element is null");
            throw new Error("Style element is null");
        }
    },
});
