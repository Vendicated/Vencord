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

export function hex2Rgb(hex: string) {
    hex = hex.slice(1);
    if (hex.length < 6)
        hex = hex
            .split("")
            .map(c => c + c)
            .join("");
    if (hex.length === 6) hex += "ff";
    if (hex.length > 6) hex = hex.slice(0, 6);
    return hex
        .split(/(..)/)
        .filter(Boolean)
        .map(c => parseInt(c, 16));
}
