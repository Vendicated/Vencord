import definePlugin from "../../utils/types";
import { Devs } from "../../utils/constants";
import { Message } from "discord-types/general";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    channelId: string;
    isPushNotification: boolean;
    optimistic: boolean;
    message: Message;
}

const MOYAI_URL =
    "https://github.com/MeguminSama/VencordPlugins/raw/main/plugins/moyai/moyai.mp3";

export default definePlugin({
    name: "Moyai",
    authors: [Devs.Megu],
    description: "🗿🗿🗿🗿🗿🗿🗿🗿",
    execute: async (event: IMessageCreate) => {
        if (event?.type !== "MESSAGE_CREATE") return;
        if (!event.message?.content) return;
        if (event.message.state === "SENDING") return;
        if (event.optimistic) return;

        const isInGuildChannel =
            window.location.pathname.startsWith("/channels/");
        if (!isInGuildChannel) return;

        const channelId = window.location.pathname.split("/")[3];
        if (!channelId || channelId !== event.channelId) return;

        const moyaiCount = messageContainsMoyai(event.message.content);
        if (!moyaiCount) return;

        for (let i = 0; i < moyaiCount; i++) {
            const audioElement = document.createElement("audio");
            audioElement.src = MOYAI_URL;
            audioElement.play();
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    },
    patches: [
        {
            find: "MESSAGE_CREATE:function(",
            replacement: [
                {
                    match: /MESSAGE_CREATE:function\((\w+)\){/,
                    replace:
                        "MESSAGE_CREATE:function($1){Vencord.Plugins.plugins.Moyai.execute($1);",
                },
            ],
        },
    ],
});

const EMOJI_NAME_REGEX = /<a?:(\w+):\d+>/g;

function messageContainsMoyai(message: string): number {
    // get number of 🗿 in a string
    let moyaiCount = (message.match(/🗿/g) || []).length;

    // get number of emojis in message that are called "moyai" or "moai"
    const emojiNames = message.matchAll(EMOJI_NAME_REGEX);

    if (emojiNames) {
        for (const emojiName of emojiNames) {
            if (!emojiName[1]) continue;
            let name = emojiName[1];

            // If emoji starts  or ends with (moyai|moai)
            if (/^(moyai|moai)/i.test(name) || /(moyai|moai)$/i.test(name)) {
                moyaiCount++;
            }
        }
    }

    // Maximum moyai...
    if (moyaiCount > 10) moyaiCount = 10;

    return moyaiCount;
}
