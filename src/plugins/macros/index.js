/*
 * Licensed under GPL-3.0, made by github.com/imlayered | https://github.com/imlayered/vencord-macros?tab=GPL-3.0-1-ov-file
 * Some of this code was debugged with AI (ChatGPT4o (Github Copilot)), some is grabbed from other plugins, and some is written by me.
 */

import { ApplicationCommandInputType, registerCommand, unregisterCommand } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, MessageActions } from "@webpack/common";

const PendingReplyStore = findByPropsLazy("getPendingReply");

const settings = definePluginSettings({
    command1Name: {
        description: "Name of the first custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "example",
        restartNeeded: true,
    },
    command1Message: {
        description: "Message to send when the first command is used",
        type: OptionType.STRING,
        default: "https://placehold.co/400x400",
        restartNeeded: true,
    },
    command2Name: {
        description: "Name of the second custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command2Message: {
        description: "Message to send when the second command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command3Name: {
        description: "Name of the third custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command3Message: {
        description: "Message to send when the third command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command4Name: {
        description: "Name of the fourth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command4Message: {
        description: "Message to send when the fourth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command5Name: {
        description: "Name of the fifth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command5Message: {
        description: "Message to send when the fifth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command6Name: {
        description: "Name of the sixth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command6Message: {
        description: "Message to send when the sixth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command7Name: {
        description: "Name of the seventh custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command7Message: {
        description: "Message to send when the seventh command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command8Name: {
        description: "Name of the eighth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command8Message: {
        description: "Message to send when the eighth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command9Name: {
        description: "Name of the ninth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command9Message: {
        description: "Message to send when the ninth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command10Name: {
        description: "Name of the tenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command10Message: {
        description: "Message to send when the tenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command11Name: {
        description: "Name of the eleventh custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command11Message: {
        description: "Message to send when the eleventh command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command12Name: {
        description: "Name of the twelfth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command12Message: {
        description: "Message to send when the twelfth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command13Name: {
        description: "Name of the thirteenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command13Message: {
        description: "Message to send when the thirteenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command14Name: {
        description: "Name of the fourteenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command14Message: {
        description: "Message to send when the fourteenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command15Name: {
        description: "Name of the fifteenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command15Message: {
        description: "Message to send when the fifteenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command16Name: {
        description: "Name of the sixteenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command16Message: {
        description: "Message to send when the sixteenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command17Name: {
        description: "Name of the seventeenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command17Message: {
        description: "Message to send when the seventeenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command18Name: {
        description: "Name of the eighteenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command18Message: {
        description: "Message to send when the eighteenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command19Name: {
        description: "Name of the nineteenth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command19Message: {
        description: "Message to send when the nineteenth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    // Start copying here to add more commands
    command20Name: {
        description: "Name of the twentieth custom slash command (without the slash)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    command20Message: {
        description: "Message to send when the twentieth command is used",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },
    // End copying here to add more commands
});

function sendMessage(channelId, message) {
    message = {
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message,
    };
    const reply = PendingReplyStore.getPendingReply(channelId);
    MessageActions.sendMessage(channelId, message, undefined, MessageActions.getSendMessageOptionsForReply(reply))
        .then(() => {
            if (reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            }
        });
}

export default definePlugin({
    name: "Macros",
    description: "Turns a slash (/) command into a message and/or GIF",
    authors: [Devs.layered, Devs.koqel, Devs.herbert__],
    settings,
    start() {
        this.registeredCommands = [];
        for (let i = 1; i <= 20; i++) {
            const nameKey = `command${i}Name`;
            const messageKey = `command${i}Message`;
            const name = settings.store[nameKey];
            const message = settings.store[messageKey];
            if (name && message) {
                const command = {
                    name,
                    description: `Custom command ${i}`,
                    inputType: ApplicationCommandInputType.BUILT_IN,
                    execute: (_, ctx) => {
                        sendMessage(ctx.channel.id, {
                            content: message,
                        });
                    },
                };
                registerCommand(command);
                this.registeredCommands.push(name);
            }
        }
    },
    stop() {
        if (this.registeredCommands) {
            this.registeredCommands.forEach((name) => {
                unregisterCommand(name);
            });
        }
    },
});
