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
import { migratePluginSettings, Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import { ApngDisposeOp, getGifEncoder, importApngJs } from "@utils/dependencies";
import { getCurrentGuild } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, PermissionStore, UserStore } from "@webpack/common";

const DRAFT_TYPE = 0;
const promptToUpload = findByCodeLazy("UPLOAD_FILE_LIMIT_ERROR");
const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");

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

migratePluginSettings("FakeNitro", "NitroBypass");

export default definePlugin({
    name: "FakeNitro",
    authors: [Devs.Arjix, Devs.D3SOX, Devs.Ven, Devs.obscurity, Devs.captain, Devs.Nuckyz],
    description: "Allows you to stream in nitro quality, send fake emojis/stickers and use client themes.",
    dependencies: ["MessageEventsAPI"],

    patches: [
        {
            find: ".PREMIUM_LOCKED;",
            predicate: () => Settings.plugins.FakeNitro.enableEmojiBypass === true,
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
            predicate: () => Settings.plugins.FakeNitro.enableEmojiBypass === true,
            replacement: {
                match: /((?:canUseEmojisEverywhere|canUseAnimatedEmojis):function\(\i)\){(.+?\))/g,
                replace: (_, rest, premiumCheck) => `${rest},fakeNitroIntention){${premiumCheck}||fakeNitroIntention==null||[${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention)`
            }
        },
        {
            find: "canUseStickersEverywhere:function",
            predicate: () => Settings.plugins.FakeNitro.enableStickerBypass === true,
            replacement: {
                match: /canUseStickersEverywhere:function\(\i\){/,
                replace: "$&return true;"
            },
        },
        {
            find: "\"SENDABLE\"",
            predicate: () => Settings.plugins.FakeNitro.enableStickerBypass === true,
            replacement: {
                match: /(\w+)\.available\?/,
                replace: "true?"
            }
        },
        {
            find: "canStreamHighQuality:function",
            predicate: () => Settings.plugins.FakeNitro.enableStreamQualityBypass === true,
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
            predicate: () => Settings.plugins.FakeNitro.enableStreamQualityBypass === true,
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
        const premiumType = user?.premium_type ?? UserStore.getCurrentUser()?.premiumType ?? 0;

        if (premiumType === 0) {
            const themeId = UserSettingsProtoStore.settings.appearance?.clientThemeSettings?.backgroundGradientPresetId?.value;

            if (themeId != null) {
                proto.appearance ??= {};
                proto.appearance.clientThemeSettings ??= {};
                proto.appearance.clientThemeSettings.backgroundGradientPresetId ??= {};
                proto.appearance.clientThemeSettings.backgroundGradientPresetId.value = themeId;
            }
        }
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

        const EmojiStore = findByPropsLazy("getCustomEmojiById");
        const StickerStore = findByPropsLazy("getAllGuildStickers") as {
            getPremiumPacks(): StickerPack[];
            getAllGuildStickers(): Map<string, Sticker[]>;
            getStickerById(id: string): Sticker | undefined;
        };

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
                    this.sendAnimatedSticker(this.getStickerLink(sticker.id), sticker.id, channelId);
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
                    messageObj.content += " " + link;
                }
            }

            if ((!this.canUseEmotes || !this.hasPermissionToUseExternalEmojis(channelId)) && settings.enableEmojiBypass) {
                for (const emoji of messageObj.validNonShortcutEmojis) {
                    if (!emoji.require_colons) continue;
                    if (emoji.guildId === guildId && !emoji.animated) continue;

                    const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;
                    const url = emoji.url.replace(/\?size=\d+/, `?size=${Settings.plugins.FakeNitro.emojiSize}`);
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

                const url = emoji.url.replace(/\?size=\d+/, `?size=${Settings.plugins.FakeNitro.emojiSize}`);
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
