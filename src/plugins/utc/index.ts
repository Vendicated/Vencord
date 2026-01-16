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

const UTC_CLASS_PREFIX = "utc_";

const ClassMap = new Map<string, string>();

const utcRegex = new RegExp(`${UTC_CLASS_PREFIX}\\S+\\s*`, "g");

const classNameRegex = /([\w\d_$]+?)-(\w+)/g;

const classPrefixHashRegex = /[_\d$]/;


export default definePlugin({
    name: "UTC",
    description: "Adds stable class names to elements to prevent breaking upon class reroll, making theming easier to maintain.",
    authors: [Devs.Nanakusa],

    patches: [
        {
            find: ".jsx=",
            replacement: {
                match: /return{\$\$typeof:\i,type:(\i).+?props:(\i)/,
                replace: "$self.patchClassName($2,$1);$&",
            },
        },
    ],

    patchClassName(props: Record<string, string>, type: string) {
        if (!props.className || type === "html") return;

        props.className = this.getClassName(props.className);
    },

    getClassName(input: string) {
        const cached = ClassMap.get(input);
        if (cached) return cached;

        const baseClasses = input.includes(UTC_CLASS_PREFIX)
            ? input.replaceAll(utcRegex, "").trim()
            : input;

        const utcSuffixes = [...baseClasses.matchAll(classNameRegex)].reduce(
            (suffix, [_, prefix, name]) =>
                classPrefixHashRegex.test(prefix) && !suffix.includes(name)
                    ? `${suffix} utc_${name}`
                    : suffix,
            "",
        );

        const unified = `${baseClasses}${utcSuffixes}`;
        ClassMap.set(input, unified);
        return unified;
    },

});
