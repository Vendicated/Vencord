import { MessageStore, GuildMemberStore, ChannelStore, GuildStore } from "../webpack/common";
import { waitFor } from "../webpack";
import definePlugin from "../utils/types";
import { Embed } from "discord-types/general";

const replacement = `
const msgLink = $2.message.content?.match(Vencord.Plugins.plugins.MessageLinkEmbeds.messageLinkRegex)?.[1];

if (msgLink) {
    $2.message.embeds = [
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
function fetchMessage(channelId: string, messageId: string) {
    // function can be called immediately after load, meaning that without a timeout it would be fetching messages that should be cached
    if (hasJustStarted) {
        setTimeout(() => {
            if (MessageStore.getMessage(channelId, messageId)) return;
            fetchMessages({
                channelId,
                // "jump" means to fetch messages around it
                jump: messageId,
                limit: 3
            });
        }, 300);
        hasJustStarted = false;
    }
    else fetchMessages({
        channelId,
        jump: messageId,
        limit: 3
    });
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
        if (message.attachments[0] && !message.attachments[0].content_type!.startsWith("video/")) return {
            height: message.attachments[0].height,
            width: message.attachments[0].width,
            url: message.attachments[0].url,
            proxyURL: message.attachments[0].proxy_url!!
        };
        const firstEmbed = message.embeds[0];
        if (!firstEmbed) return null;
        if (firstEmbed.type === "image" || (firstEmbed.type === "rich" && firstEmbed.image)) return { ...firstEmbed.image };
        if (firstEmbed.type === "gifv" && !firstEmbed.url!.match(/https:\/\/(?:www.)?tenor\.com/)) return {
            height: firstEmbed.thumbnail!.height,
            width: firstEmbed.thumbnail!.width,
            url: firstEmbed.url
        };
        return null;
    },

    generateEmbed(messageURL: string, existingEmbeds: Embed[]) {
        const [guildID, channelID, messageID] = messageURL.split("/");
        if (existingEmbeds.find(i => i.id === `messageLinkEmbeds-${messageID}`)) return [...existingEmbeds];
        const message = MessageStore.getMessage(channelID, messageID);
        if (existingEmbeds.find(i => i.id === "messageLinkEmbeds-1")) {
            if (!message) return [...existingEmbeds];
            else existingEmbeds = existingEmbeds.filter(i => i.id !== "messageLinkEmbeds-1");
        }
        if (!message) {
            fetchMessage(channelID, messageID);
            return [...existingEmbeds, {
                author: {
                    name: "Clyde#0000",
                    // is it a bad idea to hardcode the clyde pfp like this?
                    // couldn't find a variable for its link anywhere
                    iconURL: "https://discord.com/assets/18126c8a9aafeefa76bbb770759203a9.png",
                    iconProxyURL: "https://discord.com/assets/18126c8a9aafeefa76bbb770759203a9.png"
                },
                rawDescription: "Failed to fetch message",
                id: "messageLinkEmbeds-1",
                fields: [],
                type: "rich"
            }];
        }

        const hasActualEmbed = !!(message.author.bot && message.embeds[0]?.type === "rich" && message.embeds[0].id.match(/embed_\d+/));

        const embeds = [...existingEmbeds, {
            author: {
                iconProxyURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                iconURL: `https://${window.GLOBAL_ENV.CDN_HOST}/avatars/${message.author.id}/${message.author.avatar}`,
                name: `${message.author.username}#${message.author.discriminator}${hasActualEmbed && message.embeds[0].author ?
                    ` | ${message.embeds[0].author?.name}` : ""}`,
                url: hasActualEmbed ? message.embeds[0].author?.url! : undefined,
            },
            color: hasActualEmbed ? message.embeds[0].color : GuildMemberStore.getMember(guildID, message.author.id)?.colorString,
            image: this.getImage(message),
            rawDescription: hasActualEmbed && message.embeds[0].rawDescription.length ? message.embeds[0].rawDescription :
                message.content.length ? message.content :
                    `[no content, ${message.attachments.length} attachment${message.attachments.length !== 1 ? "s" : ""}]`,
            footer: {
                text: guildID === "@me" ? "Direct Message" :
                    "#" + ChannelStore.getChannel(channelID).name +
                    ` (${GuildStore.getGuild(guildID).name})${hasActualEmbed ?
                        // apparently embeds don't have footers?
                        // @ts-expect-error
                        ` | ${message.embeds[0].footer?.text || ""}` : ""}`,
                // @ts-expect-error
                iconURL: hasActualEmbed ? message.embeds[0].footer?.iconURL : undefined,
            },
            rawTitle: hasActualEmbed ? message.embeds[0].rawTitle : undefined,
            thumbnail: hasActualEmbed ? { ...message.embeds[0].thumbnail } : undefined,
            timestamp: message.timestamp,
            id: `messageLinkEmbeds-${messageID}`,
            fields: [],
            type: "rich"
        }];

        return embeds;
    }
});
