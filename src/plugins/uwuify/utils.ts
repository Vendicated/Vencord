/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

function isLetter(char: string): boolean {
    return /^\p{L}/u.test(char);
}

export function getCapitalPercentage(str: string): number {
    let totalLetters = 0;
    let upperLetters = 0;
    for (const c of str) {
        if (!isLetter(c)) continue;
        if (c === c.toUpperCase()) upperLetters++;
        totalLetters++;
    }
    return upperLetters / totalLetters;
}

export function isUri(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

export function isAt(value: string): boolean {
    return value.charAt(0) === "@";
}
