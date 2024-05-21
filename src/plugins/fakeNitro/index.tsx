/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreEditListener, addPreSendListener, removePreEditListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Message } from "discord-types/general";
import type { ReactNode } from "react";

import { preEditListener, preSendListener } from "./listener";
import {
    handleGradientThemeSelect, handleProtoChange,
    patchFakeNitroEmojisOrRemoveStickersLinks,
    patchFakeNitroStickers,
    StickerStore
} from "./patch";
import { fakeNitroEmojiRegex, fakeNitroGifStickerRegex, fakeNitroStickerRegex, hyperLinkRegex } from "./regexes";
import { settings } from "./settings";
import { EmojiIntentions, FakeNoticeType } from "./types";

const IS_BYPASSEABLE_INTENTION = `[${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention)`;

export default definePlugin({
    name: "FakeNitro",
    authors: [Devs.Arjix, Devs.D3SOX, Devs.Ven, Devs.fawn, Devs.captain, Devs.Nuckyz, Devs.AutumnVN],
    description: "Allows you to stream in nitro quality, send fake emojis/stickers, use client themes and custom Discord notifications.",
    dependencies: ["MessageEventsAPI"],

    settings,

    patches: [
        {
            find: ".PREMIUM_LOCKED;",
            group: true,
            predicate: () => settings.store.enableEmojiBypass,
            replacement: [
                {
                    // Create a variable for the intention of using the emoji
                    match: /(?<=\.USE_EXTERNAL_EMOJIS.+?;)(?<=intention:(\i).+?)/,
                    replace: (_, intention) => `const fakeNitroIntention=${intention};`
                },
                {
                    // Disallow the emoji for external if the intention doesn't allow it
                    match: /&&!\i&&!\i(?=\)return \i\.\i\.DISALLOW_EXTERNAL;)/,
                    replace: m => `${m}&&!${IS_BYPASSEABLE_INTENTION}`
                },
                {
                    // Disallow the emoji for unavailable if the intention doesn't allow it
                    match: /!\i\.available(?=\)return \i\.\i\.GUILD_SUBSCRIPTION_UNAVAILABLE;)/,
                    replace: m => `${m}&&!${IS_BYPASSEABLE_INTENTION}`
                },
                {
                    // Disallow the emoji for premium locked if the intention doesn't allow it
                    match: /!\i\.\i\.canUseEmojisEverywhere\(\i\)/,
                    replace: m => `(${m}&&!${IS_BYPASSEABLE_INTENTION})`
                },
                {
                    // Allow animated emojis to be used if the intention allows it
                    match: /(?<=\|\|)\i\.\i\.canUseAnimatedEmojis\(\i\)/,
                    replace: m => `(${m}||${IS_BYPASSEABLE_INTENTION})`
                }
            ]
        },
        // Allows the usage of subscription-locked emojis
        {
            find: "isUnusableRoleSubscriptionEmoji:function",
            replacement: {
                match: /isUnusableRoleSubscriptionEmoji:function/,
                // Replace the original export with a func that always returns false and alias the original
                replace: "isUnusableRoleSubscriptionEmoji:()=>()=>false,isUnusableRoleSubscriptionEmojiOriginal:function"
            }
        },
        // Allow stickers to be sent everywhere
        {
            find: "canUseCustomStickersEverywhere:function",
            predicate: () => settings.store.enableStickerBypass,
            replacement: {
                match: /canUseCustomStickersEverywhere:function\(\i\){/,
                replace: "$&return true;"
            },
        },
        // Make stickers always available
        {
            find: '"SENDABLE"',
            predicate: () => settings.store.enableStickerBypass,
            replacement: {
                match: /\i\.available\?/,
                replace: "true?"
            }
        },
        // Allow streaming with high quality
        {
            find: "canUseHighVideoUploadQuality:function",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: [
                "canUseHighVideoUploadQuality",
                "canStreamQuality",
            ].map(func => {
                return {
                    match: new RegExp(`${func}:function\\(\\i(?:,\\i)?\\){`, "g"),
                    replace: "$&return true;"
                };
            })
        },
        // Remove boost requirements to stream with high quality
        {
            find: "STREAM_FPS_OPTION.format",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: ""
            }
        },
        // Allow client themes to be changeable
        {
            find: "canUseClientThemes:function",
            replacement: {
                match: /canUseClientThemes:function\(\i\){/,
                replace: "$&return true;"
            }
        },
        {
            find: '"UserSettingsProtoStore"',
            replacement: [
                {
                    // Overwrite incoming connection settings proto with our local settings
                    match: /CONNECTION_OPEN:function\((\i)\){/,
                    replace: (m, props) => `${m}$self.handleProtoChange(${props}.userSettingsProto,${props}.user);`
                },
                {
                    // Overwrite non local proto changes with our local settings
                    match: /let{settings:/,
                    replace: "arguments[0].local||$self.handleProtoChange(arguments[0].settings.proto);$&"
                }
            ]
        },
        // Call our function to handle changing the gradient theme when selecting a new one
        {
            find: ",updateTheme(",
            replacement: {
                match: /(function \i\(\i\){let{backgroundGradientPresetId:(\i).+?)(\i\.\i\.updateAsync.+?theme=(.+?),.+?},\i\))/,
                replace: (_, rest, backgroundGradientPresetId, originalCall, theme) => `${rest}$self.handleGradientThemeSelect(${backgroundGradientPresetId},${theme},()=>${originalCall});`
            }
        },
        {
            find: '["strong","em","u","text","inlineCode","s","spoiler"]',
            replacement: [
                {
                    // Call our function to decide whether the emoji link should be kept or not
                    predicate: () => settings.store.transformEmojis,
                    match: /1!==(\i)\.length\|\|1!==\i\.length/,
                    replace: (m, content) => `${m}||$self.shouldKeepEmojiLink(${content}[0])`
                },
                {
                    // Patch the rendered message content to add fake nitro emojis or remove sticker links
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(?=return{hasSpoilerEmbeds:\i,content:(\i)})/,
                    replace: (_, content) => `${content}=$self.patchFakeNitroEmojisOrRemoveStickersLinks(${content},arguments[2]?.formatInline);`
                }
            ]
        },
        {
            find: "renderEmbeds(",
            replacement: [
                {
                    // Call our function to decide whether the embed should be ignored or not
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(renderEmbeds\((\i)\){)(.+?embeds\.map\((\i)=>{)/,
                    replace: (_, rest1, message, rest2, embed) => `${rest1}const fakeNitroMessage=${message};${rest2}if($self.shouldIgnoreEmbed(${embed},fakeNitroMessage))return null;`
                },
                {
                    // Patch the stickers array to add fake nitro stickers
                    predicate: () => settings.store.transformStickers,
                    match: /(?<=renderStickersAccessories\((\i)\){let (\i)=\(0,\i\.\i\)\(\i\).+?;)/,
                    replace: (_, message, stickers) => `${stickers}=$self.patchFakeNitroStickers(${stickers},${message});`
                },
                {
                    // Filter attachments to remove fake nitro stickers or emojis
                    predicate: () => settings.store.transformStickers,
                    match: /renderAttachments\(\i\){let{attachments:(\i).+?;/,
                    replace: (m, attachments) => `${m}${attachments}=$self.filterAttachments(${attachments});`
                }
            ]
        },
        {
            find: ".Messages.STICKER_POPOUT_UNJOINED_PRIVATE_GUILD_DESCRIPTION.format",
            predicate: () => settings.store.transformStickers,
            replacement: [
                {
                    // Export the renderable sticker to be used in the fake nitro sticker notice
                    match: /let{renderableSticker:(\i).{0,250}isGuildSticker.+?channel:\i,/,
                    replace: (m, renderableSticker) => `${m}fakeNitroRenderableSticker:${renderableSticker},`
                },
                {
                    // Add the fake nitro sticker notice
                    match: /(let \i,{sticker:\i,channel:\i,closePopout:\i.+?}=(\i).+?;)(.+?description:)(\i)(?=,sticker:\i)/,
                    replace: (_, rest, props, rest2, reactNode) => `${rest}let{fakeNitroRenderableSticker}=${props};${rest2}$self.addFakeNotice(${FakeNoticeType.Sticker},${reactNode},!!fakeNitroRenderableSticker?.fake)`
                }
            ]
        },
        {
            find: ".EMOJI_UPSELL_POPOUT_MORE_EMOJIS_OPENED,",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                // Export the emoji node to be used in the fake nitro emoji notice
                match: /isDiscoverable:\i,shouldHideRoleSubscriptionCTA:\i,(?<={node:(\i),.+?)/,
                replace: (m, node) => `${m}fakeNitroNode:${node},`
            }
        },
        {
            find: ".Messages.EMOJI_POPOUT_UNJOINED_DISCOVERABLE_GUILD_DESCRIPTION",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                // Add the fake nitro emoji notice
                match: /(?<=emojiDescription:)(\i)(?<=\1=\i\((\i)\).+?)/,
                replace: (_, reactNode, props) => `$self.addFakeNotice(${FakeNoticeType.Emoji},${reactNode},!!${props}?.fakeNitroNode?.fake)`
            }
        },
        // Allow using custom app icons
        {
            find: "canUsePremiumAppIcons:function",
            replacement: {
                match: /canUsePremiumAppIcons:function\(\i\){/,
                replace: "$&return true;"
            }
        },
        // Separate patch for allowing using custom app icons
        {
            find: ".FreemiumAppIconIds.DEFAULT&&(",
            replacement: {
                match: /\i\.\i\.isPremium\(\i\.\i\.getCurrentUser\(\)\)/,
                replace: "true"
            }
        },
        // Make all Soundboard sounds available
        {
            find: 'type:"GUILD_SOUNDBOARD_SOUND_CREATE"',
            replacement: {
                match: /(?<=type:"(?:SOUNDBOARD_SOUNDS_RECEIVED|GUILD_SOUNDBOARD_SOUND_CREATE|GUILD_SOUNDBOARD_SOUND_UPDATE|GUILD_SOUNDBOARD_SOUNDS_UPDATE)".+?available:)\i\.available/g,
                replace: "true"
            }
        },
        // Allow using custom notification sounds
        {
            find: "canUseCustomNotificationSounds:function",
            replacement: {
                match: /canUseCustomNotificationSounds:function\(\i\){/,
                replace: "$&return true;"
            }
        }
    ],

    handleProtoChange,
    handleGradientThemeSelect,
    patchFakeNitroEmojisOrRemoveStickersLinks,
    patchFakeNitroStickers,

    shouldIgnoreEmbed(embed: Message["embeds"][number], message: Message) {
        const contentItems = message.content.split(/\s/);
        if (contentItems.length > 1 && !settings.store.transformCompoundSentence) return false;

        switch (embed.type) {
            case "image": {
                if (
                    !settings.store.transformCompoundSentence
                    && !contentItems.some(item => item === embed.url! || item.match(hyperLinkRegex)?.[1] === embed.url!)
                ) return false;

                if (settings.store.transformEmojis) {
                    if (fakeNitroEmojiRegex.test(embed.url!)) return true;
                }

                if (settings.store.transformStickers) {
                    if (fakeNitroStickerRegex.test(embed.url!)) return true;

                    const gifMatch = embed.url!.match(fakeNitroGifStickerRegex);
                    if (gifMatch) {
                        // There is no way to differentiate a regular gif attachment from a fake nitro animated sticker, so we check if the StickerStore contains the id of the fake sticker
                        if (StickerStore.getStickerById(gifMatch[1])) return true;
                    }
                }

                break;
            }
        }

        return false;
    },

    filterAttachments(attachments: Message["attachments"]) {
        return attachments.filter(attachment => {
            if (attachment.content_type !== "image/gif") return true;

            const match = attachment.url.match(fakeNitroGifStickerRegex);
            if (match) {
                // There is no way to differentiate a regular gif attachment from a fake nitro animated sticker, so we check if the StickerStore contains the id of the fake sticker
                if (StickerStore.getStickerById(match[1])) return false;
            }

            return true;
        });
    },

    shouldKeepEmojiLink(link: any) {
        return link.target && fakeNitroEmojiRegex.test(link.target);
    },

    addFakeNotice(type: FakeNoticeType, node: Array<ReactNode>, fake: boolean) {
        if (!fake) return node;

        node = Array.isArray(node) ? node : [node];

        switch (type) {
            case FakeNoticeType.Sticker: {
                node.push(" This is a FakeNitro sticker and renders like a real sticker only for you. Appears as a link to non-plugin users.");

                return node;
            }
            case FakeNoticeType.Emoji: {
                node.push(" This is a FakeNitro emoji and renders like a real emoji only for you. Appears as a link to non-plugin users.");

                return node;
            }
        }
    },

    start() {
        const s = settings.store;

        if (!s.enableEmojiBypass && !s.enableStickerBypass) {
            return;
        }

        this.preSend = addPreSendListener(preSendListener);
        this.preEdit = addPreEditListener(preEditListener);
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
});

