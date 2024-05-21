/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Alerts, EmojiStore, Forms, IconUtils } from "@webpack/common";

import { StickerStore } from "./patch";
import { settings } from "./settings";
import { StickerType } from "./types";
import { cannotEmbedNotice, getCurrentGuildId, getWordBoundary } from "./utils";
import { canUseEmote } from "./utils/emoji";
import { canUseStickers, hasAttachmentPerms, hasEmbedPerms, hasExternalStickerPerms } from "./utils/permissions";
import { getStickerLink, sendAnimatedSticker } from "./utils/sticker";

export async function preSendListener(channelId, messageObj, extra) {
    let hasBypass = false;

    stickerBypass: {
        if (!settings.store.enableStickerBypass)
            break stickerBypass;

        const sticker = StickerStore.getStickerById(extra.stickers?.[0]!);
        if (!sticker)
            break stickerBypass;

        // Discord Stickers are now free yayyy!! :D
        if ("pack_id" in sticker)
            break stickerBypass;

        const allowStickers = canUseStickers() && hasExternalStickerPerms(channelId);
        if (sticker.available !== false && (allowStickers || sticker.guild_id === getCurrentGuildId()))
            break stickerBypass;

        // [05/21/2024]
        // Work around an annoying bug where getStickerLink will return StickerType.GIF,
        // but will give us a normal non animated png for no reason
        // TODO: Remove this workaround when it's not needed anymore
        let link = getStickerLink(sticker.id);
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
                sendAnimatedSticker(link, sticker.id, channelId);
            }

            return { cancel: true };
        } else {
            hasBypass = true;

            const url = new URL(link);
            url.searchParams.set("name", sticker.name);

            const linkText = settings.store.hyperLinkText.replaceAll("{{NAME}}", sticker.name);

            messageObj.content += `${getWordBoundary(messageObj.content, messageObj.content.length - 1)}${settings.store.useHyperLinks ? `[${linkText}](${url})` : url}`;
            extra.stickers!.length = 0;
        }
    }

    if (settings.store.enableEmojiBypass) {
        for (const emoji of messageObj.validNonShortcutEmojis) {
            if (canUseEmote(emoji, channelId)) continue;

            hasBypass = true;

            const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;

            const url = new URL(IconUtils.getEmojiURL({ id: emoji.id, animated: emoji.animated, size: settings.store.emojiSize }));
            url.searchParams.set("size", settings.store.emojiSize.toString());
            url.searchParams.set("name", emoji.name);

            const linkText = settings.store.hyperLinkText.replaceAll("{{NAME}}", emoji.name);

            messageObj.content = messageObj.content.replace(emojiString, (match, offset, origStr) => {
                return `${getWordBoundary(origStr, offset - 1)}${settings.store.useHyperLinks ? `[${linkText}](${url})` : url}${getWordBoundary(origStr, offset + match.length)}`;
            });
        }
    }

    if (hasBypass && !settings.store.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
        if (!await cannotEmbedNotice()) {
            return { cancel: true };
        }
    }

    return { cancel: false };
}

export async function preEditListener(channelId, __, messageObj) {
    if (!settings.store.enableEmojiBypass) return;

    let hasBypass = false;

    messageObj.content = messageObj.content.replace(/(?<!\\)<a?:(?:\w+):(\d+)>/ig, (emojiStr, emojiId, offset, origStr) => {
        const emoji = EmojiStore.getCustomEmojiById(emojiId);
        if (emoji == null) return emojiStr;
        if (canUseEmote(emoji, channelId)) return emojiStr;

        hasBypass = true;

        const url = new URL(IconUtils.getEmojiURL({ id: emoji.id, animated: emoji.animated, size: settings.store.emojiSize }));
        url.searchParams.set("size", settings.store.emojiSize.toString());
        url.searchParams.set("name", emoji.name);

        const linkText = settings.store.hyperLinkText.replaceAll("{{NAME}}", emoji.name);

        return `${getWordBoundary(origStr, offset - 1)}${settings.store.useHyperLinks ? `[${linkText}](${url})` : url}${getWordBoundary(origStr, offset + emojiStr.length)}`;
    });

    if (hasBypass && !settings.store.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
        if (!await cannotEmbedNotice()) {
            return { cancel: true };
        }
    }

    return { cancel: false };
}
