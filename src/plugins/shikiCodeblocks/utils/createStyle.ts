/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const styles = new Map<string, HTMLStyleElement>();

export function setStyle(css: string, id: string) {
    const style = document.createElement("style");
    style.innerText = css;
    document.head.appendChild(style);
    styles.set(id, style);
}

export function removeStyle(id: string) {
    styles.get(id)?.remove();
    return styles.delete(id);
}

export const clearStyles = () => {
    styles.forEach(style => style.remove());
    styles.clear();
};
