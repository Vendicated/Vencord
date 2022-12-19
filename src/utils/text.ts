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

// Utils for readable text transformations eg: `toTitle(fromKebab())`

// Case style to words
export const wordsFromCamel = (text: string) => text.split(/(?=[A-Z])/).map(w => w.toLowerCase());
export const wordsFromSnake = (text: string) => text.toLowerCase().split("_");
export const wordsFromKebab = (text: string) => text.toLowerCase().split("-");
export const wordsFromPascal = (text: string) => text.split(/(?=[A-Z])/).map(w => w.toLowerCase());
export const wordsFromTitle = (text: string) => text.toLowerCase().split(" ");

// Words to case style
export const wordsToCamel = (words: string[]) =>
    words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("");
export const wordsToSnake = (words: string[]) => words.join("_").toUpperCase();
export const wordsToKebab = (words: string[]) => words.join("-").toLowerCase();
export const wordsToPascal = (words: string[]) =>
    words.map(w => w[0].toUpperCase() + w.slice(1)).join("");
export const wordsToTitle = (words: string[]) =>
    words.map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

// All indexes of a substring in a string
export const indexesOf = (text: string, sub: string) => {
    const indexes: number[] = [];
    let i = -1;
    while ((i = text.indexOf(sub, i + 1)) !== -1) indexes.push(i);
    return indexes;
};
