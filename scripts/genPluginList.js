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

// A script to automatically generate a list of all plugins.
// Just copy paste the entire file into a running Vencord install and it will prompt you
// to save the file

// eslint-disable-next-line spaced-comment
/// <reference types="../src/modules"/>

(() => {
    /**
     * @type {typeof import("~plugins").default}
     */
    const Plugins = Vencord.Plugins.plugins;

    const header = `
<!-- This file is auto generated, do not edit -->

# Vencord Plugins
`;

    let tableOfContents = "\n\n";

    let list = "\n\n";

    for (const p of Object.values(Plugins).sort((a, b) => a.name.localeCompare(b.name))) {
        tableOfContents += `- [${p.name}](#${p.name.replaceAll(" ", "-")})\n`;

        list += `## ${p.name}

${p.description}

**Authors**: ${p.authors.map(a => a.name).join(", ")}
`;

        if (p.commands?.length) {
            list += "\n\n#### Commands\n";
            for (const cmd of p.commands) {
                list += `${cmd.name} - ${cmd.description}\n\n`;
            }
        }
        list += "\n\n";
    }

    copy(header + tableOfContents + list);
})();
