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
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { ApngBlendOp, ApngDisposeOp, importApngJs } from "@utils/dependencies";
import { getCurrentGuild } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, Patch } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findStoreLazy, proxyLazyWebpack } from "@webpack";
import { Alerts, ChannelStore, DraftType, EmojiStore, FluxDispatcher, Forms, GuildMemberStore, IconUtils, lodash, Parser, PermissionsBits, PermissionStore, UploadHandler, UserSettingsActionCreators, UserStore } from "@webpack/common";
import type { Emoji } from "@webpack/types";
import type { Message } from "discord-types/general";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { ReactElement, ReactNode } from "react";

const StickerStore = findStoreLazy("StickersStore") as {
    getPremiumPacks(): StickerPack[];
    getAllGuildStickers(): Map<string, Sticker[]>;
    getStickerById(id: string): Sticker | undefined;
};

const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");

const BINARY_READ_OPTIONS = findByPropsLazy("readerFactory");

function searchProtoClassField(localName: string, protoClass: any) {
    const field = protoClass?.fields?.find((field: any) => field.localName === localName);
    if (!field) return;

    const fieldGetter = Object.values(field).find(value => typeof value === "function") as any;
    return fieldGetter?.();
}

const PreloadedUserSettingsActionCreators = proxyLazyWebpack(() => UserSettingsActionCreators.PreloadedUserSettingsActionCreators);
const AppearanceSettingsActionCreators = proxyLazyWebpack(() => searchProtoClassField("appearance", PreloadedUserSettingsActionCreators.ProtoClass));
const ClientThemeSettingsActionsCreators = proxyLazyWebpack(() => searchProtoClassField("clientThemeSettings", AppearanceSettingsActionCreators));

const isUnusableRoleSubscriptionEmoji = findByCodeLazy(".getUserIsAdmin(");

const enum EmojiIntentions {
    REACTION,
    STATUS,
    COMMUNITY_CONTENT,
    CHAT,
    GUILD_STICKER_RELATED_EMOJI,
    GUILD_ROLE_BENEFIT_EMOJI,
    COMMUNITY_CONTENT_ONLY,
    SOUNDBOARD,
    VOICE_CHANNEL_TOPIC,
    GIFT,
    AUTO_SUGGESTION,
    POLLS
}

const IS_BYPASSEABLE_INTENTION = `[${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention)`;

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
const hyperLinkRegex = /\[.+?\]\((https?:\/\/.+?)\)/;

const settings = definePluginSettings({
    enableEmojiBypass: {
        description: "Allows sending fake emojis (also bypasses missing permission to use custom emojis)",
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
        description: "Allows sending fake stickers (also bypasses missing permission to use stickers)",
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
    },
    useHyperLinks: {
        description: "Whether to use hyperlinks when sending fake emojis and stickers",
        type: OptionType.BOOLEAN,
        default: true
    },
    hyperLinkText: {
        description: "What text the hyperlink should use. {{NAME}} will be replaced with the emoji/sticker name.",
        type: OptionType.STRING,
        default: "{{NAME}}"
    },
    disableEmbedPermissionCheck: {
        description: "Whether to disable the embed permission check when sending fake emojis and stickers",
        type: OptionType.BOOLEAN,
        default: false
    }
});

function hasPermission(channelId: string, permission: bigint) {
    const channel = ChannelStore.getChannel(channelId);

    if (!channel || channel.isPrivate()) return true;

    return PermissionStore.can(permission, channel);
}

const hasExternalEmojiPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.USE_EXTERNAL_EMOJIS);
const hasExternalStickerPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.USE_EXTERNAL_STICKERS);
const hasEmbedPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.EMBED_LINKS);
const hasAttachmentPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.ATTACH_FILES);

function makeBypassPatches(): Omit<Patch, "plugin"> {
    const mapping: Array<{ func: string, predicate?: () => boolean; }> = [
        { func: "canUseCustomStickersEverywhere", predicate: () => settings.store.enableStickerBypass },
        { func: "canUseHighVideoUploadQuality", predicate: () => settings.store.enableStreamQualityBypass },
        { func: "canStreamQuality", predicate: () => settings.store.enableStreamQualityBypass },
        { func: "canUseClientThemes" },
        { func: "canUseCustomNotificationSounds" },
        { func: "canUsePremiumAppIcons" }
    ];

    return {
        find: "canUseCustomStickersEverywhere:",
        replacement: mapping.map(({ func, predicate }) => ({
            match: new RegExp(String.raw`(?<=${func}:function\(\i(?:,\i)?\){)`),
            replace: "return true;",
            predicate
        }))
    };
}

