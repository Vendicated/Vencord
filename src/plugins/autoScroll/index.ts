/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

/*
 * Original work: Paul Chapman and programmerpony
 * <https://github.com/hackermare/BD-AutoScroll>
 *
 * This program was modified for a purpose of compatibility for Vencord
 * and is a derivative work based on the following license:
 *
 *              -- X11/MIT License --
 *
 * Copyright © 2010-2018 Paul Chapman <pcxunlimited@gmail.com>
 * Copyright © 2022-2023 programmerpony <programmerpony@riseup.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

interface IState {
    timeout?: number,
    oldX?: number,
    oldY?: number,
    dirX: number,
    dirY: number,
    click: boolean,
    scrolling: boolean;
}

interface IScrollNormal {
    element: HTMLElement,
    scroller: HTMLElement,
    width: boolean,
    height: boolean,
    root: boolean;
}

let htmlNode: HTMLElement;
let bodyNode: HTMLElement;
const state: IState = {
    timeout: undefined,
    oldX: undefined,
    oldY: undefined,
    dirX: 0,
    dirY: 0,
    click: false,
    scrolling: false
};
let outer: HTMLElement;
let inner: HTMLElement;
const math = {
    hypot: (x: number, y: number) => {
        return Math.sqrt(x * x + y * y);
    },
    max: (num: number, cap: number) => {
        const neg = cap * -1;
        return (num > cap ? cap : (num < neg ? neg : num));
    },
    angle: (x: number, y: number) => {
        let angle = Math.atan(y / x) / (Math.PI / 180);
        if (x < 0) {
            angle += 180;
        } else if (y < 0) {
            angle += 360;
        }
        return angle;
    }
};


export const settings = definePluginSettings({
    onlyScrollVertically: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Disables horizontal scrolling. Might fix some unexpected behaviour."
    },
    sameSpeed: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Don't change speed based on the position of the cursor."
    },
    speed: {
        type: OptionType.SLIDER,
        description: "Move Speed",
        markers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        default: 10,
        componentProps: {
            stickToMarkers: true
        }
    }
});

export default definePlugin({
    name: "AutoScroll",
    description: "Autoscroll with the mouse wheel button on GNU/Linux and macOS!",
    authors: [
        {
            id: 557599092931559447n,
            name: "PavelDobCZ23",
        },
        {
            id: 0n,
            name: "programmerpony"
        },
        {
            id: 0n,
            name: "Paul Chapman",
        }
    ],
    patches: [],
    start: async () => {
        htmlNode = document.documentElement;
        bodyNode = document.body ? document.body : htmlNode;
        outer = document.createElement("auto-scroll");
        const shadow = outer.attachShadow({ mode: "closed" });
        inner = document.createElement("div");
        inner.style.setProperty("transform", "translateZ(0)");
        inner.style.setProperty("display", "none");
        inner.style.setProperty("position", "fixed");
        inner.style.setProperty("left", "0px");
        inner.style.setProperty("top", "0px");
        inner.style.setProperty("width", "100%");
        inner.style.setProperty("height", "100%");
        inner.style.setProperty("z-index", "2147483647");
        inner.style.setProperty("background-repeat", "no-repeat");
        shadow.appendChild(inner);
        htmlNode.appendChild(outer);
        addEventListener("mousedown", mouseListener, true);
    },
    stop: () => {
        outer.remove();
        removeEventListener("mousedown", mouseListener, true);
    },
    settings
});

const mouseListener = (event: MouseEvent) => {
    if (state.scrolling) stopEvent(event, true);
    else {
        const path = event.composedPath();
        if (!path.length) return;
        const target = path[0];
        if ((event.button === 1 || (event.button === 0 && (event.ctrlKey || event.metaKey))) && event.clientX < htmlNode.clientWidth && event.clientY < htmlNode.clientHeight && isValid(target)) {
            const element = findScroll(target);
            if (element == null) return;
            stopEvent(event, true);
            show(element, event.clientX, event.clientY);
        }
    }
};

function isValid(element: EventTarget | null) {
    while (true) {
        if (element == null) return false;
        else if (element === document || element === htmlNode || element === bodyNode) return true;
        else if (element instanceof ShadowRoot) element = element.host;
        else if (isInvalid(element)) return false;
        else if (element instanceof Node) element = element.parentNode;
    }
}

function isInvalid(element: EventTarget) {
    if (!(element instanceof HTMLElement)) return true;
    return (
        element.isContentEditable ||
        (element.localName === "a" && element.getAttribute("href")) ||
        (element.localName === "area" && element.getAttribute("href")) ||
        (element.localName === "textarea" && isEditableText(element)) ||
        (element.localName === "input" && isEditableText(element))
    );
}

function isEditableText(element: HTMLElement) {
    return !(
        element.getAttribute("disabled") || element.getAttribute("readOnly")
    );
}

function findScroll(element: EventTarget | null) {
    while (element !== htmlNode && element !== bodyNode) {
        if (element == null || !(element instanceof HTMLElement)) return undefined;
        if (element instanceof ShadowRoot) {
            element = element.host;
            continue;
        }
        const scrollNormal = findScrollNormal(element);
        if (scrollNormal != null) return scrollNormal;
        element = element.parentNode;
    }
}

function findScrollNormal(element: HTMLElement): IScrollNormal | undefined {
    const style = getComputedStyle(element);
    const width = canScroll(style.overflowX) && element.scrollWidth > element.clientWidth;
    const height = canScroll(style.overflowY) && element.scrollHeight > element.clientHeight;
    return (width || height) ? {
        element: element,
        scroller: element,
        width: width,
        height: height,
        root: false
    } : undefined;
}

function canScroll(style: string) {
    return style === "auto" || style === "scroll";
}

function stopEvent(event: Event, preventDefault: boolean) {
    event.stopImmediatePropagation();
    event.stopPropagation();
    if (preventDefault) event.preventDefault();
}

function getImageUrl(scrollNormal: IScrollNormal) {
    if (scrollNormal.width && scrollNormal.height)
        return "https://raw.githubusercontent.com/PavelDobCZ23/Vencord/main/src/plugins/autoScroll/img/both.svg";
    else if (scrollNormal.width)
        return "https://raw.githubusercontent.com/PavelDobCZ23/Vencord/main/src/plugins/autoScroll/img/horizontal.svg";
    else
        return "https://raw.githubusercontent.com/PavelDobCZ23/Vencord/main/src/plugins/autoScroll/img/vertical.svg";
}

function direction(x: number, y: number) {
    const angle = math.angle(x, y);
    if (angle < 30 || angle >= 330) return "e-resize";
    if (angle < 60) return "se-resize";
    if (angle < 120) return "s-resize";
    if (angle < 150) return "sw-resize";
    if (angle < 210) return "w-resize";
    if (angle < 240) return "nw-resize";
    if (angle < 300) return "n-resize";
    return "ne-resize";
}

function startCycle(elemeent: HTMLElement, scroller: Element, root: boolean) {
    let scrollX = root ? window.scrollX : scroller.scrollLeft, scrollY = root ? window.scrollY : scroller.scrollTop;
    function loop() {
        state.timeout = requestAnimationFrame(loop);
        const scrollWidth = scroller.scrollWidth - elemeent.clientWidth;
        const scrollHeight = scroller.scrollHeight - elemeent.clientHeight;
        scrollX += state.dirX;
        scrollY += state.dirY;
        if (scrollX < 0) scrollX = 0;
        else if (scrollX > scrollWidth) scrollX = scrollWidth;
        if (scrollY < 0) scrollY = 0;
        else if (scrollY > scrollHeight) scrollY = scrollHeight;
        if (root) window.scroll(settings.store.onlyScrollVertically ? window.scrollX : scrollX, scrollY);
        else {
            if (!settings.store.onlyScrollVertically) scroller.scrollLeft = scrollX;
            scroller.scrollTop = scrollY;
        }
    }
    loop();
}

function shouldSticky(x: number, y: number) {
    return math.hypot(x, y) < 10;
}

function scale(value: number) {
    const speed = settings.store.speed || 10;
    return value / (21 - speed);
}

function mousewheel(event: MouseEvent) {
    stopEvent(event, true);
}

function mousemove(event: MouseEvent) {
    stopEvent(event, true);
    let x = event.clientX - (state.oldX ?? 0);
    let y = event.clientY - (state.oldY ?? 0);
    if (math.hypot(x, y) > 10) {
        inner.style.setProperty("cursor", direction(x, y));
        if (settings.store.sameSpeed) {
            x = math.max(x, 1) * 50;
            y = math.max(y, 1) * 50;
        }
        x = scale(x);
        y = scale(y);
        state.dirX = x;
        state.dirY = y;
    } else {
        normalCursor();
        state.dirX = 0;
        state.dirY = 0;
    }
}

function mouseup(event: MouseEvent) {
    stopEvent(event, true);
    const x = event.clientX - (state.oldX ?? 0), y = event.clientY - (state.oldY ?? 0);
    if (state.click || !shouldSticky(x, y)) unclick();
    else state.click = true;
}

function unclick() {
    if (state.timeout) cancelAnimationFrame(state.timeout);
    state.timeout = undefined;

    removeEventListener("wheel", mousewheel, true);
    removeEventListener("mousemove", mousemove, true);
    removeEventListener("mouseup", mouseup, true);

    normalCursor();

    inner.style.removeProperty("background-image");
    inner.style.removeProperty("background-position");
    inner.style.setProperty("display", "none");

    state.oldX = undefined;
    state.oldY = undefined;

    state.dirX = 0;
    state.dirY = 0;

    state.click = false;
    state.scrolling = false;
}

function normalCursor() {
    inner.style.removeProperty("cursor");
}

function show(scrollNormal: IScrollNormal, x: number, y: number) {
    state.scrolling = true;
    state.oldX = x;
    state.oldY = y;
    startCycle(scrollNormal.element, scrollNormal.scroller, scrollNormal.root);

    addEventListener("wheel", mousewheel, true);
    addEventListener("mousemove", mousemove, true);
    addEventListener("mouseup", mouseup, true);

    inner.style.setProperty("background-image", `url('${getImageUrl(scrollNormal)}')`);
    inner.style.setProperty("background-position", `${x - 13}px ${y - 13}px`);
    inner.style.removeProperty("display");
}
