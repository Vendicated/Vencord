import definePlugin from "../utils/types";
import { findByProps } from "../webpack";

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Embeds message links",
    authors: [{
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    patches: [{
        find: "[\"disableReactionReads\"",
        replacement: {
            match: /var (.{1,2})=(.{1,2})\.channel,(.{1,2})=.{1,2}\.message,(.{1,2})=.{1,2}\.renderSuppressEmbeds/,
            replace: "const msgLink=$2.message.content?.match(Vencord.Plugins.plugins.MessageLinkEmbeds.messageLinkRegex) &&\
            $2.message.content.match(Vencord.Plugins.plugins.MessageLinkEmbeds.messageLinkRegex)[3];\
            if(msgLink)$2.message.embeds=[...$2.message.embeds,\
            Vencord.Plugins.plugins.MessageLinkEmbeds.generateEmbed(msgLink, $2.message.embeds)].filter(item=>item);\
            var $1=$2.channel,$3=$2.message,$4=$2.renderSuppressEmbeds"
        }
    }],

    messageLinkRegex: /https?:\/\/(canary\.|ptb\.)?discord(app)?\.com\/channels\/(\d{17,20}\/\d{17,20}\/\d{17,20})/,
    generateEmbed(messageURL: string, existingEmbeds: any[]) {
        const [_, channelID, messageID] = messageURL.split("/");
        if (existingEmbeds.find(i => i.id === `messageLinkEmbeds-${messageID}`)) return null;
        const message = findByProps("getMessage").getMessage(channelID, messageID);
        if (!message) return null;
        return {
            author: {
                iconProxyURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}`,
                iconURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}`,
                name: message.author.username
            },
            image: message.attachments.length != 0 ? {
                height: message.attachments[0].height,
                width: message.attachments[0].width,
                url: message.attachments[0].url,
                proxyURL: message.attachments[0].proxy_url
            } : null,
            rawDescription: message.content,
            footer: {
                text: "#" + findByProps("getChannel").getChannel(channelID).name
            },
            id: `messageLinkEmbeds-${messageID}`,
            fields: [],
            type: "rich"
        };
    }
});
