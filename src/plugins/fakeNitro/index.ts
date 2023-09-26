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
import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { ApngBlendOp, ApngDisposeOp, importApngJs } from "@utils/dependencies";
import { getCurrentGuild } from "@utils/discord";
import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findLazy, findStoreLazy } from "@webpack";
import { ChannelStore, EmojiStore, FluxDispatcher, Parser, PermissionStore, UserStore } from "@webpack/common";
import type { Message } from "discord-types/general";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { ReactElement, ReactNode } from "react";

const DRAFT_TYPE = 0;
const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");
const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
const PreloadedUserSettingsProtoHandler = findLazy(m => m.ProtoClass?.typeName === "discord_protos.discord_users.v1.PreloadedUserSettings");
const ReaderFactory = findByPropsLazy("readerFactory");
const StickerStore = findStoreLazy("StickersStore") as {
    getPremiumPacks(): StickerPack[];
    getAllGuildStickers(): Map<string, Sticker[]>;
    getStickerById(id: string): Sticker | undefined;
};

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

const enum EmojiIntentions {
    REACTION = 0,
    STATUS = 1,
    COMMUNITY_CONTENT = 2,
    CHAT = 3,
    GUILD_STICKER_RELATED_EMOJI = 4,
    GUILD_ROLE_BENEFIT_EMOJI = 5,
    COMMUNITY_CONTENT_ONLY = 6,
    SOUNDBOARD = 7
}

