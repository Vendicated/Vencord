/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addPreEditListener, addPreSendListener, removePreEditListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings, migratePluginSettings, Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import { ApngDisposeOp, getGifEncoder, importApngJs } from "@utils/dependencies";
import { getCurrentGuild } from "@utils/discord";
import { proxyLazy } from "@utils/proxyLazy";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode, findByCodeLazy, findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, PermissionStore, UserStore } from "@webpack/common";
import type { Message } from "discord-types/general";

const DRAFT_TYPE = 0;
const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");
const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
const PreloadedUserSettingsProtoHandler = findLazy(m => m.ProtoClass?.typeName === "discord_protos.discord_users.v1.PreloadedUserSettings");
const ReaderFactory = findByPropsLazy("readerFactory");
const MessageElementsParser = proxyLazy(() => findByCode(".emojiTooltipPosition,")?.({}));
const StickerStore = findStoreLazy("StickersStore") as {
    getPremiumPacks(): StickerPack[];
    getAllGuildStickers(): Map<string, Sticker[]>;
    getStickerById(id: string): Sticker | undefined;
};
const EmojiStore = findStoreLazy("EmojiStore");


function searchProtoClass(localName: string, parentProtoClass: any) {
    if (!parentProtoClass) return;

    const field = parentProtoClass.fields.find(field => field.localName === localName);
    if (!field) return;

    const getter: any = Object.values(field).find(value => typeof value === "function");
    return getter?.();
}

const AppearanceSettingsProto = proxyLazy(() => searchProtoClass("appearance", PreloadedUserSettingsProtoHandler.ProtoClass));
const ClientThemeSettingsProto = proxyLazy(() => searchProtoClass("clientThemeSettings", AppearanceSettingsProto));

const USE_EXTERNAL_EMOJIS = 1n << 18n;
const USE_EXTERNAL_STICKERS = 1n << 37n;

enum EmojiIntentions {
    REACTION = 0,
    STATUS = 1,
    COMMUNITY_CONTENT = 2,
    CHAT = 3,
    GUILD_STICKER_RELATED_EMOJI = 4,
    GUILD_ROLE_BENEFIT_EMOJI = 5,
    COMMUNITY_CONTENT_ONLY = 6,
    SOUNDBOARD = 7
}

interface BaseSticker {
    available: boolean;
    description: string;
    format_type: number;
    id: string;
    name: string;
    tags: string;
    type: number;
}
interface GuildSticker extends BaseSticker {
    guild_id: string;
}
interface DiscordSticker extends BaseSticker {
    pack_id: string;
}
type Sticker = GuildSticker | DiscordSticker;

interface StickerPack {
    id: string;
    name: string;
    sku_id: string;
    description: string;
    cover_sticker_id: string;
    banner_asset_id: string;
    stickers: Sticker[];
}

const fakeNitroEmojiRegex = /\/emojis\/(\d+?)\.(png|webp|gif)/;
const fakeNitroStickerRegex = /\/stickers\/(\d+?)\./;
const fakeNitroGifStickerRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/;
const fakeNitroNameRegex = /(?:\?|&)name=(\w+)/;

