/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import { EvilCommand } from "./commands/Evil";
import { CommandManager } from "./reversedcodes/command/CommandManager";

const commandManager = new CommandManager();
commandManager.registerCommand(new EvilCommand());

export default definePlugin({
    name: "EvilMod",
    description: "Evil Mod is a Discord Vencord plugin that can be used to conduct social engineering or hacking attacks.",
    authors: [{ id: 1207069281137987679n, name: "Reversed Codes" }],
    commands: commandManager.getRegisteredCommands(),
});