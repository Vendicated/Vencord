/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, Argument, CommandContext, Option } from "@api/Commands";

export abstract class Command {
    public name: string;
    public description: string;
    public inputType: ApplicationCommandInputType;
    public options: any[];

    constructor(name: string, description: string, options: Array<Option>, inputType: ApplicationCommandInputType = ApplicationCommandInputType.BUILT_IN) {
        this.name = name;
        this.description = description;
        this.options = options;
        this.inputType = inputType;
    }

    abstract execute(args: Array<Argument>, ctx: CommandContext): boolean;

    getCommandDefinition() {
        return {
            name: this.name,
            description: this.description,
            inputType: this.inputType,
            options: this.options,
            execute: (args: any[], ctx: any) => this.execute(args, ctx),
        };
    }
}
