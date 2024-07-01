/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "registerDate",
    description: "",
    authors: [Devs.Syirezz],
    start() {
        function convertChatIdToUnixTime(id: string) {
            console.log(`Converting ID: ${id}`);

            // Convert the ID to BigInt
            const bigIntId = BigInt(id);
            console.log(`BigInt ID: ${bigIntId}`);

            // Extract the first 42 bits
            const timestamp = bigIntId >> 22n;
            console.log(`Extracted timestamp (in ms): ${timestamp}`);

            // Add Discord epoch (+1420070400000)
            const discordEpoch = 1420070400000n; // 1 January 2015 in milliseconds
            const unixTime = timestamp + discordEpoch;
            console.log(`Combined Unix Timestamp (in ms): ${unixTime}`);

            // Convert to JavaScript date (from ms to date)
            const date = new Date(Number(unixTime));
            console.log(`Converted to date: ${date.toLocaleDateString()}`);

            return date;
        }

        if (document.URL !== this.currentUrl) {
            const observer = new MutationObserver(() => {
                const url = document.URL;
                if (this.currentUrl !== url) {
                    this.currentUrl = url;
                    this.run();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        async function run() {
            const url = document.URL.split("/");
            const id = url[url.length - 1];
            const registrationBlock = document.getElementsByClassName("defaultColor_a595eb text-sm/normal_dc00ef body_c4a579")[0] || document.getElementsByClassName("defaultColor_a595eb text-sm/normal_dc00ef")[0];

            console.log(`URL: ${document.URL}`);
            console.log(`User ID: ${id}`);

            if (registrationBlock) {
                const date = convertChatIdToUnixTime(id);
                const div = document.querySelector("#app-mount > div.appAsidePanelWrapper_bd26cc > div.notAppAsidePanel_bd26cc > div.app_bd26cc > div > div.layers_d4b6c5.layers_a01fb1 > div > div > div > div > div.chat_a7d72e > div.content_a7d72e > div > div > div > div.body_e9e42f > div.overlayBackground_c69a7b.overlay_e9e42f > section:nth-child(2)");

                if (div) {
                    const element = document.createElement("h2");
                    element.className = "defaultColor_a595eb text-sm/normal_dc00ef";
                    element.innerHTML = `<b>Chat creation Date:</b> <br>${date.toLocaleDateString()} | ${date.toLocaleTimeString()}`;
                    element.setAttribute("data-text-variant", "text-sm/normal");
                    div.appendChild(element);
                }
            }
        }
        this.run = run.bind(this);
    }
});
