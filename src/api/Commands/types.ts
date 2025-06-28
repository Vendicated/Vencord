/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@vencord/discord-types";

export interface Command {
    id?: string;
    applicationId?: string;
    type?: ApplicationCommandType;
    inputType?: ApplicationCommandInputType;
    plugin?: string;
    isVencordCommand?: boolean;

    name: string;
    untranslatedName?: string;
    displayName?: string;
    description: string;
    untranslatedDescription?: string;
    displayDescription?: string;

    options?: Option[];
    predicate?(ctx: CommandContext): boolean;

    execute(args: Argument[], ctx: CommandContext): Promisable<void | CommandReturnValue>;
}
