/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { EquicordDevs, IS_MAC } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { copyWithToast } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { useEffect, useState } from "@webpack/common";

const KeybindShortcut = findComponentByCodeLazy(".combo,", ".key,");

const cl = classNameFactory("vc-element-highlight-");

const DEFAULT_KEYBIND = ["mod", "shift", "y"];

let active = false;
let overlay: HTMLDivElement | null = null;
let tooltip: HTMLDivElement | null = null;
let lastTarget: Element | null = null;
let pendingFrame = 0;
let pendingX = 0;
let pendingY = 0;
let pendingElement: Element | null = null;

const colorCache = new WeakMap<Element, string | null>();
let cachedRules: { selector: string; specificity: number; color: string; }[] = [];

function KeybindRecorder() {
    const [isListening, setIsListening] = useState(false);
    const currentKeybind = settings.use(["keybind"]).keybind;

    useEffect(() => {
        if (!isListening) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            event.preventDefault();
            event.stopPropagation();

            if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;

            const keys: string[] = [];
            if (event.metaKey) keys.push("meta");
            if (event.ctrlKey) keys.push(IS_MAC ? "control" : "mod");
            if (event.shiftKey) keys.push("shift");
            if (event.altKey) keys.push("alt");

            let mainKey = event.key.toLowerCase();
            if (mainKey === " ") mainKey = "space";
            if (mainKey === "escape") mainKey = "esc";

            keys.push(mainKey);
            settings.store.keybind = keys;
            setIsListening(false);
        };

        const handleBlur = () => setIsListening(false);

        document.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("blur", handleBlur);

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isListening]);

    return (
        <div className={cl("keybind-row")}>
            <button
                type="button"
                className={cl("keybind-button", isListening ? "listening" : "")}
                onClick={() => setIsListening(true)}
            >
                {isListening ? "Recording..." : <KeybindShortcut shortcut={currentKeybind.join("+")} />}
            </button>
            <Button
                size="small"
                variant="secondary"
                onClick={() => { settings.store.keybind = DEFAULT_KEYBIND; }}
            >
                Reset
            </Button>
        </div>
    );
}

const settings = definePluginSettings({
    keybind: {
        description: "Toggle Highlighter",
        type: OptionType.COMPONENT,
        default: DEFAULT_KEYBIND,
        component: KeybindRecorder
    },
    showClasses: {
        description: "Display the element's CSS class names in the tooltip",
        type: OptionType.BOOLEAN,
        default: false
    },
    showId: {
        description: "Display the element's ID attribute in the tooltip",
        type: OptionType.BOOLEAN,
        default: false
    },
    showFont: {
        description: "Display the computed font family and font size",
        type: OptionType.BOOLEAN,
        default: false
    },
    showPadding: {
        description: "Display the element's padding values",
        type: OptionType.BOOLEAN,
        default: false
    },
    showMargin: {
        description: "Display the element's margin values",
        type: OptionType.BOOLEAN,
        default: false
    },
    showBorderRadius: {
        description: "Display the element's border-radius values",
        type: OptionType.BOOLEAN,
        default: false
    },
    showPosition: {
        description: "Display the element's CSS position type and z-index",
        type: OptionType.BOOLEAN,
        default: false
    },
    showDisplay: {
        description: "Display the element's display type along with flex or grid properties",
        type: OptionType.BOOLEAN,
        default: false
    }
});

function calcSpecificity(sel: string): number {
    const ids = (sel.match(/#[\w-]+/g) ?? []).length;
    const classes = (sel.match(/\.[\w-]+/g) ?? []).length + (sel.match(/\[[\w-]+/g) ?? []).length;
    const tags = (sel.match(/(^|[\s>+~])[\w-]+/g) ?? []).length;
    return ids * 10000 + classes * 100 + tags;
}

function cacheRules() {
    cachedRules = [];
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules) {
                if (!(rule instanceof CSSStyleRule)) continue;
                const color = rule.style.getPropertyValue("color");
                if (!color) continue;

                for (const sel of rule.selectorText.split(",")) {
                    const s = sel.trim();
                    cachedRules.push({ selector: s, specificity: calcSpecificity(s), color });
                }
            }
        } catch { }
    }
    cachedRules.sort((a, b) => a.specificity - b.specificity);
}

