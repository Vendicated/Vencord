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

import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";


const settings = definePluginSettings({
    limitTo: {
        type: OptionType.SELECT,
        description: "Allow middle click pastes:",
        options: [
            {
                label: "Whenever a text box is active",
                value: "active",
                default: true
            },
            {
                label: "Only when clicking on a text box",
                value: "direct"
            }
        ]
    },
    reenableDelay: {
        type: OptionType.SLIDER,
        description: "Milliseconds until re-enabling global paste events after middle click.",
        markers: makeRange(0, 1000, 100),
        default: 500,
    },
});

let containerEl;

export default definePlugin({
    name: "LimitMiddleClickPaste",
    description: "For middle-click autoscroll users, prevents middle-click from making unwanted pastes.",
    authors: [],

    settings: settings,

    start() {
        // Discord adds it's paste listeners to #app-mount. We can intercept them
        // by attaching listeners a child element.
        containerEl = document.querySelector("[class^=appAsidePanelWrapper]")!;
        containerEl.addEventListener("mousedown", disablePasteOnMousedown);
        containerEl.addEventListener("paste", blockPastePropogation);
    },

    stop() {
        containerEl.addEventListener("mousedown", disablePasteOnMousedown);
        containerEl.removeEventListener("paste", blockPastePropogation);
        pasteDisabled = false;
    },
});

let pasteDisabled: boolean = false;
let timeoutID: number | undefined;

function blockPastePropogation(e: ClipboardEvent) {
    if (pasteDisabled) {
        e.stopImmediatePropagation();
    }
}

function disablePasteOnMousedown(e: MouseEvent) {
    if (e.button !== 1) return;
    let testEl;
    switch (settings.store.limitTo) {
        case "active":
            testEl = document.activeElement;
            break;
        case "direct":
            testEl = e.target;
            break;
    }
    if (maybeEditable(testEl as HTMLElement | null)) return;
    window.clearTimeout(timeoutID);
    pasteDisabled = true;
    timeoutID = window.setTimeout(() => {
        pasteDisabled = false;
    }, settings.store.reenableDelay);
}

function maybeEditable(el: HTMLElement | null): boolean {
    if (!el) return false;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
    let parent: HTMLElement | null;
    for (parent = el; parent; parent = parent.parentElement) {
        if (parent.isContentEditable) return true;
    }
    return false;
}
