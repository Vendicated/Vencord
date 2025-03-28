import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import definePlugin, { OptionType } from "@utils/types";
import { CatIcon } from "./caticon";
import { definePluginSettings } from "@api/Settings";
import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { sendMessage } from "@utils/discord";
import { makeRange } from "@components/PluginSettings/components";


export const settings = definePluginSettings({
    matthew: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "bro like like im about to crash out"
    },
    insertBroLike: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Automatically insert 'bro like' at the beginning of messages if not present"
    },
    wordChunkChance: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.3,
        description: "Initial chance to include additional words in a chunk"
    },
    wordChunkFalloff: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.5,
        description: "Falloff multiplier for the chance of including additional words in a chunk"
    },
    delayBetweenChunks: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 2000, 100),
        default: 100,
        description: "Multiplier for the delay between sending chunks of words (in milliseconds)"
    }
});

function chunkWords(words: string[]): string[][] {
    const chunks: string[][] = [];
    let i = 0;

    while (i < words.length) {
        let chunkSize = 1;
        let probability = settings.store.wordChunkChance; // Initial chance to include additional words

        while (Math.random() < probability && i + chunkSize < words.length) {
            chunkSize++;
            probability *= settings.store.wordChunkFalloff; // Reduce chance for each additional word
        }

        chunks.push(words.slice(i, i + chunkSize));
        i += chunkSize;
    }

    return chunks;
}


export default definePlugin({
    name: "Matthew_K1",
    description: "Bro like like im about to crash out",
    authors: [{ name: "Tally", id: 1014588310036951120n }],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],
    settings,

    start() {

        addChatBarButton("vc-matt", CatIcon);


        this.preSend = addMessagePreSendListener(async (channelId, message) => {

            if (!message.content || !settings.store.matthew) return;
            let words = message.content.split(" ");
            message.content = ""; // Clear the original message content to prevent sending it

            if (!words.includes("bro") && !words.includes("like") && settings.store.insertBroLike) {
                words = ["bro", "like", ...words];
            }

            let chunks = chunkWords(words);

            message.content = chunks.shift()?.join(" ") ?? "";
            let index = 0;
            setTimeout(async () => {
                for (const word of chunks) {
                    index++;
                    await new Promise(resolve => setTimeout(resolve, settings.store.delayBetweenChunks * word.join(" ").length));
                    await sendMessage(channelId, { content: word.join(" ") });
                }
            }, 0);

        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
        removeChatBarButton("vc-matt");
    },
});