function getColorVarFromElement(el: Element): string | null {
    if (el instanceof HTMLElement) {
        const inline = el.style.getPropertyValue("color");
        if (inline) return inline;
    }

    const styleAttr = el.getAttribute("style");
    if (styleAttr) {
        const match = styleAttr.match(/color\s*:\s*([^;]+)/);
        if (match) return match[1].trim();
    }

    let result: string | null = null;
    for (const r of cachedRules) {
        try {
            if (el.matches(r.selector)) result = r.color;
        } catch { }
    }
    return result;
}

function getColorVar(el: Element): string | null {
    const cached = colorCache.get(el);
    if (cached !== undefined) return cached;

    let current: Element | null = el;
    while (current) {
        const color = getColorVarFromElement(current);
        if (color) {
            colorCache.set(el, color);
            return color;
        }
        current = current.parentElement;
    }
    colorCache.set(el, null);
    return null;
}

function rgbToHex(rgb: string): string {
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return rgb;
    const [r, g, b] = match.map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function formatBoxValue(value: string): string | null {
    if (value === "0px" || value === "0px 0px 0px 0px") return null;
    return value;
}

function buildTooltipContent(el: Element, computed: CSSStyleDeclaration, rect: DOMRect): string {
    const tag = el.tagName.toLowerCase();
    const colorVar = getColorVar(el) ?? computed.color;
    const hex = rgbToHex(computed.color);

    let html = `<span class="${cl("tag")}">&lt;${tag}&gt;</span> `;
    html += `<span class="${cl("size")}">${Math.round(rect.width)}x${Math.round(rect.height)}</span>`;
    html += `<div class="${cl("color")}"><span class="${cl("swatch")}" style="--c:${computed.color}"></span>${colorVar}</div>`;
    html += `<div class="${cl("hex")}">${hex}</div>`;

    const { store } = settings;

    if (store.showId) {
        const { id } = el;
        if (id) html += `<div class="${cl("info")}"><span class="${cl("label")}">id:</span> #${id}</div>`;
    }

    if (store.showClasses) {
        const classes = el.className;
        if (classes && typeof classes === "string") {
            const truncated = classes.length > 60 ? classes.slice(0, 60) + "…" : classes;
            html += `<div class="${cl("info")}"><span class="${cl("label")}">class:</span> ${truncated}</div>`;
        }
    }

    if (store.showFont) {
        const font = computed.fontFamily.split(",")[0].replace(/["']/g, "");
        const size = computed.fontSize;
        html += `<div class="${cl("info")}"><span class="${cl("label")}">font:</span> ${font} ${size}</div>`;
    }

    if (store.showPadding) {
        const padding = formatBoxValue(computed.padding);
        if (padding) html += `<div class="${cl("info")}"><span class="${cl("label")}">padding:</span> ${padding}</div>`;
    }

    if (store.showMargin) {
        const margin = formatBoxValue(computed.margin);
        if (margin) html += `<div class="${cl("info")}"><span class="${cl("label")}">margin:</span> ${margin}</div>`;
    }

    if (store.showBorderRadius) {
        const radius = formatBoxValue(computed.borderRadius);
        if (radius) html += `<div class="${cl("info")}"><span class="${cl("label")}">radius:</span> ${radius}</div>`;
    }

    if (store.showPosition) {
        const pos = computed.position;
        if (pos !== "static") {
            const zIndex = computed.zIndex !== "auto" ? ` z:${computed.zIndex}` : "";
            html += `<div class="${cl("info")}"><span class="${cl("label")}">position:</span> ${pos}${zIndex}</div>`;
        }
    }

    if (store.showDisplay) {
        const { display } = computed;
        let extra = "";
        if (display === "flex" || display === "inline-flex") {
            extra = ` ${computed.flexDirection} gap:${computed.gap}`;
        } else if (display === "grid" || display === "inline-grid") {
            extra = ` gap:${computed.gap}`;
        }
        html += `<div class="${cl("info")}"><span class="${cl("label")}">display:</span> ${display}${extra}</div>`;
    }

    return html;
}

function updateFrame() {
    pendingFrame = 0;
    const el = pendingElement;
    if (!el || !overlay || !tooltip) return;

    const rect = el.getBoundingClientRect();

    overlay.style.transform = `translate3d(${rect.left}px,${rect.top}px,0)`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    if (el !== lastTarget) {
        lastTarget = el;
        const computed = getComputedStyle(el);
        tooltip.innerHTML = buildTooltipContent(el, computed, rect);
    }

    positionTooltip(pendingX, pendingY);
}

function positionTooltip(x: number, y: number) {
    if (!tooltip) return;

    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    const margin = 15;
    const edge = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x + margin;
    let top = y + margin;

    if (left + tw + edge > vw) {
        left = x - margin - tw;
        if (left < edge) left = Math.max(edge, vw - tw - edge);
    }

    if (top + th + edge > vh) {
        top = y - margin - th;
        if (top < edge) top = Math.max(edge, vh - th - edge);
    }

    tooltip.style.transform = `translate3d(${left}px,${top}px,0)`;
}

function scheduleFrame(el: Element, x: number, y: number) {
    pendingElement = el;
    pendingX = x;
    pendingY = y;
    if (!pendingFrame) {
        pendingFrame = requestAnimationFrame(updateFrame);
    }
}

function onMouseMove(e: MouseEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay || el === tooltip || tooltip?.contains(el)) return;
    scheduleFrame(el, e.clientX, e.clientY);
}

function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay || el === tooltip) return;

    const colorVar = getColorVar(el);
    if (colorVar) copyWithToast(colorVar, "Copied color to clipboard!");
}

