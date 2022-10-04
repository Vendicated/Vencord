import type { Command, Option } from "./Commands.d";

const getBuiltInCommands = () =>
    (Vencord.Api.Commands as any)._BuiltIn as Command[];

const getUniqueCommandId = () => {
    const existingIds = getBuiltInCommands().map((i) =>
        parseInt((i as any).id as string)
    );
    return (
        (Math.abs(existingIds.sort((a, b) => a - b)[0]) + 1) *
        -1
    ).toString();
};

function modifyOpt(opt: Option) {
    if (opt.displayName == undefined) opt.displayName = opt.name;
    if (opt.displayDescription == undefined)
        opt.displayDescription = opt.description;
    opt.options?.forEach(modifyOpt);
}

export const commands = new Map<string, Command>();
export function registerCommand(command: Command) {
    (command as any).id = getUniqueCommandId();
    (command as any).applicationId = "-1"; // -1 is for the built-in category

    if (command.displayName == undefined) command.displayName = command.name;
    if (command.displayDescription == undefined)
        command.displayDescription = command.description;

    command.options?.forEach(modifyOpt);
    commands[(command as any).id + "_" + command.name] = command;
    getBuiltInCommands().push(command);
}

export function unregisterCommand(command: Command) {
    delete commands[(command as any).id + "_" + command];
    const cmds = getBuiltInCommands();
    for (const cmd of cmds) {
        if (
            (cmd as any).id + "_" + cmd.name ===
            (command as any).id + "_" + command.name
        ) {
            cmds.splice(cmds.indexOf(cmd), 1);
        }
    }
}
