/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType } from "@api/Commands";
import autoproxy from "@plugins/discordKit/commands/autoproxy";
import system from "@plugins/discordKit/commands/system";
import { CmdArgToDict } from "@plugins/discordKit/utils";
import { Command } from "@vencord/discord-types";

import { cache, pkClient } from ".";

export const commands: Command[] = [
    {
        name: "system",
        description: "System Commands",
        options: [
            {
                name: "id",
                description: "System ID",
                type: ApplicationCommandOptionType.STRING,
                required: false
            }
        ],
        execute: async (args, ctx) => await system(pkClient, cache, CmdArgToDict(args))
    },
    {
        name: "autoproxy",
        description: "Autoproxy Commands",
        options: [
            {
                name: "mode",
                description: "Autoproxy mode",
                type: ApplicationCommandOptionType.STRING,
                choices: [
                    {
                        name: "Off",
                        label: "",
                        value: "off"
                    },
                    {
                        name: "Front",
                        label: "",
                        value: "front"
                    },
                    {
                        name: "Latch",
                        label: "",
                        value: "latch"
                    }
                ],
                required: false
            },
            {
                name: "member",
                type: ApplicationCommandOptionType.STRING,
                displayName: "member",
                description: "ID or name of a member of your system"
            }
        ],
        execute: async (args, ctx) => await autoproxy(pkClient, cache, ctx, CmdArgToDict(args))
    }
];