const settings = definePluginSettings({
    enableEmojiBypass: {
        description: "Allow sending fake emojis",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    emojiSize: {
        description: "Size of the emojis when sending",
        type: OptionType.SLIDER,
        default: 48,
        markers: [32, 48, 64, 128, 160, 256, 512]
    },
    transformEmojis: {
        description: "Whether to transform fake emojis into real ones",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    enableStickerBypass: {
        description: "Allow sending fake stickers",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    stickerSize: {
        description: "Size of the stickers when sending",
        type: OptionType.SLIDER,
        default: 160,
        markers: [32, 64, 128, 160, 256, 512]
    },
    transformStickers: {
        description: "Whether to transform fake stickers into real ones",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    enableStreamQualityBypass: {
        description: "Allow streaming in nitro quality",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

migratePluginSettings("FakeNitro", "NitroBypass");

export default definePlugin({
    name: "FakeNitro",
    authors: [Devs.Arjix, Devs.D3SOX, Devs.Ven, Devs.obscurity, Devs.captain, Devs.Nuckyz],
    description: "Allows you to stream in nitro quality, send fake emojis/stickers and use client themes.",
    dependencies: ["MessageEventsAPI"],

    settings,

    patches: [
        {
            find: ".PREMIUM_LOCKED;",
            predicate: () => settings.store.enableEmojiBypass,
            replacement: [
                {
                    match: /(?<=(\i)=\i\.intention)/,
                    replace: (_, intention) => `,fakeNitroIntention=${intention}`
                },
                {
                    match: /\.(?:canUseEmojisEverywhere|canUseAnimatedEmojis)\(\i(?=\))/g,
                    replace: '$&,typeof fakeNitroIntention!=="undefined"?fakeNitroIntention:void 0'
                },
                {
                    match: /(&&!\i&&)!(\i)(?=\)return \i\.\i\.DISALLOW_EXTERNAL;)/,
                    replace: (_, rest, canUseExternal) => `${rest}(!${canUseExternal}&&(typeof fakeNitroIntention==="undefined"||![${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention)))`
                }
            ]
        },
        {
            find: "canUseAnimatedEmojis:function",
            predicate: () => settings.store.enableEmojiBypass,
            replacement: {
                match: /((?:canUseEmojisEverywhere|canUseAnimatedEmojis):function\(\i)\){(.+?\))/g,
                replace: (_, rest, premiumCheck) => `${rest},fakeNitroIntention){${premiumCheck}||fakeNitroIntention==null||[${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention)`
            }
        },
        {
            find: "canUseStickersEverywhere:function",
            predicate: () => settings.store.enableStickerBypass,
            replacement: {
                match: /canUseStickersEverywhere:function\(\i\){/,
                replace: "$&return true;"
            },
        },
        {
            find: "\"SENDABLE\"",
            predicate: () => settings.store.enableStickerBypass,
            replacement: {
                match: /(\w+)\.available\?/,
                replace: "true?"
            }
        },
        {
            find: "canStreamHighQuality:function",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: [
                "canUseHighVideoUploadQuality",
                "canStreamHighQuality",
                "canStreamMidQuality"
            ].map(func => {
                return {
                    match: new RegExp(`${func}:function\\(\\i\\){`),
                    replace: "$&return true;"
                };
            })
        },
        {
            find: "STREAM_FPS_OPTION.format",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: {
                match: /(userPremiumType|guildPremiumTier):.{0,10}TIER_\d,?/g,
                replace: ""
            }
        },
        {
            find: "canUseClientThemes:function",
            replacement: {
                match: /canUseClientThemes:function\(\i\){/,
                replace: "$&return true;"
            }
        },
        {
            find: '.displayName="UserSettingsProtoStore"',
            replacement: [
                {
                    match: /CONNECTION_OPEN:function\((\i)\){/,
                    replace: (m, props) => `${m}$self.handleProtoChange(${props}.userSettingsProto,${props}.user);`
                },
                {
                    match: /=(\i)\.local;/,
                    replace: (m, props) => `${m}${props}.local||$self.handleProtoChange(${props}.settings.proto);`
                }
            ]
        },
        {
            find: "updateTheme:function",
            replacement: {
                match: /(function \i\(\i\){var (\i)=\i\.backgroundGradientPresetId.+?)(\i\.\i\.updateAsync.+?theme=(.+?);.+?\),\i\))/,
                replace: (_, rest, backgroundGradientPresetId, originalCall, theme) => `${rest}$self.handleGradientThemeSelect(${backgroundGradientPresetId},${theme},()=>${originalCall});`
            }
        },
        {
            find: '["strong","em","u","text","inlineCode","s","spoiler"]',
            replacement: [
                {
                    predicate: () => settings.store.transformEmojis,
                    match: /1!==(\i)\.length\|\|1!==\i\.length/,
                    replace: (m, content) => `${m}||$self.shouldKeepEmojiLink(${content}[0])`
                },
                {
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(?=return{hasSpoilerEmbeds:\i,content:(\i)})/,
                    replace: (_, content) => `${content}=$self.patchFakeNitroEmojisOrRemoveStickersLinks(${content},arguments[2]?.formatInline);`
                }
            ]
        },
        {
            find: "renderEmbeds=function",
            replacement: [
                {
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(renderEmbeds=function\((\i)\){)(.+?embeds\.map\(\(function\((\i)\){)/,
                    replace: (_, rest1, message, rest2, embed) => `${rest1}const fakeNitroMessage=${message};${rest2}if($self.shouldIgnoreEmbed(${embed},fakeNitroMessage))return null;`
                },
                {
                    predicate: () => settings.store.transformStickers,
                    match: /renderStickersAccessories=function\((\i)\){var (\i)=\(0,\i\.\i\)\(\i\),/,
                    replace: (m, message, stickers) => `${m}${stickers}=$self.patchFakeNitroStickers(${stickers},${message}),`
                },
                {
                    predicate: () => settings.store.transformStickers,
                    match: /renderAttachments=function\(\i\){var (\i)=\i.attachments.+?;/,
                    replace: (m, attachments) => `${m}${attachments}=$self.filterAttachments(${attachments});`
                }
            ]
        },
        {
            find: ".STICKER_IN_MESSAGE_HOVER,",
            predicate: () => settings.store.transformStickers,
            replacement: [
                {
                    match: /var (\i)=\i\.renderableSticker,.{0,50}closePopout.+?channel:\i,closePopout:\i,/,
                    replace: (m, renderableSticker) => `${m}renderableSticker:${renderableSticker},`
                },
                {
                    match: /emojiSection.{0,50}description:\i(?<=(\i)\.sticker,.+?)(?=,)/,
                    replace: (m, props) => `${m}+(${props}.renderableSticker?.fake?" This is a Fake Nitro sticker. Only you can see it rendered like a real one, for non Vencord users it will show as a link.":"")`
                }
            ]
        },
        {
            find: ".Messages.EMOJI_POPOUT_PREMIUM_JOINED_GUILD_DESCRIPTION",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                match: /((\i)=\i\.node,\i=\i\.emojiSourceDiscoverableGuild)(.+?return) (.{0,450}Messages\.EMOJI_POPOUT_PREMIUM_JOINED_GUILD_DESCRIPTION.+?}\))/,
                replace: (_, rest1, node, rest2, messages) => `${rest1},fakeNitroNode=${node}${rest2}(${messages})+(fakeNitroNode.fake?" This is a Fake Nitro emoji. Only you can see it rendered like a real one, for non Vencord users it will show as a link.":"")`
            }
        }
    ],

    options: {
        enableEmojiBypass: {
            description: "Allow sending fake emojis",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        emojiSize: {
            description: "Size of the emojis when sending",
            type: OptionType.SLIDER,
            default: 48,
            markers: [32, 48, 64, 128, 160, 256, 512],
        },
        transformEmojis: {
            description: "Whether to transform fake emojis into real ones",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        enableStickerBypass: {
            description: "Allow sending fake stickers",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        stickerSize: {
            description: "Size of the stickers when sending",
            type: OptionType.SLIDER,
            default: 160,
            markers: [32, 64, 128, 160, 256, 512],
        },
        enableStreamQualityBypass: {
            description: "Allow streaming in nitro quality",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        }
    },

    get guildId() {
        return getCurrentGuild()?.id;
    },

    get canUseEmotes() {
        return (UserStore.getCurrentUser().premiumType ?? 0) > 0;
    },

    get canUseStickers() {
        return (UserStore.getCurrentUser().premiumType ?? 0) > 1;
    },

    handleProtoChange(proto: any, user: any) {
        if ((!proto.appearance && !AppearanceSettingsProto) || !UserSettingsProtoStore) return;

        const premiumType: number = user?.premium_type ?? UserStore?.getCurrentUser()?.premiumType ?? 0;

        if (premiumType !== 2) {
            proto.appearance ??= AppearanceSettingsProto.create();

            if (UserSettingsProtoStore.settings.appearance?.theme != null) {
                proto.appearance.theme = UserSettingsProtoStore.settings.appearance.theme;
            }

            if (UserSettingsProtoStore.settings.appearance?.clientThemeSettings?.backgroundGradientPresetId?.value != null && ClientThemeSettingsProto) {
                const clientThemeSettingsDummyProto = ClientThemeSettingsProto.create({
                    backgroundGradientPresetId: {
                        value: UserSettingsProtoStore.settings.appearance.clientThemeSettings.backgroundGradientPresetId.value
                    }
                });

                proto.appearance.clientThemeSettings ??= clientThemeSettingsDummyProto;
                proto.appearance.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummyProto.backgroundGradientPresetId;
            }
        }
    },

    handleGradientThemeSelect(backgroundGradientPresetId: number | undefined, theme: number, original: () => void) {
        const premiumType = UserStore?.getCurrentUser()?.premiumType ?? 0;
        if (premiumType === 2 || backgroundGradientPresetId == null) return original();

        if (!AppearanceSettingsProto || !ClientThemeSettingsProto || !ReaderFactory) return;

        const currentAppearanceProto = PreloadedUserSettingsProtoHandler.getCurrentValue().appearance;

        const newAppearanceProto = currentAppearanceProto != null
            ? AppearanceSettingsProto.fromBinary(AppearanceSettingsProto.toBinary(currentAppearanceProto), ReaderFactory)
            : AppearanceSettingsProto.create();

        newAppearanceProto.theme = theme;

        const clientThemeSettingsDummyProto = ClientThemeSettingsProto.create({
            backgroundGradientPresetId: {
                value: backgroundGradientPresetId
            }
        });

        newAppearanceProto.clientThemeSettings ??= clientThemeSettingsDummyProto;
        newAppearanceProto.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummyProto.backgroundGradientPresetId;

        const proto = PreloadedUserSettingsProtoHandler.ProtoClass.create();
        proto.appearance = newAppearanceProto;

        FluxDispatcher.dispatch({
            type: "USER_SETTINGS_PROTO_UPDATE",
            local: true,
            partial: true,
            settings: {
                type: 1,
                proto
            }
        });
    },

    patchFakeNitroEmojisOrRemoveStickersLinks(content: Array<any>, inline: boolean) {
        if (content.length > 1) return content;

        const newContent: Array<any> = [];

        for (const element of content) {
            if (element.props?.trusted == null) {
                newContent.push(element);
                continue;
            }

            if (settings.store.transformEmojis) {
                const fakeNitroMatch = element.props.href.match(fakeNitroEmojiRegex);
                if (fakeNitroMatch) {
                    const emojiName = EmojiStore.getCustomEmojiById(fakeNitroMatch[1])?.name ?? element.props.href.match(fakeNitroNameRegex)?.[1] ?? "FakeNitroEmoji";

                    newContent.push(MessageElementsParser.customEmoji.react({
                        jumboable: !inline,
                        animated: fakeNitroMatch[2] === "gif",
                        emojiId: fakeNitroMatch[1],
                        name: emojiName,
                        fake: true
                    }, void 0, { key: "0" }));

                    continue;
                }
            }

            if (settings.store.transformStickers) {
                const imgMatch = element.props.href.match(fakeNitroStickerRegex);
                if (imgMatch) continue;

                const gifMatch = element.props.href.match(fakeNitroGifStickerRegex);
                if (gifMatch) {
                    if (StickerStore.getStickerById(gifMatch[1])) continue;
                }
            }

            newContent.push(element);
        }

        const firstTextElementIdx = newContent.findIndex(element => typeof element === "string");
        if (firstTextElementIdx !== -1) newContent[firstTextElementIdx] = newContent[firstTextElementIdx].trimStart();

        return newContent;
    },

    patchFakeNitroStickers(stickers: Array<any>, message: Message) {
        const itemsToMaybePush: Array<string> = [];

        const contentItems = message.content.split(/\s/);
        if (contentItems.length === 1) itemsToMaybePush.push(contentItems[0]);

        itemsToMaybePush.push(...message.attachments.filter(attachment => attachment.content_type === "image/gif").map(attachment => attachment.url));

        for (const item of itemsToMaybePush) {
            const imgMatch = item.match(fakeNitroStickerRegex);
            if (imgMatch) {
                const stickerName = StickerStore.getStickerById(imgMatch[1])?.name ?? item.match(fakeNitroNameRegex)?.[1] ?? "FakeNitroSticker";
                stickers.push({
                    format_type: 1,
                    id: imgMatch[1],
                    name: stickerName,
                    fake: true
                });

                continue;
            }

            const gifMatch = item.match(fakeNitroGifStickerRegex);
            if (gifMatch) {
                if (!StickerStore.getStickerById(gifMatch[1])) continue;

                const stickerName = StickerStore.getStickerById(gifMatch[1])?.name ?? "FakeNitroSticker";
                stickers.push({
                    format_type: 2,
                    id: gifMatch[1],
                    name: stickerName,
                    fake: true
                });
            }
        }

        return stickers;
    },

    shouldIgnoreEmbed(embed: Message["embeds"][number], message: Message) {
        if (message.content.split(/\s/).length > 1) return false;

        switch (embed.type) {
            case "image": {
                if (settings.store.transformEmojis) {
                    const match = embed.url!.match(fakeNitroEmojiRegex);
                    if (match) return true;
                }

                if (settings.store.transformStickers) {
                    const imgMatch = embed.url!.match(fakeNitroStickerRegex);
                    if (imgMatch) return true;

                    const gifMatch = embed.url!.match(fakeNitroGifStickerRegex);
                    if (gifMatch) {
                        if (StickerStore.getStickerById(gifMatch[1])) return true;
                    }
                }

                break;
            }
        }

        return false;
    },

    filterAttachments(attachments: Message["attachments"]) {
        return attachments.filter(attachment => attachment.content_type !== "image/gif" || !attachment.url.match(fakeNitroGifStickerRegex));
    },

    shouldKeepEmojiLink(link: any) {
        return link.target?.match(fakeNitroEmojiRegex);
    },

    hasPermissionToUseExternalEmojis(channelId: string) {
        const channel = ChannelStore.getChannel(channelId);

        if (!channel || channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()) return true;

        return PermissionStore.can(USE_EXTERNAL_EMOJIS, channel);
    },

    hasPermissionToUseExternalStickers(channelId: string) {
        const channel = ChannelStore.getChannel(channelId);

        if (!channel || channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()) return true;

        return PermissionStore.can(USE_EXTERNAL_STICKERS, channel);
    },

    getStickerLink(stickerId: string) {
        return `https://media.discordapp.net/stickers/${stickerId}.png?size=${Settings.plugins.FakeNitro.stickerSize}`;
    },

    async sendAnimatedSticker(stickerLink: string, stickerId: string, channelId: string) {
        const [{ parseURL }, {
            GIFEncoder,
            quantize,
            applyPalette
        }] = await Promise.all([importApngJs(), getGifEncoder()]);

        const { frames, width, height } = await parseURL(stickerLink);

        const gif = new GIFEncoder();
        const resolution = Settings.plugins.FakeNitro.stickerSize;

        const canvas = document.createElement("canvas");
        canvas.width = resolution;
        canvas.height = resolution;

        const ctx = canvas.getContext("2d", {
            willReadFrequently: true
        })!;

        const scale = resolution / Math.max(width, height);
        ctx.scale(scale, scale);

        let lastImg: HTMLImageElement | null = null;
        for (const { left, top, width, height, disposeOp, img, delay } of frames) {
            ctx.drawImage(img, left, top, width, height);

            const { data } = ctx.getImageData(0, 0, resolution, resolution);

            const palette = quantize(data, 256);
            const index = applyPalette(data, palette);

            gif.writeFrame(index, resolution, resolution, {
                transparent: true,
                palette,
                delay,
            });

            if (disposeOp === ApngDisposeOp.BACKGROUND) {
                ctx.clearRect(left, top, width, height);
            } else if (disposeOp === ApngDisposeOp.PREVIOUS && lastImg) {
                ctx.drawImage(lastImg, left, top, width, height);
            }

            lastImg = img;
        }

        gif.finish();
        const file = new File([gif.bytesView()], `${stickerId}.gif`, { type: "image/gif" });
        promptToUpload([file], ChannelStore.getChannel(channelId), DRAFT_TYPE);
    },

    start() {
        const settings = Settings.plugins.FakeNitro;
        if (!settings.enableEmojiBypass && !settings.enableStickerBypass) {
            return;
        }

        function getWordBoundary(origStr: string, offset: number) {
            return (!origStr[offset] || /\s/.test(origStr[offset])) ? "" : " ";
        }

        this.preSend = addPreSendListener((channelId, messageObj, extra) => {
            const { guildId } = this;

            stickerBypass: {
                if (!settings.enableStickerBypass)
                    break stickerBypass;

                const sticker = StickerStore.getStickerById(extra?.stickerIds?.[0]!);
                if (!sticker)
                    break stickerBypass;

                if (sticker.available !== false && ((this.canUseStickers && this.hasPermissionToUseExternalStickers(channelId)) || (sticker as GuildSticker)?.guild_id === guildId))
                    break stickerBypass;

                let link = this.getStickerLink(sticker.id);
                if (sticker.format_type === 2) {
                    this.sendAnimatedSticker(link, sticker.id, channelId);
                    return { cancel: true };
                } else {
                    if ("pack_id" in sticker) {
                        const packId = sticker.pack_id === "847199849233514549"
                            // Discord moved these stickers into a different pack at some point, but
                            // Distok still uses the old id
                            ? "749043879713701898"
                            : sticker.pack_id;

                        link = `https://distok.top/stickers/${packId}/${sticker.id}.gif`;
                    }

                    delete extra.stickerIds;
                    messageObj.content += " " + link + `&name=${sticker.name}`;
                }
            }

            if ((!this.canUseEmotes || !this.hasPermissionToUseExternalEmojis(channelId)) && settings.enableEmojiBypass) {
                for (const emoji of messageObj.validNonShortcutEmojis) {
                    if (!emoji.require_colons) continue;
                    if (emoji.guildId === guildId && !emoji.animated) continue;

                    const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;
                    const url = emoji.url.replace(/\?size=\d+/, `?size=${Settings.plugins.FakeNitro.emojiSize}`)
                        + `&name=${emoji.name}`;
                    messageObj.content = messageObj.content.replace(emojiString, (match, offset, origStr) => {
                        return `${getWordBoundary(origStr, offset - 1)}${url}${getWordBoundary(origStr, offset + match.length)}`;
                    });
                }
            }

            return { cancel: false };
        });

        this.preEdit = addPreEditListener((channelId, __, messageObj) => {
            if (this.canUseEmotes && this.hasPermissionToUseExternalEmojis(channelId)) return;

            const { guildId } = this;

            for (const [emojiStr, _, emojiId] of messageObj.content.matchAll(/(?<!\\)<a?:(\w+):(\d+)>/ig)) {
                const emoji = EmojiStore.getCustomEmojiById(emojiId);
                if (emoji == null || (emoji.guildId === guildId && !emoji.animated)) continue;
                if (!emoji.require_colons) continue;

                const url = emoji.url.replace(/\?size=\d+/, `?size=${Settings.plugins.FakeNitro.emojiSize}`)
                    + `&name=${emoji.name}`;
                messageObj.content = messageObj.content.replace(emojiStr, (match, offset, origStr) => {
                    return `${getWordBoundary(origStr, offset - 1)}${url}${getWordBoundary(origStr, offset + match.length)}`;
                });
            }
        });
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
});
