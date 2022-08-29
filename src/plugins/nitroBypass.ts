import { addSendListener, addEditListener } from "../api/MessageEvents";
import { findByProps } from "../utils/webpack";
import definePlugin from "../utils/types"

export default definePlugin({
    name: "Nitro Bypass",
    author: "ArjixWasTaken",
    description: "Allows you to stream in nitro quality and send fake emojis.",
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
        const { getCustomEmojiById } = findByProps("getCustomEmojiById");

        // Remove any nitro requirements for any of the streaming settings.
        findByProps("ApplicationStreamPresets")
          .ApplicationStreamSettingRequirements
          .forEach(x => {
            delete x.userPremiumType;
            delete x.guildPremiumTier
        });

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
    },
})
