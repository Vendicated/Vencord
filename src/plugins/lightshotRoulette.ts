import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { Devs } from "@utils/contants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

function genUrl() {
    var url = "https://prnt.sc/";
    var string = "abcdefghijklmnoprstuxwyz0123456789";
    for (let i = 0; i < 6; i++) {
        url = url + string.charAt(Math.floor(Math.random() * string.length));
    }
    return url;
}

function creMsg(count) {
    var msg = "";
    for (let i = 0; i < count; i++) {
        msg = msg + `${genUrl()}\n`;
    }
    return msg;
}


// Borrowed from SpotifyShareCommands (Original creator is also credited)

const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");
const PendingReplyStore = findByPropsLazy("getPendingReply");

function sendMessage(channelId, message) {
    message = {
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    };
    const reply = PendingReplyStore.getPendingReply(channelId);
    MessageCreator.sendMessage(channelId, message, void 0, MessageCreator.getSendMessageOptionsForReply(reply))
        .then(() => {
            if (reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            }
        });
}

export default definePlugin({
    name: "Lightshot Roulette",
    description: "A port of an Aliucord plugin with the same name by mantikafasi.",
    authors: [Devs.Deltara, Devs.katlyn],
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "lightette",
        description: "Try your luck to see if you can find something interesting",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "count",
            description: "Note: Discord doesn't embed more than 5 URLs",
            type: ApplicationCommandOptionType.INTEGER,
            required: false
        }],
        execute: async (_, ctx) => {
            var count = findOption(_, "count", "");
            if (!count) count = 1;
            sendMessage(ctx.channel.id, {
                content: creMsg(count)
            });
        }
    }]
});
