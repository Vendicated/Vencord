import { MessageStore, GuildMemberStore, ChannelStore, GuildStore } from "../webpack/common";
import { waitFor } from "../webpack";
import definePlugin from "../utils/types";

const replacement = `
const msgLink = $2.message.content?.match(Vencord.Plugins.plugins.MessageLinkEmbeds.messageLinkRegex)?.[1];

if (msgLink) {
    $2.message.embeds = [
        ...$2.message.embeds,
        ...Vencord.Plugins.plugins.MessageLinkEmbeds
          .generateEmbed(msgLink, $2.message.embeds)
    ].filter(item => item);
};

var
  $1 = $2.channel,
  $3 = $2.message,
  $4 = $2.renderSuppressEmbeds /* Don't add a semicolon here, there are more definitions after this. */
`.trim().replace(/(?<=[^(?:const)|(?:var)])\s+/gm, "");

let fetchMessages;
waitFor(["fetchMessages", "editMessage"], _ => ({ fetchMessages } = _));
let hasJustStarted = true;
const messagesFetched: string[] = [];
function fetchMessage(channelId: string, messageId: string) {
    if (messagesFetched.includes(messageId)) return;
    // function can be called immediately after load, meaning that without a timeout it would be fetching messages that should be cached
    if (hasJustStarted) {
        setTimeout(() => {
            if (MessageStore.getMessage(channelId, messageId)) return;
            fetchMessages({
                channelId,
                // "jump" means to fetch messages around it
                jump: messageId,
                limit: 1
            });
        }, 300);
        hasJustStarted = false;
    }
    else fetchMessages({
        channelId,
        jump: messageId,
        limit: 1
    });
    messagesFetched.push(messageId);
}

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Embeds message links",
    authors: [{
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    patches: [{
        find: "_messageAttachmentToEmbedMedia",
        replacement: {
            match: /var (.{1,2})=(.{1,2})\.channel,(.{1,2})=.{1,2}\.message,(.{1,2})=.{1,2}\.renderSuppressEmbeds/,
            replace: replacement
        }
    }],

    messageLinkRegex: /https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/((?:\d{17,19}|@me)\/\d{17,19}\/\d{17,19})/,

    getImage(message: any) {
        if (message.attachments.length !== 0 && !message.attachments[0].content_type.startsWith("video/")) return {
            height: message.attachments[0].height,
            width: message.attachments[0].width,
            url: message.attachments[0].url,
            proxyURL: message.attachments[0].proxy_url!!
        };
        const firstEmbed = message.embeds[0];
        if (!firstEmbed) return null;
        if (firstEmbed.type === "image") return { ...firstEmbed.image };
        if (firstEmbed.type === "gifv" && !firstEmbed.url.match(/https:\/\/(?:www.)?tenor\.com/)) return {
            height: firstEmbed.thumbnail.height,
            width: firstEmbed.thumbnail.width,
            url: firstEmbed.url
        };
        return null;
    },

    generateEmbed(messageURL: string, existingEmbeds: any[]) {
        const [guildID, channelID, messageID] = messageURL.split("/");
        if (existingEmbeds.find(i => i.id === `messageLinkEmbeds-${messageID}`)) return [];
        const message = MessageStore.getMessage(channelID, messageID);
        if (!message) {
            fetchMessage(channelID, messageID);
            // think its fine to return no embed instead of awaiting here considering the function is called every render
            return [];
        }

        const embeds = [{
            author: {
                iconProxyURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                iconURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                name: `${message.author.username}#${message.author.discriminator}`
            },
            color: GuildMemberStore.getMember(guildID, message.author.id)?.colorString,
            image: this.getImage(message),
            rawDescription: message.content.length > 0 ? message.content :
                `[no content, ${message.attachments.length} attachment${message.attachments.length !== 1 ? "s" : ""}]`,
            footer: {
                text: "#" + ChannelStore.getChannel(channelID).name +
                    ` (${GuildStore.getGuild(guildID).name})`
            },
            timestamp: message.timestamp,
            id: `messageLinkEmbeds-${messageID}`,
            fields: [],
            type: "rich"
        }];

        return embeds;
    }
});
