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

import { Logger } from "@utils/Logger";
import { makeCodeblock } from "@utils/text";

import { sendBotMessage } from "./commandHelpers";
import { ApplicationCommandInputType, ApplicationCommandOptionType, ApplicationCommandType, Argument, Command, CommandContext, Option } from "./types";

export * from "./commandHelpers";
export * from "./types";

export let BUILT_IN: Command[];
export const commands = {} as Record<string, Command>;

// hack for plugins being evaluated before we can grab these from webpack
const OptPlaceholder = Symbol("OptionalMessageOption") as any as Option;
const ReqPlaceholder = Symbol("RequiredMessageOption") as any as Option;
/**
 * Optional message option named "message" you can use in commands.
 * Used in "tableflip" or "shrug"
 * @see {@link RequiredMessageOption}
 */
export let OptionalMessageOption: Option = OptPlaceholder;
/**
 * Required message option named "message" you can use in commands.
 * Used in "me"
 * @see {@link OptionalMessageOption}
 */
export let RequiredMessageOption: Option = ReqPlaceholder;

export const _init = function (cmds: Command[]) {
    try {
        BUILT_IN = cmds;
        OptionalMessageOption = cmds.find(c => (c.untranslatedName || c.displayName) === "shrug")!.options![0];
        RequiredMessageOption = cmds.find(c => (c.untranslatedName || c.displayName) === "me")!.options![0];
    } catch (e) {
        new Logger("CommandsAPI").error("Failed to load CommandsApi", e, " - cmds is", cmds);
    }
    return cmds;
} as never;

export const _handleCommand = function (cmd: Command, args: Argument[], ctx: CommandContext) {
    if (!cmd.isVencordCommand)
        return cmd.execute(args, ctx);

    const handleError = (err: any) => {
        // TODO: cancel send if cmd.inputType === BUILT_IN_TEXT
        const msg = `An Error occurred while executing command "${cmd.name}"`;
        const reason = err instanceof Error ? err.stack || err.message : String(err);

        console.error(msg, err);
        sendBotMessage(ctx.channel.id, {
            content: `${msg}:\n${makeCodeblock(reason)}`,
            author: {
                username: "Vencord"
            }
        });
    };

    try {
        const res = cmd.execute(args, ctx);
        return res instanceof Promise ? res.catch(handleError) : res;
    } catch (err) {
        return handleError(err);
    }
} as never;


/**
 * Prepare a Command Option for Discord by filling missing fields
 * @param opt
 */
export function prepareOption<O extends Option | Command>(opt: O): O {
    opt.displayName ||= opt.name;
    opt.displayDescription ||= opt.description;
    opt.options?.forEach((opt, i, opts) => {
        // See comment above Placeholders
        if (opt === OptPlaceholder) opts[i] = OptionalMessageOption;
        else if (opt === ReqPlaceholder) opts[i] = RequiredMessageOption;
        opt.choices?.forEach(x => x.displayName ||= x.name);

        prepareOption(opts[i]);
    });
    return opt;
}

// Yes, Discord registers individual commands for each subcommand
// TODO: This probably doesn't support nested subcommands. If that is ever needed,
// investigate
function registerSubCommands(cmd: Command, plugin: string) {
    cmd.options?.forEach(o => {
        if (o.type !== ApplicationCommandOptionType.SUB_COMMAND)
            throw new Error("When specifying sub-command options, all options must be sub-commands.");
        const subCmd = {
            ...cmd,
            ...o,
            type: ApplicationCommandType.CHAT_INPUT,
            name: `${cmd.name} ${o.name}`,
            id: `${o.name}-${cmd.id}`,
            displayName: `${cmd.name} ${o.name}`,
            subCommandPath: [{
                name: o.name,
                type: o.type,
                displayName: o.name
            }],
            rootCommand: cmd
        };
        registerCommand(subCmd as any, plugin);
    });
}

export function registerCommand<C extends Command>(command: C, plugin: string) {
    if (!BUILT_IN) {
        console.warn(
            "[CommandsAPI]",
            `Not registering ${command.name} as the CommandsAPI hasn't been initialised.`,
            "Please restart to use commands"
        );
        return;
    }

    if (BUILT_IN.some(c => c.name === command.name))
        throw new Error(`Command '${command.name}' already exists.`);

    command.isVencordCommand = true;
    command.untranslatedName ??= command.name;
    command.untranslatedDescription ??= command.description;
    command.id ??= `-${BUILT_IN.length + 1}`;
    command.applicationId ??= "-1"; // BUILT_IN;
    command.type ??= ApplicationCommandType.CHAT_INPUT;
    command.inputType ??= ApplicationCommandInputType.BUILT_IN_TEXT;
    command.plugin ||= plugin;

    prepareOption(command);

    if (command.options?.[0]?.type === ApplicationCommandOptionType.SUB_COMMAND) {
        registerSubCommands(command, plugin);
        return;
    }

    commands[command.name] = command;
    BUILT_IN.push(command);
}

export function unregisterCommand(name: string) {
    const idx = BUILT_IN.findIndex(c => c.name === name);
    if (idx === -1)
        return false;

    BUILT_IN.splice(idx, 1);
    delete commands[name];

    return true;
}
