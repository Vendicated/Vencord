/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Parser, React, Text } from "@webpack/common";

const Native = VencordNative.pluginHelpers.protexBlocks as PluginNative<typeof import("./native")>;
const logger = new Logger("protexBlocks");
const checkedUsers = new Set<string>();
const pluginStartTime = Date.now();

const userFlags = new Map<string, Flag>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notifyListeners() {
    listeners.forEach(l => l());
}

type Flag = {
    type: FlagType;
    text: string;
};

enum FlagType {
    BLOCKED = "block",
}

type FlagRegistryEntry = {
    label: string;
    color: string;
    emoji: string;
};

const flagRegistry: Record<FlagType, FlagRegistryEntry> = {
    [FlagType.BLOCKED]: {
        label: "Blocked by ProteX",
        color: "#ff7473",
        emoji: "🛑"
    },
};

const settings = definePluginSettings({
    apiKey: {
        type: OptionType.STRING,
        description: "API key for nxpdev.dk",
        default: "",
        placeholder: "sk_..."
    },
    checkOnce: {
        type: OptionType.BOOLEAN,
        description: "Only check each user once per session (improves performance)",
        default: true
    }
});

function FlagComponent({ id }: { id: string; }) {
    const flag = React.useSyncExternalStore(subscribe, () => userFlags.get(id));
    if (!flag) return null;
    return (
        <div style={{ marginTop: "4px" }}>
            <Text
                variant="text-xs/normal"
                style={{ color: flagRegistry[flag.type].color }}
            >
                {Parser.parse(flagRegistry[flag.type].emoji)} {flag.text}
            </Text>
        </div>
    );
}

export default definePlugin({
    name: "protexBlocks",
    description: "Checks users against nxpdev.dk API to detect blocked users",
    authors: [Devs.notfoundofficial],
    dependencies: ["MessageAccessoriesAPI"],
    settings,
    patches: [
        {
            find: '"MessageStore"',
            replacement: {
                match: /(?<=function (\i)\((\i)\){)(?=.*MESSAGE_CREATE:\1)/,
                replace: (_, _funcName, props) => `$self.checkUser(${props}.message);`
            }
        }
    ],
    renderMessageAccessory: (props: Record<string, any>) => {
        return <FlagComponent id={props.message.author.id} />;
    },
    async checkUser(message: Message) {
        try {
            if (!settings.store.apiKey || settings.store.apiKey === "") {
                return;
            }

            if (message.author?.bot) {
                return;
            }

            const userId = message.author?.id;
            if (!userId) {
                return;
            }

            const messageTimestamp = message.timestamp.valueOf();
            if (messageTimestamp < pluginStartTime) {
                return;
            }

            if (settings.store.checkOnce && !checkedUsers.has(userId)) {
                checkedUsers.add(userId);
            }

            const result = await Native.checkBlockedUser(userId, settings.store.apiKey);

            if (result.status === 401) {
                logger.error("Invalid API key");
                return;
            } else if (result.status === 404) {
                return;
            } else if (result.status !== 200 || !result.data) {
                if (result.error) {
                    logger.error(`API request failed: ${result.error}`);
                }
                return;
            }

            const { data } = result;
            if (data.blocked) {
                userFlags.set(userId, {
                    type: FlagType.BLOCKED,
                    text: `Blocked by ProteX | nxpdev.dk/users/${userId}`
                });
            }

        } catch (error) {
            logger.error("Error checking user:", error);
        }
    }
});
