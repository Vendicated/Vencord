const { addSendListener, addEditListener } = require("../api/MessageSendAndEditApi")
const { findByProps } = require("../utils/webpack");

module.exports = {
    name: "Nitro Bypass",
    patches: [
        ...[
            "canUseAnimatedEmojis",
            "canUseEmojisEverywhere",
            "canUseHigherFramerate"
        ].map(func => {
            return {
                find: `${func}:function`,
                replacement: {
                    match: new RegExp(`${func}:function\\(.+?}`),
                    replace: `${func}:function (e) { return true; }`
                }
            }
        }),
    ],
    start() {
        const { getCustomEmojiById } = findByProps("getCustomEmojiById")
        Vencord.Webpack.findByProps("ApplicationStreamPresets").ApplicationStreamSettingRequirements.forEach(x => { delete x.userPremiumType; delete x.guildPremiumTier }) 

        addSendListener((_, messageObj) => {
            const guildId = window.location.href.split("channels/")[1].split("/")[0];
            for (const emoji of messageObj.validNonShortcutEmojis) {
                if (!emoji.require_colons) continue;
                if (emoji.guildId === guildId && !emoji.animated) continue;

                const emojiString = `<${emoji.animated ? 'a' : ''}:${emoji.originalName || emoji.name}:${emoji.id}>`;
                const url = emoji.url.replace(/\?size=[0-9]+/, `?size=48`);
                messageObj.content = messageObj.content.replace(emojiString, ` ${url} `);
            }
        })
        addEditListener((_, __, messageObj) => {
            const guildId = window.location.href.split("channels/")[1].split("/")[0];

            for (const [emojiStr, _, emojiId] of messageObj.content.matchAll(/(?<!\\)<a?:(\w+):(\d+)>/ig)) {
                const emoji = getCustomEmojiById(emojiId);
                if (emoji == null || (emoji.guildId === guildId && !emoji.animated)) continue;

                const url = emoji.url.replace(/\?size=[0-9]+/, `?size=48`);
                messageObj.content = messageObj.content.replace(emojiStr, ` ${url} `);
            }
        })
    }
};
