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

import { sendBotMessage } from "../api/Commands";
import { addPreEditListener, addPreSendListener, removePreEditListener,removePreSendListener } from "../api/MessageEvents";
import { lazyWebpack } from "../utils";
import { Devs } from "../utils/constants";
import { getGifEncoder, importApngJs } from "../utils/dependencies";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { filters, findByProps } from "../webpack";
import { ChannelStore, UserStore } from "../webpack/common";

const DRAFT_TYPE = 0;
const promptToUpload = lazyWebpack(filters.byCode("UPLOAD_FILE_LIMIT_ERROR"));

interface Sticker {
    available: boolean;
    description: string;
    format_type: number;
    guild_id: string;
    id: string;
    name: string;
    tags: string;
    type: number;
}

export default definePlugin({
    stickerPacks: [] as any[],
    name: "NitroBypass",
    authors: [
        Devs.Arjix,
        Devs.D3SOX,
    ],
    description: "Allows you to stream in nitro quality and send fake emojis/stickers.",
    dependencies: ["MessageEventsAPI"],
    patches: [
        {
            find: "canUseAnimatedEmojis:function",
            predicate: () => Settings.plugins.NitroBypass.enableEmojiBypass === true,
            replacement: [
                "canUseAnimatedEmojis",
                "canUseEmojisEverywhere"
            ].map(func => {
                return {
                    match: new RegExp(`${func}:function\\(.+?}`),
                    replace: `${func}:function(e){return true;}`
                };
            })
        },
        {
            find: "canUseAnimatedEmojis:function",
            predicate: () => Settings.plugins.NitroBypass.enableStickerBypass === true,
            replacement: {
                match: /canUseStickersEverywhere:function\(.+?}/,
                replace: "canUseStickersEverywhere:function(e){return true;}"
            },
        },
        {
            find: "canUseAnimatedEmojis:function",
            predicate: () => Settings.plugins.NitroBypass.enableStreamQualityBypass === true,
            replacement: [
                "canUseHighVideoUploadQuality",
                "canStreamHighQuality",
                "canStreamMidQuality"
            ].map(func => {
                return {
                    match: new RegExp(`${func}:function\\(.+?}`),
                    replace: `${func}:function(e){return true;}`
                };
            })
        },
        {
            find: "STREAM_FPS_OPTION.format",
            predicate: () => Settings.plugins.NitroBypass.enableStreamQualityBypass === true,
            replacement: {
                match: /(userPremiumType|guildPremiumTier):.{0,10}TIER_\d,?/g,
                replace: ""
            }
        },
        {
            find: "ingestStickers:",
            predicate: () => Settings.plugins.NitroBypass.enableStickerBypass === true,
            replacement: {
                match: /(\w+)=(\w+).sticker_packs;(\w+)\.(\w+)\.dispatch\(\{type:"STICKER_PACKS_FETCH_SUCCESS"/g,
                replace: "$1=$2.sticker_packs;Vencord.Plugins.plugins.NitroBypass.savePacks($1);$3.$4.dispatch({type:\"STICKER_PACKS_FETCH_SUCCESS\""
            },
        },
    ],
    savePacks(stickerPacks) {
        this.stickerPacks = stickerPacks;
    },
    options: {
        enableEmojiBypass: {
            description: "Allow sending fake emojis",
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
        return window.location.href.split("channels/")[1].split("/")[0];
    },

    get canUseEmotes() {
        return Boolean(UserStore.getCurrentUser().premiumType);
    },

    getStickerLink(stickerId: string) {
        return `https://media.discordapp.net/stickers/${stickerId}.png?size=${Settings.plugins.NitroBypass.stickerSize}`;
    },

    start() {
        if (!Settings.plugins.NitroBypass.enableEmojiBypass && !Settings.plugins.NitroBypass.enableStickerBypass) {
            return;
        }

        if (this.canUseEmotes) {
            console.info("[NitroBypass] Skipping start because you have nitro");
            return;
        }

        const { getCustomEmojiById } = findByProps("getCustomEmojiById");
        const { getAllGuildStickers } = findByProps("getAllGuildStickers");

        function getWordBoundary(origStr, offset) {
            return (!origStr[offset] || /\s/.test(origStr[offset])) ? "" : " ";
        }

        this.preSend = addPreSendListener((channelId, messageObj, extra) => {
            const { guildId } = this;

            if (Settings.plugins.NitroBypass.enableStickerBypass) {
                const stickerIds = extra?.stickerIds;

                if (stickerIds && stickerIds.length) {
                    const stickerId = stickerIds[0];
                    if (stickerId) {
                        const isDiscordSticker = this.stickerPacks.find(pack => pack.stickers.find(sticker => sticker.id === stickerId));

                        if (isDiscordSticker) {
                            sendBotMessage(channelId, {
                                content: "Discord stickers are not supported!",
                                author: {
                                    username: "Vencord"
                                }
                            });
                            return { cancel: true };
                        }

                        const stickerLink = this.getStickerLink(stickerId);

                        const stickersList = Array.from(getAllGuildStickers().values()).flat() as Sticker[];
                        const sticker = stickersList.find(x => x.id === stickerId);

                        if (sticker) {
                            // get guild id from sticker
                            const stickerGuildId = sticker.guild_id;

                            // only modify if sticker is not from current guild
                            if (stickerGuildId !== guildId) {

                                // if it's animated download it, convert to gif and send it
                                const isAnimated = sticker.format_type === 2;
                                if (isAnimated) {

                                    (async () => {
                                        const [{ parseURL }, { GIFEncoder, quantize, applyPalette }] = await Promise.all([importApngJs(), getGifEncoder()]);

                                        const apng = await parseURL(stickerLink);

                                        const gif = new GIFEncoder();
                                        // width should be equal to height for stickers, so it doesn't matter if we use width or height here
                                        const resolution = Settings.plugins.NitroBypass.stickerSize;

                                        const canvas = document.createElement("canvas");
                                        canvas.width = canvas.height = resolution;
                                        const ctx = canvas.getContext("2d")!;

                                        const { frames } = apng;

                                        for (const frame of frames) {
                                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                                            ctx.drawImage(frame.img, 0, 0, resolution, resolution);

                                            const { data } = ctx.getImageData(0, 0, resolution, resolution);

                                            const palette = quantize(data, 256);
                                            const index = applyPalette(data, palette);

                                            gif.writeFrame(index, resolution, resolution, {
                                                transparent: true,
                                                palette,
                                                delay: frame.delay,
                                            });
                                        }

                                        gif.finish();
                                        const file = new File([gif.bytesView()], `${stickerId}.gif`, { type: "image/gif" });
                                        promptToUpload([file], ChannelStore.getChannel(channelId), DRAFT_TYPE);
                                    })();

                                    // animated stickers are handled above
                                    return { cancel: true };
                                }

                                messageObj.content = stickerLink;
                                delete extra.stickerIds;
                            }
                        } else {
                            console.warn("[NitroBypass] Can't find sticker in stickersList", stickerId, "modifying just in case");
                            messageObj.content = stickerLink;
                            delete extra.stickerIds;
                        }
                    }
                }
            }

            if (Settings.plugins.NitroBypass.enableEmojiBypass) {
                for (const emoji of messageObj.validNonShortcutEmojis) {
                    if (!emoji.require_colons) continue;
                    if (emoji.guildId === guildId && !emoji.animated) continue;

                    const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;
                    const url = emoji.url.replace(/\?size=\d+/, "?size=48");
                    messageObj.content = messageObj.content.replace(emojiString, (match, offset, origStr) => {
                        return `${getWordBoundary(origStr, offset - 1)}${url}${getWordBoundary(origStr, offset + match.length)}`;
                    });
                }
            }
        });

        this.preEdit = addPreEditListener((_, __, messageObj) => {
            const { guildId } = this;

            for (const [emojiStr, _, emojiId] of messageObj.content.matchAll(/(?<!\\)<a?:(\w+):(\d+)>/ig)) {
                const emoji = getCustomEmojiById(emojiId);
                if (emoji == null || (emoji.guildId === guildId && !emoji.animated)) continue;
                if (!emoji.require_colons) continue;

                const url = emoji.url.replace(/\?size=\d+/, "?size=48");
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
