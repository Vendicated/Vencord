/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { saveFile } from "@utils/web";
import { filters, findAll, findByPropsLazy, waitFor } from "@webpack";
import { React, ReactDOM } from "@webpack/common";
import * as t from "@webpack/types";
export let _cssColors: string[] = [];
export type IconsDef = { [k: string]: t.Icon; };

export const iconSizesInPx = findByPropsLazy("md", "lg", "xxs");
export const Colors = findByPropsLazy("colors", "layout");

export const cssColors = new Proxy(
    {
    },
    {
        get: (target, key) => {
            const colorKey = _cssColors[key];
            return key in target
                ? target[key]
                : Colors.colors[colorKey]?.css != null ? (target[key] = { name: colorKey.split("_").map((x: string) => x[0].toUpperCase() + x.toLowerCase().slice(1)).join(" "), css: Colors.colors[colorKey].css, key: colorKey }) : undefined;
        },
        set: (target, key, value) => {
            target[key] = value;
            return true;
        }
    }
) as unknown as Array<{ name: string; css: string; key: string; }>;

export const iconSizes = ["xxs", "xs", "sm", "md", "lg"];

const CrosspendingTypes: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif"
};

export function saveIcon(iconName: string, icon: EventTarget & SVGSVGElement | Element | string, color: number, size: number, type = "image/png") {
    const filename = `${iconName}-${cssColors[color]?.name ?? "unknown"}-${size}px.${CrosspendingTypes[type] ?? "png"}`;
    if (typeof icon === "string") {
        const file = new File([icon], filename, { type: "text/plain" });
        saveFile(file);
        return;
    }

    const innerElements = icon.children;
    for (const el of innerElements) {
        const fill = el.getAttribute("fill");
        if (fill && fill.startsWith("var(")) {
            el.setAttribute("fill", getComputedStyle(icon).getPropertyValue(fill.replace("var(", "").replace(")", "")));
        }
    }

    // save svg as the given type
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();

    img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL(type);
        link.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(icon.outerHTML)}`;
}


export function convertComponentToHtml(component?: React.ReactElement): string {
    const container = document.createElement("div");
    const root = ReactDOM.createRoot(container);

    ReactDOM.flushSync(() => root.render(component));
    const content = container.innerHTML;
    root.unmount();

    return content;
}

export const findAllByCode = (code: string) => findAll(filters.byCode(code));

waitFor(["colors", "layout"], m => {
    _cssColors = Object.keys(m.colors);
    cssColors.length = _cssColors.length;
});

