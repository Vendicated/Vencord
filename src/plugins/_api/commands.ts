/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "CommandsAPI",
    authors: [Devs.Arjix],
    description: "Api required by anything that uses commands",
    patches: [
        // obtain BUILT_IN_COMMANDS instance
        {
            find: '"giphy","tenor"',
            replacement: [
                {
                    // Matches BUILT_IN_COMMANDS. This is not exported so this is
                    // the only way. _init() just returns the same object to make the
                    // patch simpler

                    // textCommands = builtInCommands.filter(...)
                    match: /(?<=\w=)(\w)(\.filter\(.{0,30}giphy)/,
                    replace: "Vencord.Api.Commands._init($1)$2",
                }
            ],
        },
        // command error handling
        {
            find: "Unexpected value for option",
            replacement: {
                // return [2, cmd.execute(args, ctx)]
                match: /,(.{1,2})\.execute\((.{1,2}),(.{1,2})\)]/,
                replace: (_, cmd, args, ctx) => `,Vencord.Api.Commands._handleCommand(${cmd}, ${args}, ${ctx})]`
            }
        },
        // Show plugin name instead of "Built-In"
        {
            find: ".source,children",
            replacement: {
                // ...children: p?.name
                match: /(?<=:(.{1,3})\.displayDescription\}.{0,200}\.source,children:)[^}]+/,
                replace: "$1.plugin||($&)"
            }
        }
    ],
});
