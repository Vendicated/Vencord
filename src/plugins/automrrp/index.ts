import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

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

export default definePlugin({
    name: "Auto Mrrp",
    description: "Uwuifies your messages on send!",
    authors: [Devs.tally],
    dependencies: ["MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI", "ChatInputButtonAPI"],

    start() {
        this.preSend = addMessagePreSendListener(async (_, message) => {
            if (!message.content) return;

            // Match mrrp x, mrrp x-y, or mrrp x/y-z
            message.content = message.content.replace(/(mrrp|MRRP) (\d+)(\/(\d+))?(-(\d+))?/g, (_, prefix, min, __, maxSplit, ___, count) => {
                const isUpperCase = prefix === 'MRRP';
                const minNumber = Number(min);
                const maxNumber = maxSplit ? Number(maxSplit) : minNumber;
                const mrrpCount = count ? Number(count) : 1;

                return generateMrrpString(minNumber, maxNumber, isUpperCase, mrrpCount);
            });
        });
    },

    stop() {
        removeMessagePreSendListener(this.preSend);
    },
});
