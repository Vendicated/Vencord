/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const STYLE_PREFIX = "collapsibleui-";

/**
 * Adds or updates a named <style> element in the document head.
 */
export function addStyle(id: string, css: string): void {
    const fullId = `${STYLE_PREFIX}${id}`;
    let el = document.getElementById(fullId) as HTMLStyleElement | null;
    if (el) {
        el.textContent = css;
    } else {
        el = document.createElement("style");
        el.id = fullId;
        el.textContent = css;
        document.head.appendChild(el);
    }
}

/**
 * Removes a named <style> element from the document head.
 */
export function removeStyle(id: string): void {
    const fullId = `${STYLE_PREFIX}${id}`;
    document.getElementById(fullId)?.remove();
}

/**
 * Removes all ModularCollapse styles from the document head.
 */
export function clearAllStyles(): void {
    document.querySelectorAll(`style[id^="${STYLE_PREFIX}"]`).forEach(el => el.remove());
}
