/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

export default definePlugin({
    name: "DisplayFileNames",
    description: "Displays the file name of any file (preview) directly above it",
    authors: [{ name: "SirReGa", id: 542001682255708191n }],
});

document.addEventListener("click", async event => {
    const target = event.target as HTMLAnchorElement;
    const href = target?.href;
    if (!href) return;

    const attachments = href.split("/").pop();
    const fileName = attachments?.split("?")[0];
    const fileNameDisplay = document.createElement("p");
    fileNameDisplay.style.color = "white";
    fileNameDisplay.innerText = fileName ?? "";

    function waitForElement(selector) {
        return new Promise(resolve => {
            const existingElement = document.querySelector(selector);
            if (existingElement) {
                return resolve(existingElement);
            }

            const observer = new MutationObserver(mutations => {
                const element = document.querySelector(selector);
                console.log(element);
                if (element) {
                    observer.disconnect();
                    return resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    waitForElement(".topBar__6088c").then(element => {
        const topBar = element as HTMLDivElement;
        const author = document.getElementsByClassName("author__6088c")[0];
        topBar.insertBefore(fileNameDisplay, author.nextSibling);
    });
});
