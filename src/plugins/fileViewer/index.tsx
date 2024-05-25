/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { filters,findBulk } from "@webpack";
import { Alerts } from "@webpack/common";

interface ClassesType {
    attachment?: string;
    metadata?: string;
    scrollerInner?: string;
    fileNameLink?: string;
    layerContainer?: string;
    chat?: string;
    downloadButton?: string;
}
const Classes: ClassesType = {};
const callback = (mutationList, observer) => {
    for (const mutation of mutationList) {
        if (mutation.type === "childList" && mutation.target && document.body.contains(chatContainer)) {
            const messages = chatContainer.querySelector(`.${Classes.scrollerInner}`);
            const attachments = messages.querySelectorAll(`.${Classes.attachment}`);

            for (const message of attachments) {
                if (message.querySelector("#fileView")) continue;

                const fileLink = message.querySelector(`.${Classes.fileNameLink}`).getAttribute("href");
                const fileSize = message.querySelector(`.${Classes.metadata}`).textContent;

                let matchedType;

                for (const [type, extensions] of Object.entries(extensionTypes)) {
                    if (extensions.some(extension => new URL(fileLink).pathname.toLowerCase().endsWith(extension))) {
                        matchedType = type;
                        break;
                    }
                }

                if (!matchedType) continue;

                const parseFileSize = fileSizeText => {
                    const sizeRegex = /([\d.]+)\s*(MB|KB)/i;
                    const match = sizeRegex.exec(fileSizeText);

                    if (!match) return 0;

                    const size = parseFloat(match[1]);
                    const unit = match[2].toUpperCase();

                    if (unit === "MB") {
                        return size * 1024 * 1024;
                    } else if (unit === "KB") {
                        return size * 1024;
                    }

                    return 0;
                };

                const fileSizeBytes = parseFileSize(fileSize);

                if (fileSizeBytes > 10 * 1024 * 1024) {
                    message.appendChild(createWarningButton());
                    continue;
                }

                message.appendChild(createViewButton(fileLink, fileSize, matchedType, message));
            }
        }
        else if (!document.body.contains(chatContainer)) {
            chatContainer = null;
            observer.disconnect();

            setInterval(id => {
                if (!chatContainer) {
                    chatContainer = document.querySelector(`.${Classes.chat}`);
                } else {
                    observer.observe(chatContainer, { childList: true, subtree: true });
                    clearInterval(id);
                }
            }, 200);
        }
    }
};

const extensionTypes = {
    office: ["ppt", "pptx", "doc", "docx", "xls", "xlsx", "odt"],
    google: ["pdf"],
    object: ["stl", "obj", "vf", "vsj", "vsb", "3mf"]
};

const extensionTypeLinks = {
    office: url => `https://view.officeapps.live.com/op/view.aspx?src=${url}&amp;wdStartOn=1&amp;wdEmbedCode=0&amp;wdPrint=0`,
    google: url => `https://drive.google.com/viewerng/viewer?embedded=true&url=${url}`,
    object: url => `https://www.viewstl.com/?embedded&noborder=yes&bgcolor=transparent&url=${url}`
};

function createWarningButton(){
    const div = document.createElement("div");
    div.id = "fileView";
    div.style.color = "var(--interactive-normal)";
    div.style.cursor = "pointer";
    div.innerHTML = WarningIcon;
    div.addEventListener("click", event => {
        Alerts.show({
            title: "File Viewer",
            body: (
                <div>
                    <p>File is too large.</p>
                </div>
            ),
            confirmText: "Okay!",
        });
    });
    return div;
}

function createViewButton(url, size, type, message) {
    const div = document.createElement("div");
    div.id = "fileView";
    div.style.color = "var(--interactive-normal)";
    div.style.cursor = "pointer";
    div.setAttribute("aria-label", "View file");
    div.innerHTML = ShowIcon;

    div.addEventListener("click", event => {
        event.stopPropagation();
        const element = event.currentTarget as HTMLElement;
        if (!element) return;

        if (element.classList.contains("fv-expanded")) {
            message.removeChild(message.querySelector("#fv-frame"));
            element.classList.remove("fv-expanded");
        } else {
            message.appendChild(createIframe(extensionTypeLinks[type](encodeURIComponent(url)), type));
            element.classList.add("fv-expanded");
        }

        element.innerHTML = !element.classList.contains("fv-expanded") ? ShowIcon : HideIcon;
    });

    return div;
}

function createIframe(url, type) {
    const frame = document.createElement("iframe");
    frame.id = "fv-frame";
    frame.src = url;
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
    frame.frameBorder = "0";
    frame.width = "100%";
    frame.height = type === "object" ? "300px" : "390px";
    const styles = {
        resize: "both",
        overflow: "auto",
        padding: "10px",
        maxWidth: type === "object" ? "300px" : "500px",
        minWidth: "317px",
        maxHeight: type === "object" ? "370px" : "80vh",
        minHeight: "50px",
        borderRadius: "20px"
    };

    Object.assign(frame.style, styles);

    return frame;
}

const observer = new MutationObserver(callback);
let chatContainer;

