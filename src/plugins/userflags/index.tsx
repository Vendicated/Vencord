/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, findOption, sendBotMessage } from "@api/Commands";
import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Parser, React, Text } from "@webpack/common";

let userFlags = new Map<string, Flag>();

enum FlagType {
    DANGER = "danger",
    WARNING = "warning",
    INFO = "info",
    POSITIVE = "positive"
}

type FlagRegistryEntry = {
    label: string;
    color: string;
    emoji: string;
};

const flagRegistry: Record<FlagType, FlagRegistryEntry> = {
    [FlagType.DANGER]: {
        label: "Danger",
        color: "#ff7473",
        emoji: "🛑"
    },
    [FlagType.WARNING]: {
        label: "Warning",
        color: "#ffb02e",
        emoji: "⚠️"
    },
    [FlagType.INFO]: {
        label: "Info",
        color: "#62a8ff",
        emoji: "ℹ️"
    },
    [FlagType.POSITIVE]: {
        label: "Positive",
        color: "#62ff74",
        emoji: "✅"
    }
};


type Flag = {
    type: FlagType;
    text: string;
};

const subscribers = new Set<() => void>();
function subscribe(callback: () => void) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
};

function Flag({ id }: { id: string; }) {
    const flag = React.useSyncExternalStore(subscribe, () => userFlags.get(id));
    if (!flag) return null;
    return (
        <div>
            <Text
                variant="text-md/bold"
                style={{ color: flagRegistry[flag.type].color }}
            >
                {Parser.parse(flagRegistry[flag.type].emoji)} {flag.text}
            </Text>
        </div>
    );
}

export default definePlugin({
    name: "UserFlags",
    description: `Add "flags" to users that will always show under their messages`,
    authors:  [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    dependencies: ["MessageAccessoriesAPI"],
    async start() {
        const savedFlags = await DataStore.get("USERFLAGS");
        if (savedFlags) {
            if (typeof savedFlags === "string") {
                userFlags = new Map<string, Flag>(JSON.parse(savedFlags));
            } else {
                userFlags = new Map<string, Flag>(savedFlags);
            }
        }
    },
    renderMessageAccessory: (props: Record<string, any>) => {
        return <Flag id={props.message.author.id} />;
    },
    commands: [
        {
            name: "flag set",
            description: "Set a flag on a user",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.USER,
                    description: "The user to set a flag to",
                    required: true
                },
                {
                    name: "type",
                    type: ApplicationCommandOptionType.STRING,
                    description: "The type of flag to add",
                    choices: Object.entries(flagRegistry).map(([key, flag]) => ({
                        name: key,
                        label: flag.label,
                        displayName: flag.label,
                        value: key,
                    })),
                    required: true
                },
                {
                    name: "message",
                    type: ApplicationCommandOptionType.STRING,
                    description: "The flag content",
                    required: true
                },
            ],
            execute: async (args: Argument[], ctx: CommandContext) => {
                const user = findOption(args, "user", "");
                const type = findOption<FlagType>(args, "type", FlagType.INFO);
                const text = findOption(args, "message", "");
                userFlags.set(user, {
                    type,
                    text
                });
                subscribers.forEach(cb => cb());
                sendBotMessage(ctx.channel.id, {
                    content: `Flag set on <@${user}> with content \`${text}\`!`
                });
                await DataStore.set("USERFLAGS", userFlags);
                return;
            }
        },
        {
            name: "flag delete",
            description: "Delete the flag from a user",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                {
                    name: "user",
                    type: ApplicationCommandOptionType.USER,
                    description: "The user to delete the flag from",
                    required: true
                }
            ],
            execute: async (args: Argument[], ctx: CommandContext) => {
                const user = findOption(args, "user", "");
                userFlags.delete(user);
                subscribers.forEach(cb => cb());
                sendBotMessage(ctx.channel.id, {
                    content: `Flag removed from <@${user}>`
                });
                await DataStore.set("USERFLAGS", userFlags);
                return;
            }
        }
    ]
});

