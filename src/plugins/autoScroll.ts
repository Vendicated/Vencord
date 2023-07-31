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
 * Forked from: https://github.com/hackermare/BD-AutoScroll
 *
 * Copyright © 2010-2018 Paul Chapman <pcxunlimited@gmail.com>
 * Copyright © 2022-2023 programmerpony <programmerpony@riseup.net>
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const state: AutoScrollState = {
    timeout: -1,
    oldX: null,
    oldY: null,
    dirX: 0,
    dirY: 0,
    click: false,
    scrolling: false
};

let htmlNode: HTMLElement;
let bodyNode: HTMLElement;
let outer: HTMLElement;
let inner: HTMLElement;

const settings = definePluginSettings({
    speed: {
        type: OptionType.SLIDER,
        description: "Auto scroll speed",

        stickToMarkers: false,
        markers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        default: 17,
    },
    onlyScrollVertically: {
        type: OptionType.BOOLEAN,
        description: "Useful if you're having problems with themes.",
        default: false
    }
});

export default definePlugin({
    name: "AutoScroll",
    description: "Autoscroll using the mouse wheel button on GNU/Linux and macOS",
    authors: [Devs.Walcriz],
    settings,

    start() {
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
        document.addEventListener("mousedown", onMouseDown);
    },

    end() {
        outer.remove();
        document.removeEventListener("mousedown", onMouseDown);
    }
});

function onMouseDown(event: MouseEvent) {
    if (state.scrolling) {
        stopEvent(event, true);
        return;
    }

    const path = event.composedPath();
    const target = (path.length === 0 ? null : path[0]);
    const element = target as HTMLElement;
    if (target != null && ((event.button === 1 && true)) && event.clientX < htmlNode.clientWidth && event.clientY < htmlNode.clientHeight && isValid(element)) {
        const scrollNormal = findScroll(element as Node, element);

        if (scrollNormal !== null) {
            stopEvent(event, true);
            show(scrollNormal, event.clientX, event.clientY);
        }
    }
}

function stopEvent(event: Event, preventDefault: boolean) {
    event.stopImmediatePropagation();
    event.stopPropagation();
    if (preventDefault) event.preventDefault();
}

function isValid(element: HTMLElement) {
    for (let i = 0; i < 50; i++) { // Just in case
        if (element == null) return false;
        else if (element === htmlNode || element === bodyNode) return true;
        else if (isInvalid(element)) return false;
        else element = (element.parentElement as HTMLElement);
    }
}

function isInvalid(element: HTMLElement) {

    return element.isContentEditable === undefined ||
        (element.localName === "a") ||
        (element.localName === "area") ||
        (element.localName === "textarea" && isEditableText(element as HTMLInputElement)) ||
        (element.localName === "input" && isEditableText(element as HTMLInputElement));
}

function isEditableText(element: HTMLInputElement) {
    return !(element.disabled || element.readOnly);
}

function findScroll(node: Node, element: HTMLElement): ScrollNormal | null {
    for (let i = 0; i < 200 && node !== document && node !== htmlNode && node !== bodyNode; i++) {

        if (element == null) return null;
        else {
            const scrollNormal = findScrollNormal(element);
            if (scrollNormal === null) {
                element = (element.parentElement as HTMLElement);
                node = (element.parentNode as Node);
            }
            else return scrollNormal;
        }
    }

    return null;
}

function findScrollNormal(element: HTMLElement): ScrollNormal | null {
    const style = getComputedStyle(element);
    const width = canScroll(style.overflowX) && element.scrollWidth > element.clientWidth;
    const height = canScroll(style.overflowY) && element.scrollHeight > element.clientHeight;
    if (width || height) return {
        element: element,
        scroller: element,
        isHorizontal: width,
        isVertical: height,
        root: false
    };
    else return null;
}

function canScroll(style: string) {
    return style === "auto" || style === "scroll";
}

function getImage(scrollNormal: ScrollNormal) { // TODO: Change image sources
    if (scrollNormal.isHorizontal && scrollNormal.isVertical) return "https://cdn.discordapp.com/attachments/1135564396505092146/1135564483583033384/horizontal.svg";
    else if (scrollNormal.isHorizontal) return "https://raw.githubusercontent.com/hackermare/BD-AutoScroll/main/img/horizontal.svg";
    else return "https://raw.githubusercontent.com/hackermare/BD-AutoScroll/main/img/vertical.svg";
}

