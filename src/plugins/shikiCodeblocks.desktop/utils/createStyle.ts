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
