/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { settings } from "./settings"

export default definePlugin({
    name: "Fake avatar decoration",
    description: "Fake user avatar decoration",
    authors: [Devs.Bduidan],
    settings,

    start() {
        init();
    }
});

function init() {
    // c19a55
    update("avatar_c19a55", (el) => {
        fetch(`https://vcfad.vercel.app/avatarDecoration/${(el as HTMLImageElement).src.split("/")[4]}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 0) {
                    const newDecoration = document.createElement('img');
                    newDecoration.className = "avatarDecoration_c19a55";
                    newDecoration.ariaHidden = "true";
                    newDecoration.src = `${data.url}`;

                    if (el.parentNode) {
                        el.parentNode.insertBefore(newDecoration, el.nextSibling);
                    }
                }
            })
    });

    // 44b0c
    update("wrapper__44b0c", (el) => {
        fetch(`https://vcfad.vercel.app/avatarDecoration/${(el.querySelector('.avatar__44b0c') as HTMLImageElement).src.split("/")[4]}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 0) {
                    const newDecoration = document.createElement('svg');
                    newDecoration.setAttribute("width", "108");
                    newDecoration.setAttribute("height", "96");
                    newDecoration.setAttribute("viewBox", "0 0 108 96");
                    newDecoration.className = "avatarDecoration__44b0c";
                    newDecoration.ariaHidden = "true";
                    newDecoration.innerHTML = `<foreignObject x="0" y="0" width="96" height="96" mask="url(#svg-mask-avatar-decoration-status-round-80)">
                                                <div class="avatarStack__44b0c"><img class="avatar__44b0c" alt=" " aria-hidden="true" src="${data.url}" as="image">
                                                </div></foreignObject>`;

                    el.appendChild(newDecoration);
                }
            })
    })
}

function update(cl, callback: (el: Element) => void) {
    const observer = new MutationObserver((mtl) => {
        mtl.forEach((mt) => {
            mt.addedNodes.forEach((nd) => {
                if (!(nd instanceof Element)) {
                    return;
                }

                if (nd.classList.contains(`${cl}`)) {
                    callback(nd);
                }

                nd.querySelectorAll?.(`.${cl}`).forEach((el) => {
                    callback(el);
                })
            })
            if (mt.type === "attributes" && (mt.target instanceof Element) && 
                mt.target.classList.contains(`${cl}`)) {
                callback(mt.target);
            }
        })
    })

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
    })
}