function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") disable();
}

function enable() {
    active = true;
    cacheRules();

    overlay = document.createElement("div");
    overlay.className = cl("overlay");
    document.body.appendChild(overlay);

    tooltip = document.createElement("div");
    tooltip.className = cl("tooltip");
    document.body.appendChild(tooltip);

    document.addEventListener("mousemove", onMouseMove, { capture: true, passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add(cl("active"));
}

function disable() {
    active = false;
    lastTarget = null;
    pendingElement = null;

    if (pendingFrame) {
        cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
    }

    overlay?.remove();
    overlay = null;
    tooltip?.remove();
    tooltip = null;

    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown);
    document.body.classList.remove(cl("active"));
}

function getConfiguredKeybind(): string[] {
    const raw = settings.store.keybind;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return DEFAULT_KEYBIND;
}

function matchesKeybind(e: KeyboardEvent): boolean {
    const keybind = getConfiguredKeybind();
    const pressed = e.key.toLowerCase();
    const code = e.code.toLowerCase().replace("key", "").replace("digit", "");

    let hasNonModifier = false;
    for (const key of keybind) {
        switch (key) {
            case "mod":
                if (!(IS_MAC ? e.metaKey : e.ctrlKey)) return false;
                break;
            case "control":
            case "ctrl":
                if (!e.ctrlKey) return false;
                break;
            case "meta":
            case "cmd":
                if (!e.metaKey) return false;
                break;
            case "shift":
                if (!e.shiftKey) return false;
                break;
            case "alt":
                if (!e.altKey) return false;
                break;
            default:
                hasNonModifier = true;
                if (pressed !== key && code !== key) return false;
        }
    }
    return hasNonModifier;
}

function onToggle(e: KeyboardEvent) {
    if (matchesKeybind(e)) {
        e.preventDefault();
        active ? disable() : enable();
    }
}

export default definePlugin({
    name: "ElementHighlighter",
    description: "Highlight and inspect elements easily.",
    authors: [EquicordDevs.Prism],
    settings,

    start() {
        document.addEventListener("keydown", onToggle);
    },

    stop() {
        document.removeEventListener("keydown", onToggle);
        if (active) disable();
    }
});
