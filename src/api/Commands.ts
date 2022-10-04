import type { Command, Option } from "./Commands.d";

// @ts-expect-error
const getBuiltInCommands = () => Vencord.Api.Commands._BuiltIn as Command[];

const getUniqueCommandId = () => {
    const existingIds = getBuiltInCommands().map((i) =>
        // @ts-expect-error
        parseInt(i.id as string)
    );
    return (
        (Math.abs(
            existingIds.sort((a, b) => a - b)[0]) + 1
        ) * -1
    ).toString();
};

function modifyOpt(opt: Option) {
    opt.displayName ||= opt.name;
    opt.displayDescription ||= opt.description;
    opt.options?.forEach(modifyOpt);
}

export const commands = new Map<string, Command>();
export function registerCommand(command: Command) {
    // @ts-expect-error
    command.id = getUniqueCommandId();
    // @ts-expect-error
    command.applicationId = "-1"; // -1 is for the built-in category

    command.displayName ||= command.name;
    command.displayDescription ||= command.description;

    command.options?.forEach(modifyOpt);
    // @ts-expect-error
    commands[command.id + "_" + command.name] = command;
    getBuiltInCommands().push(command);
}

export function unregisterCommand(command: Command) {
    // @ts-expect-error
    delete commands[command.id + "_" + command];
    const cmds = getBuiltInCommands();
    for (const cmd of cmds) {
        // @ts-expect-error
        if (cmd.id + "_" + cmd.name === command.id + "_" + command.name) {
            cmds.splice(cmds.indexOf(cmd), 1);
        }
    }
}