export default definePlugin({
    name: "File Viewer",

    description: "View files in discord, such as .pdf, .doc, .docx, .obj, etc",

    authors: [Devs.JokerJosh],

    patches: [],

    start() {
        Object.assign(Classes, ...findBulk.apply(null, [filters.byProps("attachment", "metadata"), filters.byProps("scrollerInner"), filters.byProps("fileNameLink"), filters.byProps("layerContainer"), filters.byProps("chat")]));

        setInterval(id => {
            if (!chatContainer) {
                chatContainer = document.querySelector(`.${Classes.chat}`);
            } else {
                observer.observe(chatContainer, { childList: true, subtree: true });
                clearInterval(id);
            }
        }, 200);
    },

    stop() {
        observer.disconnect();
    }
});

const buildIcon = (color, viewBox, path) => `
    <svg class="${Classes.downloadButton}" aria-hidden="true" role="img" width="24" height="24" viewBox="${viewBox}">
        <path fill="${color}" d="${path}"></path>
    </svg>
`;

const ICON_PATHS = {
    show: "M113,37.66667c-75.33333,0 -103.58333,75.33333 -103.58333,75.33333c0,0 28.25,75.33333 103.58333,75.33333c75.33333,0 103.58333,-75.33333 103.58333,-75.33333c0,0 -28.25,-75.33333 -103.58333,-75.33333zM113,65.91667c25.99942,0 47.08333,21.08392 47.08333,47.08333c0,25.99942 -21.08392,47.08333 -47.08333,47.08333c-25.99942,0 -47.08333,-21.08392 -47.08333,-47.08333c0,-25.99942 21.08392,-47.08333 47.08333,-47.08333zM113,84.75c-15.60204,0 -28.25,12.64796 -28.25,28.25c0,15.60204 12.64796,28.25 28.25,28.25c15.60204,0 28.25,-12.64796 28.25,-28.25c0,-15.60204 -12.64796,-28.25 -28.25,-28.25z",
    hide: "M37.57471,28.15804c-3.83186,0.00101 -7.28105,2.32361 -8.72295,5.87384c-1.4419,3.55022 -0.58897,7.62011 2.15703,10.29267l16.79183,16.79183c-18.19175,14.60996 -29.9888,32.52303 -35.82747,43.03711c-3.12633,5.63117 -3.02363,12.41043 0.03678,18.07927c10.87625,20.13283 42.14532,66.10058 100.99007,66.10058c19.54493,0 35.83986,-5.13463 49.36394,-12.65365l19.31152,19.31152c2.36186,2.46002 5.8691,3.45098 9.16909,2.5907c3.3,-0.86028 5.87708,-3.43736 6.73736,-6.73736c0.86028,-3.3 -0.13068,-6.80724 -2.5907,-9.16909l-150.66666,-150.66667c-1.77289,-1.82243 -4.20732,-2.8506 -6.74984,-2.85075zM113,37.66667c-11.413,0 -21.60375,1.88068 -30.91683,4.81869l24.11182,24.11182c2.23175,-0.32958 4.47909,-0.6805 6.80501,-0.6805c25.99942,0 47.08333,21.08392 47.08333,47.08333c0,2.32592 -0.35092,4.57326 -0.6805,6.80501l32.29623,32.29623c10.1135,-11.22467 17.51573,-22.61015 21.94157,-30.18115c3.3335,-5.68767 3.32011,-12.67425 0.16553,-18.4655c-11.00808,-20.27408 -42.2439,-65.78792 -100.80615,-65.78792zM73.77002,87.08577l13.77555,13.77556c-1.77707,3.67147 -2.79557,7.77466 -2.79557,12.13867c0,15.60342 12.64658,28.25 28.25,28.25c4.364,0 8.46719,-1.01851 12.13867,-2.79557l13.79395,13.79395c-9.356,6.20362 -21.03043,9.17606 -33.4733,7.24642c-19.75617,-3.06983 -35.88427,-19.19794 -38.9541,-38.9541c-1.92879,-12.43739 1.0665,-24.10096 7.26481,-33.45491z",
    warning: "M305.095,229.104L186.055,42.579c-6.713-10.52-18.172-16.801-30.652-16.801c-12.481,0-23.94,6.281-30.651,16.801L5.711,229.103c-7.145,11.197-7.619,25.39-1.233,37.042c6.386,11.647,18.604,18.883,31.886,18.883h238.079c13.282,0,25.5-7.235,31.888-18.886C312.714,254.493,312.24,240.301,305.095,229.104z M155.403,253.631c-10.947,0-19.82-8.874-19.82-19.82c0-10.947,8.874-19.821,19.82-19.821c10.947,0,19.82,8.874,19.82,19.821C175.223,244.757,166.349,253.631,155.403,253.631z M182.875,115.9l-9.762,65.727c-1.437,9.675-10.445,16.353-20.119,14.916c-7.816-1.161-13.676-7.289-14.881-14.692l-10.601-65.597c-2.468-15.273,7.912-29.655,23.185-32.123c15.273-2.468,29.655,7.912,32.123,23.185C183.284,110.192,183.268,113.161,182.875,115.9z"
};

const ShowIcon = buildIcon("currentColor", "0 0 226 226", ICON_PATHS.show);
const HideIcon = buildIcon("currentColor", "0 0 226 226", ICON_PATHS.hide);
const WarningIcon = buildIcon("currentColor", "0 0 310.806 310.806", ICON_PATHS.warning);
