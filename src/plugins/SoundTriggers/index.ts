import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { sleep } from "@utils/misc";
import { RelationshipStore, SelectedChannelStore } from "@webpack/common";
import { Message } from "discord-types/general";

const bauURL = "https://files.catbox.moe/7jh1fb.mp3";

// Default triggers, the rest are customizable through the plugin settings.
const defaultTriggers = [
    { match: "crack", link: "https://files.catbox.moe/yauk4d.ogg" },
    {
        match: "(:[^:\\s]*husk[^:\\s]*:)|\\[[^\\]]*husk[^\\]]*\\]\\([^()\\s]*\\)",
        link: "https://files.catbox.moe/orbqe6.mp3",
    },
];

let triggers = [...defaultTriggers];

function reloadTriggers() {
    const customTriggersString = settings.store.Triggers ?? "";
    if (!customTriggersString) {
        triggers = [...defaultTriggers];
        return;
    }

    const customTriggers: { match: string; link: string }[] = [];
    const lines = customTriggersString
        .split(",")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    for (const line of lines) {
        const parts = line.split(":");
        if (parts.length < 2) {
            console.error(
                `Invalid trigger format: "${line}". Expected format is "match:link".`
            );
            continue;
        }

        const match = parts[0].trim();
        const link = parts.slice(1).join(":").trim();

        if (!match || !link) {
            console.error(
                `Invalid trigger format: "${line}". Both match and link must be provided.`
            );
            continue;
        }

        customTriggers.push({ match, link });
    }

    triggers = [...defaultTriggers, ...customTriggers];
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

function play(link: string, volume: number) {
    const audioElement = document.createElement("audio");
    audioElement.src = link;
    audioElement.volume = volume / 100;
    audioElement.play().catch((error) => {
        console.error(`Failed to play sound: ${error.message}`);
    });
    audioElement.onended = () => {
        if (audioElement) {
            audioElement.remove();
        }
    };
}

const settings = definePluginSettings({
    Volume: {
        title: "Volume",
        type: OptionType.SLIDER,
        description: "Notification volume",
        markers: [0, 25, 50, 75, 100],
        default: 100,
    },
    Triggers: {
        title: "Sound Triggers",
        type: OptionType.STRING,
        description:
            "Define your own sound triggers in the format `match:link` (separated by a comma). supports regex (without surrounding backslashes).",
        default: "",
        placeholder: "match:link,match:link",
        onChange: (value: string) => {
            reloadTriggers();
        },
    },
});

export default definePlugin({
    name: "SoundTriggers",
    description:
        "triggers a sound when you send a message containing certain strings, allows regular expressions.",
    authors: [{ name: "VincentTheDev", id: 1219097396403900466n }],
    settings,
    flux: {
        async MESSAGE_CREATE({
            optimistic,
            type,
            message,
            channelId,
        }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (RelationshipStore.isBlocked(message.author?.id)) return;
            if (!message.content) return;
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            const orderedMatches: {
                trigger: string;
                link: string;
                index: number;
            }[] = [];

            for (const { match, link } of triggers) {
                const regex = new RegExp(match, "gi");
                let matchResult;
                while ((matchResult = regex.exec(message.content)) !== null) {
                    orderedMatches.push({
                        trigger: match,
                        link,
                        index: matchResult.index,
                    });
                }
            }

            orderedMatches.sort((a, b) => a.index - b.index);

            for (const match of orderedMatches) {
                play(match.link, settings.store.Volume ?? 100);
                await sleep(300);
            }
        },
    },
});
