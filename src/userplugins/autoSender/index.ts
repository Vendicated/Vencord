import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, MessageActions } from "@webpack/common";

let enabled = false;
let loop;

const settings = definePluginSettings({

    channelId: {
        type: OptionType.STRING,
        description: "Channel id in which message will be send",
        onChange: onChange,
    },

    delay: {
        type: OptionType.NUMBER,
        description: "Delay between sending messages in seconds",
        onChange: onChange,
        default: 60,
    },

    message: {
        type: OptionType.STRING,
        description: "Message to send",
        onChange: onChange,
    },
});

// Copied from spotifyShareCommands
function sendMessage(channelId, message) {
    message = {
        // The following are required to prevent Discord from throwing an error
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    };
    MessageActions.sendMessage(channelId, message);
}

function startLoop() {
    loop = setInterval(function () {
        if (settings.store.channelId && settings.store.message && enabled) {
            let message = {
                content: settings.store.message
            };

            sendMessage(settings.store.channelId, message);
        }
    }, settings.store.delay * 1000);
}

function onStart() {
    enabled = true;
    startLoop();
}

function onChange() {
    if (enabled) {
        clearInterval(loop);
        startLoop();
    }
}

function onStop() {
    enabled = false;
    clearInterval(loop);
}

export default definePlugin({
    name: "Auto Sender",
    description: "Send messages automaticaly to specifed channel",
    authors: [
        {
            id: 322076647589412864n,
            name: "Noxy",
        },
    ],
    patches: [],
    // Delete these two below if you are only using code patches
    start: onStart,
    stop: onStop,
    settings,
});