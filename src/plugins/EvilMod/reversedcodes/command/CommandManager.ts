/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Command } from "./Command";

export class CommandManager {
    private commands: Map<string, Command>;

    constructor() {
        this.commands = new Map<string, Command>();
    }

    registerCommand(command: Command): void {
        if (this.commands.has(command.name)) {
            throw new Error(`Command with name "${command.name}" is already registered.`);
        }
        this.commands.set(command.name, command);
    }

    unregisterCommand(commandName: string): void {
        if (!this.commands.has(commandName)) {
            throw new Error(`Command with name "${commandName}" is not registered.`);
        }
        this.commands.delete(commandName);
    }

    getRegisteredCommands(): any[] {
        return Array.from(this.commands.values()).map(command => command.getCommandDefinition());
    }
}
