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
import { lazyWebpack, makeLazy } from "../utils";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { filters, findByProps, waitFor } from "../webpack";
import { UserStore } from "../webpack/common";

const importApngJs = makeLazy(async () => {
    const exports = {};
    const winProxy = new Proxy(window, { set: (_, k, v) => exports[k] = v });
    Function("self", await fetch("https://cdnjs.cloudflare.com/ajax/libs/apng-canvas/2.1.1/apng-canvas.min.js").then(r => r.text()))(winProxy);
    // @ts-ignore
    return exports.APNG;
});

const DRAFT_TYPE = 0;
// https://github.com/mattdesl/gifenc
// this lib is way better than gif.js and all other libs, they're all so terrible but this one is nice
// @ts-ignore ts mad
const getGifEncoder = makeLazy(() => import("https://unpkg.com/gifenc@1.0.3/dist/gifenc.esm.js"));
const promptToUpload = lazyWebpack(filters.byCode("UPLOAD_FILE_LIMIT_ERROR"));

let ChannelStore;
waitFor(["getChannel"], m => ChannelStore = m);

interface Frame {
    left: number,
    top: number,
    width: number,
    height: number,
    img: HTMLImageElement
}

interface FrameData {
    width: number,
    height: number,
    frames: Frame[],
    playTime: number
}

export default definePlugin({
    stickerPacks: [] as any[],
    stickerMap: null as Map<string, any> | null,
    apng: null as { parseURL(url: string): Promise<FrameData> } | null,
    gif: null as any | null,
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
            find: "getStickerById=",
            predicate: () => Settings.plugins.NitroBypass.enableStickerBypass === true,
            replacement: {
                match: /getStickerById=function\((\w+)\)\{return (\w+).get/,
                replace: "getStickerById=function($1){Vencord.Plugins.plugins.NitroBypass.saveStickerMap($2);return $2.get"
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
    saveStickerMap(stickerMap) {
        this.stickerMap = stickerMap;
        // TODO: I think this could use something like const StickerStore = lazyWebpack(filters.byProps("getStickers??"));
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
        return `${location.origin}/stickers/${stickerId}.png`;
    },

    start() {
        if (!Settings.plugins.NitroBypass.enableEmojiBypass && !Settings.plugins.NitroBypass.enableStickerBypass) {
            return;
        }

        importApngJs().then(apng => {
            this.apng = apng;
        });

        getGifEncoder().then(gif => {
            this.gif = gif;
        });

        if (this.canUseEmotes) {
            console.info("[NitroBypass] Skipping start because you have nitro");
            return;
        }

        const { getCustomEmojiById } = findByProps("getCustomEmojiById");

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
                            delete extra.stickerIds;
                            sendBotMessage(channelId, {
                                content: "Discord stickers are not supported!",
                                author: {
                                    username: "Vencord"
                                }
                            });
                            return;
                        }

                        const stickerLink = this.getStickerLink(stickerId);

                        if (this.stickerMap) {
                            // get guild id from sticker
                            const sticker = this.stickerMap.get(stickerId);
                            const isAnimated = sticker.format_type === 2;
                            const stickerGuildId = sticker.guild_id;

                            // only modify if sticker is not from current guild
                            if (stickerGuildId !== guildId) {

                                // if it's animated download it, convert to gif and send it
                                if (isAnimated) {

                                    if (!this.apng || !this.gif) {
                                        return;
                                    }

                                    this.apng.parseURL(stickerLink).then(apng => {
                                        console.log("NITRO BYPASS apng", apng);

                                        const { GIFEncoder, quantize, applyPalette } = this.gif;

                                        const gif = new GIFEncoder();
                                        // width should be equal to height for stickers, so it doesn't matter if we use width or height here
                                        const resolution = apng.width; // or configurable
                                        const delay = apng.playTime / apng.frames.length;

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
                                                delay,
                                            });
                                        }

                                        gif.finish();
                                        const file = new File([gif.bytesView()], `${stickerId}.gif`, { type: "image/gif" });
                                        promptToUpload([file], ChannelStore.getChannel(channelId), DRAFT_TYPE);

                                    });

                                    // animated stickers are handled above
                                    delete extra.stickerIds;
                                    return;
                                }


                                messageObj.content = stickerLink;
                                delete extra.stickerIds;
                            }
                        } else {
                            console.warn("[NitroBypass] Can't find sticker in stickerMap", stickerId, "modifying just in case");
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
