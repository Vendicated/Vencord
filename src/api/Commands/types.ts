/*
 * Claudecord, a Discord client mod
 * Copyright (c) 2025 Vendicated, Claude and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Command } from "@vencord/discord-types";
export { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType } from "@vencord/discord-types/enums";

export interface ClaudecordCommand extends Command {
    isClaudecordCommand?: boolean;
    rootCommand?: ClaudecordCommand;
}
