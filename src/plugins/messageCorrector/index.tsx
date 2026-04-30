/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Command } from "@vencord/discord-types";
import { FluxDispatcher } from "@webpack/common";

const debug: boolean = false;
const logger = new Logger("MessageCorrector");

const settings = definePluginSettings({
    showTimestamps: {
        description: "Show UTC ISO 8601 timestamps on messages. This is mainly used for debugging. This setting can also be toggled by /messagetimestamps.",
        type: OptionType.BOOLEAN,
        default: false,
    },
});

const commands: Command[] = [
    {
        name: "messagetimestamps",
        description: "Enable/disable showing ISO 8601 timestamps under messages.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(args, context) {
            // We manually toggle the setting, then deselect all channels,
            // because I couldn't find a way to just reload a channel. Thanks Discord.
            // We then show a notification, wait half a second, and select the channel we were in.
            // I tested this for both guilds and DMs, and they both work.
            // This is a kinda hacky solution, but I was really only meaning this as a debugging feature anyways.

            settings.store.showTimestamps = !settings.store.showTimestamps;
            FluxDispatcher.dispatch({ type: "CHANNEL_SELECT", channelId: null, guildId: null });

            showNotification({
                title: "MessageCorrector",
                body: `Message timestamps are now ${settings.store.showTimestamps ? "enabled" : "disabled"}. The current channel will be reloaded.`,
            });

            setTimeout(() => {
                FluxDispatcher.dispatch({ type: "CHANNEL_SELECT", channelId: context.channel.id, guildId: context.guild?.id ?? null });
            }, 500);
        },
    },
];

export default definePlugin({
    name: "MessageCorrector",
    description: "Corrects the order of messages in the chat, based on when the message reached Discord's servers.",
    tags: ["Chat", "Utility"],

    settings: settings,
    commands: commands,

    authors: [
        Devs.Calebh101,
    ],

    patches: [
        // When Discord's returning the messages from somewhere, we wrap it in our custom function.
        {
            find: ",showNewMessagesBar:!",
            replacement: {
                match: /(\i)=\(0,(\i)\.(\i)\)\(\{messages:(\i)/,
                replace: "$1=(0,$2.$3)({messages:$self.reorder($4)",
            },
        },
    ],

    // The actual message timestamps thing
    renderMessageAccessory: props => {
        if (!settings.store.showTimestamps) return null;
        if (!props.message?.timestamp) return null;

        // eslint-disable-next-line prefer-destructuring
        const state: string = props.message.state;
        let color: string;

        switch (state) {
            case "SENT":
                color = "green";
                break;

            case "SENDING":
            case "EDITING":
            case "DELETING":
                color = "goldenrod";
                break;

            case "FAILED":
                color = "red";
                break;

            default:
                color = "red";
                break;
        }

        return (
            <span
                className="vencord-appended-timestamp"
                style={{
                    fontSize: 14,
                    userSelect: "text",
                    color: color,
                }}
            >
                {props.message.timestamp.toISOString()}
            </span >
        );
    },

    reorder(messages: any) {
        try {
            if (debug) logger.log("Reordering messages...", typeof messages, messages);

            // Sort everything by their timestamp.
            // The timestamp is when the message reached Discord's servers,
            // **not** the client's stores.

            messages._array = [...messages._array].sort((a, b) => {
                const tA = new Date(a.timestamp).getTime();
                const tB = new Date(b.timestamp).getTime();
                return tA - tB;
            });

            return messages;
        } catch (e) {
            logger.warn("Unable to reorder messages", e);
            return messages;
        }
    }
});