const enum StickerType {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    // don't think you can even have gif stickers but the docs have it
    GIF = 4
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

const enum FakeNoticeType {
    Sticker,
    Emoji
}

const fakeNitroEmojiRegex = /\/emojis\/(\d+?)\.(png|webp|gif)/;
const fakeNitroStickerRegex = /\/stickers\/(\d+?)\./;
const fakeNitroGifStickerRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/;

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
    transformCompoundSentence: {
        description: "Whether to transform fake stickers and emojis in compound sentences (sentences with more content than just the fake emoji or sticker link)",
        type: OptionType.BOOLEAN,
        default: false
    },
    enableStreamQualityBypass: {
        description: "Allow streaming in nitro quality",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "FakeNitro",
    authors: [Devs.Arjix, Devs.D3SOX, Devs.Ven, Devs.obscurity, Devs.captain, Devs.Nuckyz, Devs.AutumnVN],
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
                },
                {
                    match: /if\(!\i\.available/,
                    replace: m => `${m}&&(typeof fakeNitroIntention==="undefined"||![${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention))`
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
            find: "canUseHighVideoUploadQuality:function",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: [
                "canUseHighVideoUploadQuality",
                // TODO: Remove the last two when they get removed from stable
                "(?:canStreamQuality|canStreamHighQuality|canStreamMidQuality)",
            ].map(func => {
                return {
                    match: new RegExp(`${func}:function\\(\\i(?:,\\i)?\\){`, "g"),
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
                    match: /(emojiSection.{0,50}description:)(\i)(?<=(\i)\.sticker,.+?)(?=,)/,
                    replace: (_, rest, reactNode, props) => `${rest}$self.addFakeNotice(${FakeNoticeType.Sticker},${reactNode},!!${props}.renderableSticker?.fake)`
                }
            ]
        },
        {
            find: ".EMOJI_UPSELL_POPOUT_MORE_EMOJIS_OPENED,",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                match: /isDiscoverable:\i,shouldHideRoleSubscriptionCTA:\i,(?<=(\i)=\i\.node.+?)/,
                replace: (m, node) => `${m}fakeNitroNode:${node},`
            }
        },
        {
            find: ".Messages.EMOJI_POPOUT_UNJOINED_DISCOVERABLE_GUILD_DESCRIPTION",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                match: /(?<=\.Messages\.EMOJI_POPOUT_ADDED_PACK_DESCRIPTION.+?return ).{0,1200}\.Messages\.EMOJI_POPOUT_UNJOINED_DISCOVERABLE_GUILD_DESCRIPTION.+?(?=}\()/,
                replace: reactNode => `$self.addFakeNotice(${FakeNoticeType.Emoji},${reactNode},!!arguments[0]?.fakeNitroNode?.fake)`
            }
        }
    ],

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
        if (proto == null || typeof proto === "string" || !UserSettingsProtoStore || (!proto.appearance && !AppearanceSettingsProto)) return;

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

    trimContent(content: Array<any>) {
        const firstContent = content[0];
        if (typeof firstContent === "string") content[0] = firstContent.trimStart();
        if (content[0] === "") content.shift();

        const lastIndex = content.length - 1;
        const lastContent = content[lastIndex];
        if (typeof lastContent === "string") content[lastIndex] = lastContent.trimEnd();
        if (content[lastIndex] === "") content.pop();
    },

    clearEmptyArrayItems(array: Array<any>) {
        return array.filter(item => item != null);
    },

    ensureChildrenIsArray(child: ReactElement) {
        if (!Array.isArray(child.props.children)) child.props.children = [child.props.children];
    },

    patchFakeNitroEmojisOrRemoveStickersLinks(content: Array<any>, inline: boolean) {
        // If content has more than one child or it's a single ReactElement like a header or list
        if ((content.length > 1 || typeof content[0]?.type === "string") && !settings.store.transformCompoundSentence) return content;

        let nextIndex = content.length;

        const transformLinkChild = (child: ReactElement) => {
            if (settings.store.transformEmojis) {
                const fakeNitroMatch = child.props.href.match(fakeNitroEmojiRegex);
                if (fakeNitroMatch) {
                    let url: URL | null = null;
                    try {
                        url = new URL(child.props.href);
                    } catch { }

                    const emojiName = EmojiStore.getCustomEmojiById(fakeNitroMatch[1])?.name ?? url?.searchParams.get("name") ?? "FakeNitroEmoji";

                    return Parser.defaultRules.customEmoji.react({
                        jumboable: !inline && content.length === 1 && typeof content[0].type !== "string",
                        animated: fakeNitroMatch[2] === "gif",
                        emojiId: fakeNitroMatch[1],
                        name: emojiName,
                        fake: true
                    }, void 0, { key: String(nextIndex++) });
                }
            }

            if (settings.store.transformStickers) {
                if (fakeNitroStickerRegex.test(child.props.href)) return null;

                const gifMatch = child.props.href.match(fakeNitroGifStickerRegex);
                if (gifMatch) {
                    // There is no way to differentiate a regular gif attachment from a fake nitro animated sticker, so we check if the StickerStore contains the id of the fake sticker
                    if (StickerStore.getStickerById(gifMatch[1])) return null;
                }
            }

            return child;
        };

        const transformChild = (child: ReactElement) => {
            if (child?.props?.trusted != null) return transformLinkChild(child);
            if (child?.props?.children != null) {
                if (!Array.isArray(child.props.children)) {
                    child.props.children = modifyChild(child.props.children);
                    return child;
                }

                child.props.children = modifyChildren(child.props.children);
                if (child.props.children.length === 0) return null;
                return child;
            }

            return child;
        };

        const modifyChild = (child: ReactElement) => {
            const newChild = transformChild(child);

            if (newChild?.type === "ul" || newChild?.type === "ol") {
                this.ensureChildrenIsArray(newChild);
                if (newChild.props.children.length === 0) return null;

                let listHasAnItem = false;
                for (const [index, child] of newChild.props.children.entries()) {
                    if (child == null) {
                        delete newChild.props.children[index];
                        continue;
                    }

                    this.ensureChildrenIsArray(child);
                    if (child.props.children.length > 0) listHasAnItem = true;
                    else delete newChild.props.children[index];
                }

                if (!listHasAnItem) return null;

                newChild.props.children = this.clearEmptyArrayItems(newChild.props.children);
            }

            return newChild;
        };

        const modifyChildren = (children: Array<ReactElement>) => {
            for (const [index, child] of children.entries()) children[index] = modifyChild(child);

            children = this.clearEmptyArrayItems(children);
            this.trimContent(children);

            return children;
        };

        try {
            return modifyChildren(window._.cloneDeep(content));
        } catch (err) {
            new Logger("FakeNitro").error(err);
            return content;
        }
    },

    patchFakeNitroStickers(stickers: Array<any>, message: Message) {
        const itemsToMaybePush: Array<string> = [];

        const contentItems = message.content.split(/\s/);
        if (settings.store.transformCompoundSentence) itemsToMaybePush.push(...contentItems);
        else if (contentItems.length === 1) itemsToMaybePush.push(contentItems[0]);

        itemsToMaybePush.push(...message.attachments.filter(attachment => attachment.content_type === "image/gif").map(attachment => attachment.url));

        for (const item of itemsToMaybePush) {
            if (!settings.store.transformCompoundSentence && !item.startsWith("http")) continue;

            const imgMatch = item.match(fakeNitroStickerRegex);
            if (imgMatch) {
                let url: URL | null = null;
                try {
                    url = new URL(item);
                } catch { }

                const stickerName = StickerStore.getStickerById(imgMatch[1])?.name ?? url?.searchParams.get("name") ?? "FakeNitroSticker";
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
        const contentItems = message.content.split(/\s/);
        if (contentItems.length > 1 && !settings.store.transformCompoundSentence) return false;

        switch (embed.type) {
            case "image": {
                if (
                    !settings.store.transformCompoundSentence
                    && !contentItems.includes(embed.url!)
                    && !contentItems.includes(embed.image?.proxyURL!)
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

    hasPermissionToUseExternalEmojis(channelId: string): boolean {
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
        const { parseURL } = importApngJs();

        const { frames, width, height } = await parseURL(stickerLink);

        const gif = GIFEncoder();
        const resolution = Settings.plugins.FakeNitro.stickerSize;

        const canvas = document.createElement("canvas");
        canvas.width = resolution;
        canvas.height = resolution;

        const ctx = canvas.getContext("2d", {
            willReadFrequently: true
        })!;

        const scale = resolution / Math.max(width, height);
        ctx.scale(scale, scale);

        let previousFrameData: ImageData;

        for (const frame of frames) {
            const { left, top, width, height, img, delay, blendOp, disposeOp } = frame;

            previousFrameData = ctx.getImageData(left, top, width, height);

            if (blendOp === ApngBlendOp.SOURCE) {
                ctx.clearRect(left, top, width, height);
            }

            ctx.drawImage(img, left, top, width, height);

            const { data } = ctx.getImageData(0, 0, resolution, resolution);

            const palette = quantize(data, 256);
            const index = applyPalette(data, palette);

            gif.writeFrame(index, resolution, resolution, {
                transparent: true,
                palette,
                delay
            });

            if (disposeOp === ApngDisposeOp.BACKGROUND) {
                ctx.clearRect(left, top, width, height);
            } else if (disposeOp === ApngDisposeOp.PREVIOUS) {
                ctx.putImageData(previousFrameData, left, top);
            }
        }

        gif.finish();

        const file = new File([gif.bytesView()], `${stickerId}.gif`, { type: "image/gif" });
        promptToUpload([file], ChannelStore.getChannel(channelId), DRAFT_TYPE);
    },

    start() {
        const s = settings.store;

        if (!s.enableEmojiBypass && !s.enableStickerBypass) {
            return;
        }

        function getWordBoundary(origStr: string, offset: number) {
            return (!origStr[offset] || /\s/.test(origStr[offset])) ? "" : " ";
        }

        this.preSend = addPreSendListener((channelId, messageObj, extra) => {
            const { guildId } = this;

            stickerBypass: {
                if (!s.enableStickerBypass)
                    break stickerBypass;

                const sticker = StickerStore.getStickerById(extra.stickers?.[0]!);
                if (!sticker)
                    break stickerBypass;

                // Discord Stickers are now free yayyy!! :D
                if ("pack_id" in sticker)
                    break stickerBypass;

                const canUseStickers = this.canUseStickers && this.hasPermissionToUseExternalStickers(channelId);
                if (sticker.available !== false && (canUseStickers || sticker.guild_id === guildId))
                    break stickerBypass;

                const link = this.getStickerLink(sticker.id);
                if (sticker.format_type === StickerType.APNG) {
                    this.sendAnimatedSticker(link, sticker.id, channelId);
                    return { cancel: true };
                } else {
                    extra.stickers!.length = 0;
                    messageObj.content += ` ${link}&name=${encodeURIComponent(sticker.name)}`;
                }
            }

            if (s.enableEmojiBypass) {
                const canUseEmotes = this.canUseEmotes && this.hasPermissionToUseExternalEmojis(channelId);

                for (const emoji of messageObj.validNonShortcutEmojis) {
                    if (!emoji.require_colons) continue;
                    if (emoji.available !== false && canUseEmotes) continue;
                    if (emoji.guildId === guildId && !emoji.animated) continue;

                    const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;
                    const url = emoji.url.replace(/\?size=\d+/, "?" + new URLSearchParams({
                        size: Settings.plugins.FakeNitro.emojiSize,
                        name: encodeURIComponent(emoji.name)
                    }));
                    messageObj.content = messageObj.content.replace(emojiString, (match, offset, origStr) => {
                        return `${getWordBoundary(origStr, offset - 1)}${url}${getWordBoundary(origStr, offset + match.length)}`;
                    });
                }
            }

            return { cancel: false };
        });

        this.preEdit = addPreEditListener((channelId, __, messageObj) => {
            if (!s.enableEmojiBypass) return;

            const canUseEmotes = this.canUseEmotes && this.hasPermissionToUseExternalEmojis(channelId);

            const { guildId } = this;

            messageObj.content = messageObj.content.replace(/(?<!\\)<a?:(?:\w+):(\d+)>/ig, (emojiStr, emojiId, offset, origStr) => {
                const emoji = EmojiStore.getCustomEmojiById(emojiId);
                if (emoji == null) return emojiStr;
                if (!emoji.require_colons) return emojiStr;
                if (emoji.available !== false && canUseEmotes) return emojiStr;
                if (emoji.guildId === guildId && !emoji.animated) return emojiStr;

                const url = emoji.url.replace(/\?size=\d+/, "?" + new URLSearchParams({
                    size: Settings.plugins.FakeNitro.emojiSize,
                    name: encodeURIComponent(emoji.name)
                }));
                return `${getWordBoundary(origStr, offset - 1)}${url}${getWordBoundary(origStr, offset + emojiStr.length)}`;
            });
        });
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
});