function mathAngle(x: number, y: number): number {
    let angle = Math.atan(y / x) / (Math.PI / 180);
    if (x < 0) {
        angle += 180;
    } else if (y < 0) {
        angle += 360;
    }
    return angle;
}

function direction(x: number, y: number): string {
    var angle = mathAngle(x, y);
    if (angle < 30 || angle >= 330) return "e-resize";
    else if (angle < 60) return "se-resize";
    else if (angle < 120) return "s-resize";
    else if (angle < 150) return "sw-resize";
    else if (angle < 210) return "w-resize";
    else if (angle < 240) return "nw-resize";
    else if (angle < 300) return "n-resize";
    else return "ne-resize";
}

function startCycle(element: HTMLElement, scroller: HTMLElement, root: boolean) {
    let scrollX = root ? window.scrollX : scroller.scrollLeft, scrollY = root ? window.scrollY : scroller.scrollTop;
    function loop() {
        state.timeout = requestAnimationFrame(loop);
        const scrollWidth = scroller.scrollWidth - element.clientWidth;
        const scrollHeight = scroller.scrollHeight - element.clientHeight;

        scrollX += state.dirX;
        scrollY += state.dirY;

        if (scrollX < 0) scrollX = 0;
        else if (scrollX > scrollWidth) scrollX = scrollWidth;

        if (scrollY < 0) scrollY = 0;
        else if (scrollY > scrollHeight) scrollY = scrollHeight;

        if (root) {
            window.scroll(settings.store.onlyScrollVertically ? window.scrollX : scrollX, scrollY);
        } else {
            if (!settings.store.onlyScrollVertically) scroller.scrollLeft = scrollX;
            scroller.scrollTop = scrollY;
        }
    }
    loop();
}

function shouldSticky(x: number, y: number) {
    return Math.hypot(x, y) < 10;
}

function scale(value: number) {
    const speed = settings.store.speed || 10;
    return value / (21 - speed);
}

function mousewheel(event: MouseEvent) {
    stopEvent(event, true);
}

function mousemove(event: MouseEvent) {
    if (state.oldX === null || state.oldY === null) return;

    stopEvent(event, true);

    let x = event.clientX - state.oldX, y = event.clientY - state.oldY;
    if (Math.hypot(x, y) > 10) {
        inner.style.setProperty("cursor", direction(x, y));
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
    if (state.oldX === null || state.oldY === null) return;

    stopEvent(event, true);
    const x = event.clientX - state.oldX;
    const y = event.clientY - state.oldY;
    if (state.click || !shouldSticky(x, y)) unclick();
    else state.click = true;
}

function unclick() {
    cancelAnimationFrame(state.timeout);
    state.timeout = -1;

    removeEventListener("wheel", mousewheel, true);
    removeEventListener("mousemove", mousemove, true);
    removeEventListener("mouseup", mouseup, true);

    normalCursor();

    inner.style.removeProperty("background-image");
    inner.style.removeProperty("background-position");
    inner.style.setProperty("display", "none");

    state.oldX = null;
    state.oldY = null;

    state.dirX = 0;
    state.dirY = 0;

    state.click = false;
    state.scrolling = false;
}

function normalCursor() {
    inner.style.removeProperty("cursor");
}

function show(scrollNormal: ScrollNormal, x: number, y: number) {
    state.scrolling = true;
    state.oldX = x;
    state.oldY = y;
    startCycle(scrollNormal.element, scrollNormal.scroller, scrollNormal.root);

    addEventListener("wheel", mousewheel, true);
    addEventListener("mousemove", mousemove, true);
    addEventListener("mouseup", mouseup, true);

    inner.style.setProperty("background-image", `url("${getImage(scrollNormal)}")`);
    inner.style.setProperty("background-position", `${x - 13}px ${y - 13}px`);
    inner.style.removeProperty("display");
}

interface AutoScrollState {
    timeout: number;

    oldX: number | null;
    oldY: number | null;

    dirX: number;
    dirY: number;

    click: boolean;
    scrolling: boolean;
}

interface ScrollNormal {
    element: HTMLElement;
    scroller: HTMLElement;
    isHorizontal: boolean;
    isVertical: boolean;
    root: boolean;
}
