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

import { moment } from "@webpack/common";

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

const units = ["years", "months", "weeks", "days", "hours", "minutes", "seconds"] as const;
type Units = typeof units[number];

function getUnitStr(unit: Units, isOne: boolean, short: boolean) {
    if (short === false) return isOne ? unit.slice(0, -1) : unit;

    return unit[0];
}

/**
 * Forms time into a human readable string link "1 day, 2 hours, 3 minutes and 4 seconds"
 * @param time The time on the specified unit
 * @param unit The unit the time is on
 * @param short Whether to use short units like "d" instead of "days"
 */
export function formatDuration(time: number, unit: Units, short: boolean = false) {
    const dur = moment.duration(time, unit);

    let unitsAmounts = units.map(unit => ({ amount: dur[unit](), unit }));

    let amountsToBeRemoved = 0;

    outer:
    for (let i = 0; i < unitsAmounts.length; i++) {
        if (unitsAmounts[i].amount === 0 || !(i + 1 < unitsAmounts.length)) continue;
        for (let v = i + 1; v < unitsAmounts.length; v++) {
            if (unitsAmounts[v].amount !== 0) continue outer;
        }

        amountsToBeRemoved = unitsAmounts.length - (i + 1);
    }
    unitsAmounts = amountsToBeRemoved === 0 ? unitsAmounts : unitsAmounts.slice(0, -amountsToBeRemoved);

    const daysAmountIndex = unitsAmounts.findIndex(({ unit }) => unit === "days");
    if (daysAmountIndex !== -1) {
        const daysAmount = unitsAmounts[daysAmountIndex];

        const daysMod = daysAmount.amount % 7;
        if (daysMod === 0) unitsAmounts.splice(daysAmountIndex, 1);
        else daysAmount.amount = daysMod;
    }

    let res: string = "";
    while (unitsAmounts.length) {
        const { amount, unit } = unitsAmounts.shift()!;

        if (res.length) res += unitsAmounts.length ? ", " : " and ";

        if (amount > 0 || res.length) {
            res += `${amount} ${getUnitStr(unit, amount === 1, short)}`;
        }
    }

    return res.length ? res : `0 ${getUnitStr(unit, false, short)}`;
}

/**
 * Join an array of strings in a human readable way (1, 2 and 3)
 * @param elements Elements
 */
export function humanFriendlyJoin(elements: string[]): string;
/**
 * Join an array of strings in a human readable way (1, 2 and 3)
 * @param elements Elements
 * @param mapper Function that converts elements to a string
 */
export function humanFriendlyJoin<T>(elements: T[], mapper: (e: T) => string): string;
export function humanFriendlyJoin(elements: any[], mapper: (e: any) => string = s => s): string {
    const { length } = elements;
    if (length === 0)
        return "";
    if (length === 1)
        return mapper(elements[0]);

    let s = "";

    for (let i = 0; i < length; i++) {
        s += mapper(elements[i]);
        if (length - i > 2)
            s += ", ";
        else if (length - i > 1)
            s += " and ";
    }

    return s;
}

/**
 * Wrap the text in ``` with an optional language
 */
export function makeCodeblock(text: string, language?: string) {
    const chars = "```";
    return `${chars}${language || ""}\n${text.replaceAll("```", "\\`\\`\\`")}\n${chars}`;
}

export function stripIndent(strings: TemplateStringsArray, ...values: any[]) {
    const string = String.raw({ raw: strings }, ...values);

    const match = string.match(/^[ \t]*(?=\S)/gm);
    if (!match) return string.trim();

    const minIndent = match.reduce((r, a) => Math.min(r, a.length), Infinity);
    return string.replace(new RegExp(`^[ \\t]{${minIndent}}`, "gm"), "").trim();
}

export const ZWSP = "\u200b";
export function toInlineCode(s: string) {
    return "``" + ZWSP + s.replaceAll("`", ZWSP + "`" + ZWSP) + ZWSP + "``";
}