export default definePlugin({
    name: "FakeNitro",
    authors: [Devs.Arjix, Devs.D3SOX, Devs.Ven, Devs.fawn, Devs.captain, Devs.Nuckyz, Devs.AutumnVN],
    description: "Allows you to stream in nitro quality, send fake emojis/stickers, use client themes and custom Discord notifications.",
    dependencies: ["MessageEventsAPI"],

    settings,

    patches: [
        // General bypass patches
        makeBypassPatches(),
        // Patch the emoji picker in voice calls to not be bypassed by fake nitro
        {
            find: "emojiItemDisabled]",
            predicate: () => settings.store.enableEmojiBypass,
            replacement: {
                match: /CHAT/,
                replace: "STATUS"
            }
        },
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
            find: ".getUserIsAdmin(",
            replacement: {
                match: /(function \i\(\i,\i)\){(.{0,250}.getUserIsAdmin\(.+?return!1})/,
                replace: (_, rest1, rest2) => `${rest1},fakeNitroOriginal){if(!fakeNitroOriginal)return false;${rest2}`
            }
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
        // Remove boost requirements to stream with high quality
        {
            find: "#{intl::STREAM_FPS_OPTION}",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: ""
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
            find: "}renderEmbeds(",
            replacement: [
                {
                    // Call our function to decide whether the embed should be ignored or not
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(renderEmbeds\((\i)\){)(.+?embeds\.map\(\((\i),\i\)?=>{)/,
                    replace: (_, rest1, message, rest2, embed) => `${rest1}const fakeNitroMessage=${message};${rest2}if($self.shouldIgnoreEmbed(${embed},fakeNitroMessage))return null;`
                },
                {
                    // Patch the stickers array to add fake nitro stickers
                    predicate: () => settings.store.transformStickers,
                    match: /renderStickersAccessories\((\i)\){let (\i)=\(0,\i\.\i\)\(\i\).+?;/,
                    replace: (m, message, stickers) => `${m}${stickers}=$self.patchFakeNitroStickers(${stickers},${message});`
                },
                {
                    // Filter attachments to remove fake nitro stickers or emojis
                    predicate: () => settings.store.transformStickers,
                    match: /renderAttachments\(\i\){.+?{attachments:(\i).+?;/,
                    replace: (m, attachments) => `${m}${attachments}=$self.filterAttachments(${attachments});`
                }
            ]
        },
        {
            find: "#{intl::STICKER_POPOUT_UNJOINED_PRIVATE_GUILD_DESCRIPTION}",
            predicate: () => settings.store.transformStickers,
            replacement: [
                {
                    // Export the renderable sticker to be used in the fake nitro sticker notice
                    match: /let{renderableSticker:(\i).{0,270}sticker:\i,channel:\i,/,
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
            find: "#{intl::EMOJI_POPOUT_UNJOINED_DISCOVERABLE_GUILD_DESCRIPTION}",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                // Add the fake nitro emoji notice
                match: /(?<=emojiDescription:)(\i)(?<=\1=\i\((\i)\).+?)/,
                replace: (_, reactNode, props) => `$self.addFakeNotice(${FakeNoticeType.Emoji},${reactNode},!!${props}?.fakeNitroNode?.fake)`
            }
        },
        // Separate patch for allowing using custom app icons
        {
            find: /\.getCurrentDesktopIcon.{0,25}\.isPremium/,
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
        try {
            if (proto == null || typeof proto === "string") return;

            const premiumType: number = user?.premium_type ?? UserStore?.getCurrentUser()?.premiumType ?? 0;

            if (premiumType !== 2) {
                proto.appearance ??= AppearanceSettingsActionCreators.create();

                if (UserSettingsProtoStore.settings.appearance?.theme != null) {
                    const appearanceSettingsDummy = AppearanceSettingsActionCreators.create({
                        theme: UserSettingsProtoStore.settings.appearance.theme
                    });

                    proto.appearance.theme = appearanceSettingsDummy.theme;
                }

                if (UserSettingsProtoStore.settings.appearance?.clientThemeSettings?.backgroundGradientPresetId?.value != null) {
                    const clientThemeSettingsDummy = ClientThemeSettingsActionsCreators.create({
                        backgroundGradientPresetId: {
                            value: UserSettingsProtoStore.settings.appearance.clientThemeSettings.backgroundGradientPresetId.value
                        }
                    });

                    proto.appearance.clientThemeSettings ??= clientThemeSettingsDummy;
                    proto.appearance.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummy.backgroundGradientPresetId;
                }
            }
        } catch (err) {
            new Logger("FakeNitro").error(err);
        }
    },

    handleGradientThemeSelect(backgroundGradientPresetId: number | undefined, theme: number, original: () => void) {
        const premiumType = UserStore?.getCurrentUser()?.premiumType ?? 0;
        if (premiumType === 2 || backgroundGradientPresetId == null) return original();

        if (!PreloadedUserSettingsActionCreators || !AppearanceSettingsActionCreators || !ClientThemeSettingsActionsCreators || !BINARY_READ_OPTIONS) return;

        const currentAppearanceSettings = PreloadedUserSettingsActionCreators.getCurrentValue().appearance;

        const newAppearanceProto = currentAppearanceSettings != null
            ? AppearanceSettingsActionCreators.fromBinary(AppearanceSettingsActionCreators.toBinary(currentAppearanceSettings), BINARY_READ_OPTIONS)
            : AppearanceSettingsActionCreators.create();

        newAppearanceProto.theme = theme;

        const clientThemeSettingsDummy = ClientThemeSettingsActionsCreators.create({
            backgroundGradientPresetId: {
                value: backgroundGradientPresetId
            }
        });

        newAppearanceProto.clientThemeSettings ??= clientThemeSettingsDummy;
        newAppearanceProto.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummy.backgroundGradientPresetId;

        const proto = PreloadedUserSettingsActionCreators.ProtoClass.create();
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
        if (typeof firstContent === "string") {
            content[0] = firstContent.trimStart();
            content[0] || content.shift();
        } else if (typeof firstContent?.props?.children === "string") {
            firstContent.props.children = firstContent.props.children.trimStart();
            firstContent.props.children || content.shift();
        }

        const lastIndex = content.length - 1;
        const lastContent = content[lastIndex];
        if (typeof lastContent === "string") {
            content[lastIndex] = lastContent.trimEnd();
            content[lastIndex] || content.pop();
        } else if (typeof lastContent?.props?.children === "string") {
            lastContent.props.children = lastContent.props.children.trimEnd();
            lastContent.props.children || content.pop();
        }
    },

    clearEmptyArrayItems(array: Array<any>) {
        return array.filter(item => item != null);
    },

    ensureChildrenIsArray(child: ReactElement) {
        if (!Array.isArray(child.props.children)) child.props.children = [child.props.children];
    },

    patchFakeNitroEmojisOrRemoveStickersLinks(content: Array<any>, inline: boolean) {
        // If content has more than one child or it's a single ReactElement like a header, list or span
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

            return children;
        };

        try {
            const newContent = modifyChildren(lodash.cloneDeep(content));
            this.trimContent(newContent);

            return newContent;
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
            if (!settings.store.transformCompoundSentence && !item.startsWith("http") && !hyperLinkRegex.test(item)) continue;

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

    getStickerLink(stickerId: string) {
        return `https://media.discordapp.net/stickers/${stickerId}.png?size=${settings.store.stickerSize}`;
    },

    async sendAnimatedSticker(stickerLink: string, stickerId: string, channelId: string) {
        const { parseURL } = importApngJs();

        const { frames, width, height } = await parseURL(stickerLink);

        const gif = GIFEncoder();
        const resolution = settings.store.stickerSize;

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
        UploadHandler.promptToUpload([file], ChannelStore.getChannel(channelId), DraftType.ChannelMessage);
    },

    canUseEmote(e: Emoji, channelId: string) {
        if (e.type === 0) return true;
        if (e.available === false) return false;

        if (isUnusableRoleSubscriptionEmoji(e, this.guildId, true)) return false;

        let isUsableTwitchSubEmote = false;
        if (e.managed && e.guildId) {
            // @ts-ignore outdated type
            const myRoles = GuildMemberStore.getSelfMember(e.guildId)?.roles ?? [];
            isUsableTwitchSubEmote = e.roles.some(r => myRoles.includes(r));
        }

        if (this.canUseEmotes || isUsableTwitchSubEmote)
            return e.guildId === this.guildId || hasExternalEmojiPerms(channelId);
        else
            return !e.animated && e.guildId === this.guildId;
    },

    start() {
        const s = settings.store;

        if (!s.enableEmojiBypass && !s.enableStickerBypass) {
            return;
        }

        function getWordBoundary(origStr: string, offset: number) {
            return (!origStr[offset] || /\s/.test(origStr[offset])) ? "" : " ";
        }

        function cannotEmbedNotice() {
            return new Promise<boolean>(resolve => {
                Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>
                            You are trying to send/edit a message that contains a FakeNitro emoji or sticker,
                            however you do not have permissions to embed links in the current channel.
                            Are you sure you want to send this message? Your FakeNitro items will appear as a link only.
                        </Forms.FormText>
                        <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
                            You can disable this notice in the plugin settings.
                        </Forms.FormText>
                    </div>,
                    confirmText: "Send Anyway",
                    cancelText: "Cancel",
                    secondaryConfirmText: "Do not show again",
                    onConfirm: () => resolve(true),
                    onCloseCallback: () => setImmediate(() => resolve(false)),
                    onConfirmSecondary() {
                        settings.store.disableEmbedPermissionCheck = true;
                        resolve(true);
                    }
                });
            });
        }

        this.preSend = addPreSendListener(async (channelId, messageObj, extra) => {
            const { guildId } = this;

            let hasBypass = false;

            stickerBypass: {
                if (!s.enableStickerBypass)
                    break stickerBypass;

                const sticker = StickerStore.getStickerById(extra.stickers?.[0]!);
                if (!sticker)
                    break stickerBypass;

                // Discord Stickers are now free yayyy!! :D
                if ("pack_id" in sticker)
                    break stickerBypass;

                const canUseStickers = this.canUseStickers && hasExternalStickerPerms(channelId);
                if (sticker.available !== false && (canUseStickers || sticker.guild_id === guildId))
                    break stickerBypass;

                // [12/12/2023]
                // Work around an annoying bug where getStickerLink will return StickerType.GIF,
                // but will give us a normal non animated png for no reason
                // TODO: Remove this workaround when it's not needed anymore
                let link = this.getStickerLink(sticker.id);
                if (sticker.format_type === StickerType.GIF && link.includes(".png")) {
                    link = link.replace(".png", ".gif");
                }

                if (sticker.format_type === StickerType.APNG) {
                    if (!hasAttachmentPerms(channelId)) {
                        Alerts.show({
                            title: "Hold on!",
                            body: <div>
                                <Forms.FormText>
                                    You cannot send this message because it contains an animated FakeNitro sticker,
                                    and you do not have permissions to attach files in the current channel. Please remove the sticker to proceed.
                                </Forms.FormText>
                            </div>
                        });
                    } else {
                        this.sendAnimatedSticker(link, sticker.id, channelId);
                    }

                    return { cancel: true };
                } else {
                    hasBypass = true;

                    const url = new URL(link);
                    url.searchParams.set("name", sticker.name);

                    const linkText = s.hyperLinkText.replaceAll("{{NAME}}", sticker.name);

                    messageObj.content += `${getWordBoundary(messageObj.content, messageObj.content.length - 1)}${s.useHyperLinks ? `[${linkText}](${url})` : url}`;
                    extra.stickers!.length = 0;
                }
            }

            if (s.enableEmojiBypass) {
                for (const emoji of messageObj.validNonShortcutEmojis) {
                    if (this.canUseEmote(emoji, channelId)) continue;

                    hasBypass = true;

                    const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;

                    const url = new URL(IconUtils.getEmojiURL({ id: emoji.id, animated: emoji.animated, size: s.emojiSize }));
                    url.searchParams.set("size", s.emojiSize.toString());
                    url.searchParams.set("name", emoji.name);

                    const linkText = s.hyperLinkText.replaceAll("{{NAME}}", emoji.name);

                    messageObj.content = messageObj.content.replace(emojiString, (match, offset, origStr) => {
                        return `${getWordBoundary(origStr, offset - 1)}${s.useHyperLinks ? `[${linkText}](${url})` : url}${getWordBoundary(origStr, offset + match.length)}`;
                    });
                }
            }

            if (hasBypass && !s.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
                if (!await cannotEmbedNotice()) {
                    return { cancel: true };
                }
            }

            return { cancel: false };
        });

        this.preEdit = addPreEditListener(async (channelId, __, messageObj) => {
            if (!s.enableEmojiBypass) return;

            let hasBypass = false;

            messageObj.content = messageObj.content.replace(/(?<!\\)<a?:(?:\w+):(\d+)>/ig, (emojiStr, emojiId, offset, origStr) => {
                const emoji = EmojiStore.getCustomEmojiById(emojiId);
                if (emoji == null) return emojiStr;
                if (this.canUseEmote(emoji, channelId)) return emojiStr;

                hasBypass = true;

                const url = new URL(IconUtils.getEmojiURL({ id: emoji.id, animated: emoji.animated, size: s.emojiSize }));
                url.searchParams.set("size", s.emojiSize.toString());
                url.searchParams.set("name", emoji.name);

                const linkText = s.hyperLinkText.replaceAll("{{NAME}}", emoji.name);

                return `${getWordBoundary(origStr, offset - 1)}${s.useHyperLinks ? `[${linkText}](${url})` : url}${getWordBoundary(origStr, offset + emojiStr.length)}`;
            });

            if (hasBypass && !s.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
                if (!await cannotEmbedNotice()) {
                    return { cancel: true };
                }
            }

            return { cancel: false };
        });
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
});
