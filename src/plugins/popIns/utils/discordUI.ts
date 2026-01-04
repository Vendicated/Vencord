/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Get Discord's title bar height dynamically for a given document.
 * Works in both main window and popout windows.
 */
export function getTitleBarHeight(doc: Document = document): number {
    // 1. Try to find the specific title bar element (usually ends with -titleBar)
    const selectors = ['[class*="-titleBar"]', '[class*="-bar"][class*="theme-"]'];

    for (const selector of selectors) {
        const elements = doc.querySelectorAll(selector);
        for (const el of elements) {
            const hEl = el as HTMLElement;
            const rect = hEl.getBoundingClientRect();
            // Title bar must be at the very top and have a small height (usually 22px or 32px)
            if (rect.top === 0 && hEl.offsetHeight > 0 && hEl.offsetHeight < 60) {
                return hEl.offsetHeight;
            }
        }
    }

    // 2. Generic fallback: find ANY bar at top with non-zero small height
    const bars = doc.querySelectorAll('[class*="-bar"]');
    for (const bar of bars) {
        const el = bar as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top === 0 && el.offsetHeight > 0 && el.offsetHeight < 50) {
            return el.offsetHeight;
        }
    }

    // Fallback to reasonable default
    return 32;
}

/**
 * Get Discord's sidebar width dynamically for a given document.
 * Returns the total width from the left edge of the window.
 */
export function getSidebarWidth(doc: Document = document): number {
    const sidebar = doc.querySelector('[class*="-sidebar"]') as HTMLElement;
    const guilds = doc.querySelector('[class*="-guilds"]') as HTMLElement;

    let maxWidth = 0;

    // Check sidebar (includes channel list)
    if (sidebar) {
        const rect = sidebar.getBoundingClientRect();
        // Sidebar usually docks at left: 0 or left: 72 (if guilds are separate)
        if (rect.left <= 80) {
            maxWidth = Math.max(maxWidth, rect.right);
        }
    }

    // Check guilds list specifically (outermost left bar)
    if (guilds) {
        const rect = guilds.getBoundingClientRect();
        if (rect.left <= 10) {
            maxWidth = Math.max(maxWidth, rect.right);
        }
    }

    return maxWidth;
}
