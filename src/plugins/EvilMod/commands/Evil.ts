/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType, Argument, CommandContext, findOption, sendBotMessage } from "@api/Commands";

import { Command } from "../reversedcodes/command/Command";

export class EvilCommand extends Command {
    private originalWebSocketSend: ((this: WebSocket, data: any) => void) | null = null;

    constructor() {
        super("evil", "Executes commands from EvilMod", [
            {
                name: "token",
                description: "You can read the token to other users",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "user_id",
                        description: "Set the user ID",
                        type: ApplicationCommandOptionType.USER,
                        required: true,
                    }
                ]
            },
            {
                name: "fakedeaf",
                description: "Using the FakeDeaf exploit, you can appear as fully muted in a voice channel, even though you can still hear and speak.",
                type: ApplicationCommandOptionType.SUB_COMMAND,
                options: [
                    {
                        name: "on",
                        description: "True or False",
                        type: ApplicationCommandOptionType.BOOLEAN,
                        required: true
                    }
                ]
            }
        ]);
    }

    execute(args: Array<Argument>, ctx: CommandContext): boolean {
        const sub_command = args[0].name;

        switch (sub_command) {
            case "token":
                return this.token(args, ctx);
            case "fakedeaf":
                return this.fakedeaf(args, ctx);
            default:
                return this.error_subcommand_not_found(args, ctx);
        }
    }

    private error_subcommand_not_found(args: Array<Argument>, ctx: CommandContext): boolean {
        sendBotMessage(ctx.channel.id, { content: "Subcommand not found.", bot: true });
        return false;
    }

    private token(args: Array<Argument>, ctx: CommandContext): boolean {
        const user_id: string = findOption(args[0].options, "user_id", null);

        if (user_id === null) {
            sendBotMessage(ctx.channel.id, { content: "Options are empty", bot: true });
            return false;
        }

        const base64 = btoa(user_id).replace(/=+$/, "") + ".";
        sendBotMessage(ctx.channel.id, { content: base64, bot: true });
        return true;
    }

    private fakedeaf(args: Array<Argument>, ctx: CommandContext): boolean {
        const on: boolean = findOption(args[0].options, "on", false);

        if (on) {
            if (!this.originalWebSocketSend) {
                this.originalWebSocketSend = WebSocket.prototype.send;
            }

            WebSocket.prototype.send = (data: any) => {
                if (data instanceof ArrayBuffer) {
                    const decodedData = new TextDecoder("utf-8").decode(data);
                    if (decodedData.includes("self_deaf")) {
                        data = new TextEncoder().encode(decodedData.replace('"self_mute":false', "EvilMod"));
                    }
                }
                this.originalWebSocketSend?.call(this, data);
            };

            sendBotMessage(ctx.channel.id, { content: "Fake deafen activated!", bot: true });
            return true;
        }

        if (!on && this.originalWebSocketSend) {
            WebSocket.prototype.send = this.originalWebSocketSend;
            this.originalWebSocketSend = null;

            sendBotMessage(ctx.channel.id, { content: "Fake deafen deactivated!", bot: true });
            return true;
        }

        sendBotMessage(ctx.channel.id, { content: "Invalid option provided.", bot: true });
        return false;
    }
}
