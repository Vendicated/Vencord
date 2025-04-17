import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import definePlugin, { OptionType } from "@utils/types";
import { CatIcon } from "./caticon";
import { definePluginSettings } from "@api/Settings";
import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { Devs } from "@utils/constants";


export const settings = definePluginSettings({
    // spaceChance: {
    //     type: OptionType.SLIDER,
    //     markers: makeRange(0, 1, 0.1),
    //     default: 0.1,
    //     description: "Chance to insert spaces into words",
    // },
    // replaceChance: {
    //     type: OptionType.SLIDER,
    //     markers: makeRange(0, 1, 0.1),
    //     default: 0.4,
    //     description: "chance for nearby key replacements",
    // },
    cat: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "jfkasdflafhuel"
    }
});

function generateRandomString(length: number, isUpperCase = false) {
    const patterns = [
        "mraow", "mrow", "mew", "mrr", "purr", "raow", "rrow", "nya", "merp",
        "mee", "mewo", "meo", "mewmraow", "mraowmew", "mewmrow", "mraowmrow",
        "mewmraowmew", "mewmrrpurr", "nyamraow", "meomew", "nyamewo", "mrrpurrmew"
    ];

    let result = '';
    for (let i = 0; i < length; i++) {
        const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
        result += isUpperCase ? randomPattern.toUpperCase() : randomPattern;
    }
    return result;
}

function generateMrrpString(min: number, max: number, isUpperCase: boolean = false, count: number) {
    const mrrps = [];
    for (let i = 0; i < count; i++) {
        const randomNumber = min + Math.floor(Math.random() * (max - min + 1));
        //@ts-ignore
        mrrps.push(generateRandomString(randomNumber, isUpperCase));
    }
    return mrrps.join(' ');
}
function processString(input: string): string {
    return input.replace(/(?:https?:\/\/\S+|\[.*?\]\(https?:\/\/.*?\)|<a?:\w+:\d+>)|(\b\w+\b)/g, (match, word) => {
        if (word) {
            const isUpperCase = word === word.toUpperCase();
            return generateRandomString(Math.ceil(word.length / 4), isUpperCase);
        }
        return match; // Keep URLs, Markdown links, and Discord emojis unchanged
    });
}


export default definePlugin({
    name: "Cat",
    description: "BECOME CAT",
    authors: [Devs.tally],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],
    settings,

    start() {

        addChatBarButton("vc-cat", CatIcon);


        this.preSend = addMessagePreSendListener(async (_, message) => {
            if (!message.content || !settings.store.cat) return;

            message.content = processString(message.content);
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
        removeChatBarButton("vc-cat");
    },
});
