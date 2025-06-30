/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

// ^^ Does this matter if I am trying to get it added to other client mods?

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

type RegExpReducible<T> = RegExpStringIterator<T> & { reduce: T[]["reduce"]; };

const classMap = new Map<string, string>();

export default definePlugin({
    name: "UTC",
    description: "Adds stable class names to elements to prevent breaking upon class reroll, making theming easier to maintain.",
    authors: [Devs.Nanakusa],

    patches: [
        {
            find: ".jsx=",
            replacement: {
                match: /return{\$\$typeof:\i+,type:(\i+).+?props:(\i+)/,
                replace: " $2.className && $1 !== 'html' && ($2.className = $self.getClassName($2.className));$&",
            },
        },
    ],

    getClassName(className: string) {
        if (classMap.has(className)) return classMap.get(className)!;

        const baseClasses = className.includes("utc_") ? className.replaceAll(/utc_\S+\s*/g, "").trim() : className;

        const suffixMatch = baseClasses.matchAll(/(\w+?)_/g) as RegExpReducible<RegExpExecArray>;

        const suffix = suffixMatch.reduce((suffix, [_, name]) => `${suffix}_${name}`, "");

        const unified = suffix.length ? `${baseClasses} utc${suffix}` : baseClasses;

        classMap.set(className, unified);

        return unified;
    },

});
