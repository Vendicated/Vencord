import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import definePlugin, { OptionType } from "@utils/types";
import { RobloxIconFactory } from "./robloxicon";
import { definePluginSettings } from "@api/Settings";
import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";


export const settings = definePluginSettings({
    lengthMultiplier: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.05),
        default: 0.1,
        description: "multiplier for length to replace a word",
    }, baseRepalcementChance: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 0.1,
        description: "base chance to reply (basically a minimum)",
    },
    maxReplaceChance: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 1, 0.1),
        default: 1,
        description: "maximum chance to replace a word",
    },
    filter: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "#######################"
    }
});

function processString(input: string): string {
    return input.replace(/(?:https?:\/\/\S+|\[.*?\]\(https?:\/\/.*?\)|<a?:\w+:\d+>)|(\b\w+\b)/g, (match, word) => {
        if (word) {
            const length = word.length;
            const censorChance = Math.min(settings.store.maxReplaceChance, settings.store.baseRepalcementChance + settings.store.lengthMultiplier * length); // uncapped, gets wild fast
            const extraSus = /[\d@$#%&]/.test(word) ? 0.2 : 0;
            const finalChance = censorChance + extraSus;

            if (Math.random() < finalChance) {
                return "#".repeat(length);
            }

            return word;
        }
        return match; // Keep URLs, Markdown links, and Discord emojis unchanged
    });
}


export default definePlugin({
    name: "Roblox filter",
    description: "#### ### ###### ## #######",
    authors: [Devs.tally],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],
    settings,

    start() {

        addChatBarButton("vc-roblox", RobloxIconFactory);


        this.preSend = addMessagePreSendListener(async (_, message) => {
            if (!message.content || !settings.store.filter) return;

            message.content = processString(message.content);
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
        removeChatBarButton("vc-roblox");
    },
});
