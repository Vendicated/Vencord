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

import { findGroupChildrenByChildId, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { ModalContent, ModalHeader, ModalRoot, openModalLazy } from "@utils/modal";
import definePlugin from "@utils/types";
import { type FluxStore, type GuildEmoji as $Emoji, type MessageRecord, type Sticker as $Sticker, StickerFormat } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { Constants, EmojiStore, FluxDispatcher, Forms, GuildStore, Menu, Permissions, PermissionStore, RestAPI, Toasts, Tooltip, useMemo, useReducer, UserStore, useState } from "@webpack/common";
import type { Promisable } from "type-fest";

const StickersStore: FluxStore & Record<string, any> = findStoreLazy("StickersStore");
const uploadEmoji = findByCodeLazy(".GUILD_EMOJIS(", "EMOJI_UPLOAD_START");

const DATA_TYPE = Symbol();

const enum DataType {
    EMOJI,
    STICKER
}

type Emoji = $Emoji & { [DATA_TYPE]: DataType.EMOJI; };

type Sticker = $Sticker & { [DATA_TYPE]: DataType.STICKER; };

type Data = Emoji | Sticker;

const StickerExt = [, "png", "png", "json", "gif"] as const;

function getUrl(data: Data) {
    if (data[DATA_TYPE] === DataType.EMOJI)
        return `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${data.id}.${data.animated ? "gif" : "png"}?size=4096&lossless=true`;

    return `${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${data.id}.${StickerExt[data.format_type]}?size=4096&lossless=true`;
}

async function fetchSticker(id: string) {
    const cached: $Sticker | undefined = StickersStore.getStickerById(id);
    if (cached) return cached;

    const { body } = await RestAPI.get({
        url: Constants.Endpoints.STICKER(id)
    });

    FluxDispatcher.dispatch({
        type: "STICKER_FETCH_SUCCESS",
        sticker: body
    });

    return body as $Sticker;
}

async function cloneSticker(guildId: string, sticker: Sticker) {
    const data = new FormData();
    data.append("name", sticker.name);
    data.append("tags", sticker.tags);
    data.append("description", sticker.description ?? "");
    data.append("file", await fetchBlob(getUrl(sticker)));

    const { body } = await RestAPI.post({
        url: Constants.Endpoints.GUILD_STICKER_PACKS(guildId),
        body: data,
    });

    FluxDispatcher.dispatch({
        type: "GUILD_STICKERS_CREATE_SUCCESS",
        guildId,
        sticker: {
            ...body,
            user: UserStore.getCurrentUser()
        }
    });
}

async function cloneEmoji(guildId: string, emoji: Emoji) {
    const data = await fetchBlob(getUrl(emoji));

    const dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => { resolve(reader.result as string); };
        reader.readAsDataURL(data);
    });

    return uploadEmoji({
        guildId,
        name: emoji.name.split("~")[0],
        image: dataUrl
    });
}

function getGuildCandidates(data: Data) {
    const meId = UserStore.getCurrentUser()!.id;

    return Object.values(GuildStore.getGuilds()).filter(guild => {
        const canCreate = guild.ownerId === meId ||
            PermissionStore.can(Permissions.CREATE_GUILD_EXPRESSIONS, guild);
        if (!canCreate) return false;

        if (data[DATA_TYPE] === DataType.STICKER) return true;

        const { animated } = data;

        const emojiSlots = guild.getMaxEmojiSlots();
        const emojis = EmojiStore.getGuildEmoji(guild.id);

        let count = 0;
        for (const emoji of emojis)
            if (emoji.animated === animated)
                count++;
        return count < emojiSlots;
    }).sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchBlob(url: string) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to fetch ${url} - ${res.status}`);

    return res.blob();
}

async function doClone(guildId: string, data: Data) {
    try {
        if (data[DATA_TYPE] === DataType.STICKER)
            await cloneSticker(guildId, data);
        else
            await cloneEmoji(guildId, data);

        Toasts.show({
            message: `Successfully cloned ${data.name} to ${GuildStore.getGuild(guildId)?.name ?? "your server"}!`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId()
        });
    } catch (e: any) {
        let message = "Something went wrong (check console!)";
        try {
            message = JSON.parse(e.text).message;
        } catch { }

        new Logger("EmoteCloner").error("Failed to clone", data.name, "to", guildId, e);
        Toasts.show({
            message: "Failed to clone: " + message,
            type: Toasts.Type.FAILURE,
            id: Toasts.genId()
        });
    }
}

const getFontSize = (str: string) => {
    // [18, 18, 16, 16, 14, 12, 10]
    const sizes = [20, 20, 18, 18, 16, 14, 12];
    return sizes[str.length] ?? 4;
};

const nameValidator = /^\w+$/i;

function CloneModal({ data }: { data: Data; }) {
    const [isCloning, setIsCloning] = useState(false);
    const [name, setName] = useState(data.name);

    const [x, invalidateMemo] = useReducer(x => x + 1, 0);

    const guilds = useMemo(() => getGuildCandidates(data), [data.id, x]);

    return (
        <>
            <Forms.FormTitle className={Margins.top20}>Custom Name</Forms.FormTitle>
            <CheckedTextInput
                value={name}
                onChange={val => {
                    data.name = val;
                    setName(val);
                }}
                validate={val =>
                    (data[DATA_TYPE] === DataType.EMOJI && val.length > 2 && val.length < 32 && nameValidator.test(val))
                    || (data[DATA_TYPE] === DataType.STICKER && val.length > 2 && val.length < 30)
                    || "Name must be between 2 and 32 characters and only contain alphanumeric characters"
                }
            />
            <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1em",
                padding: "1em 0.5em",
                justifyContent: "center",
                alignItems: "center"
            }}>
                {guilds.map(guild => (
                    <Tooltip text={guild.name}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <div
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                role="button"
                                aria-label={"Clone to " + guild.name}
                                aria-disabled={isCloning}
                                style={{
                                    borderRadius: "50%",
                                    backgroundColor: "var(--background-secondary)",
                                    display: "inline-flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    width: "4em",
                                    height: "4em",
                                    cursor: isCloning ? "not-allowed" : "pointer",
                                    filter: isCloning ? "brightness(50%)" : "none"
                                }}
                                onClick={isCloning ? undefined : () => {
                                    setIsCloning(true);
                                    doClone(guild.id, data).finally(() => {
                                        invalidateMemo();
                                        setIsCloning(false);
                                    });
                                }}
                            >
                                {guild.icon ? (
                                    <img
                                        aria-hidden
                                        style={{
                                            borderRadius: "50%",
                                            width: "100%",
                                            height: "100%",
                                        }}
                                        src={guild.getIconURL(512, true)}
                                        alt={guild.name}
                                    />
                                ) : (
                                    <Forms.FormText
                                        style={{
                                            fontSize: getFontSize(guild.acronym),
                                            width: "100%",
                                            overflow: "hidden",
                                            whiteSpace: "nowrap",
                                            textAlign: "center",
                                            cursor: isCloning ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {guild.acronym}
                                    </Forms.FormText>
                                )}
                            </div>
                        )}
                    </Tooltip>
                ))}
            </div>
        </>
    );
}

const buildMenuItem = (type: DataType, fetchData: () => Promisable<$Emoji | $Sticker>) => (
    <Menu.MenuItem
        id="emote-cloner"
        key="emote-cloner"
        label={`Clone ${type}`}
        action={() =>
            openModalLazy(async () => {
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                const data = { [DATA_TYPE]: type, ...await fetchData() } as Data;
                const url = getUrl(data);

                return modalProps => (
                    <ModalRoot {...modalProps}>
                        <ModalHeader>
                            <img
                                role="presentation"
                                aria-hidden
                                src={url}
                                alt=""
                                height={24}
                                width={24}
                                style={{ marginRight: "0.5em" }}
                            />
                            <Forms.FormText>Clone {data.name}</Forms.FormText>
                        </ModalHeader>
                        <ModalContent>
                            <CloneModal data={data} />
                        </ModalContent>
                    </ModalRoot>
                );
            })
        }
    />
);

const isGifUrl = (url: string) => new URL(url).pathname.endsWith(".gif");

const enum FavoriteableType {
    EMOJI = "emoji",
    STICKER = "sticker",
}

interface Props {
    favoriteableId: string;
    favoriteableType: FavoriteableType;
    itemHref?: string;
    itemSrc: string;
    message: MessageRecord;
}

const messageContextMenuPatch = ((children, { favoriteableId, favoriteableType, itemHref, itemSrc, message }: Props) => {
    if (!favoriteableId) return;

    const menuItem = (() => {
        switch (favoriteableType) {
            case FavoriteableType.EMOJI:
                const match = message.content.match(RegExp(`<a?:(\\w+)(?:~\\d+)?:${favoriteableId}>|https://cdn\\.discordapp\\.com/emojis/${favoriteableId}\\.`));
                const reaction = message.reactions.find(reaction => reaction.emoji.id === favoriteableId);
                if (!match && !reaction) return;
                const name = (match && match[1]) ?? reaction?.emoji.name ?? "FakeNitroEmoji";

                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                return buildMenuItem(DataType.EMOJI, () => ({
                    id: favoriteableId,
                    name,
                    animated: isGifUrl(itemHref ?? itemSrc)
                } as $Emoji));
            case FavoriteableType.STICKER:
                const sticker = message.stickerItems.find(s => s.id === favoriteableId);
                if (sticker?.format_type === StickerFormat.LOTTIE) return;

                return buildMenuItem(DataType.STICKER, () => fetchSticker(favoriteableId));
        }
    })();

    if (menuItem)
        findGroupChildrenByChildId("copy-link", children)?.push(menuItem);
}) satisfies NavContextMenuPatchCallback;

const expressionPickerPatch = ((children, { target }: { target: HTMLElement; }) => {
    const { id, name, type } = target.dataset;
    if (!id) return;

    if (type === FavoriteableType.EMOJI && name) {
        const firstChild = target.firstChild as HTMLImageElement | null;

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        children.push(buildMenuItem(DataType.EMOJI, () => ({
            id,
            name,
            animated: firstChild && isGifUrl(firstChild.src)
        } as $Emoji)));
    } else if (type === FavoriteableType.STICKER && !target.className.includes("lottieCanvas")) {
        children.push(buildMenuItem(DataType.STICKER, () => fetchSticker(id)));
    }
}) satisfies NavContextMenuPatchCallback;

export default definePlugin({
    name: "EmoteCloner",
    description: "Allows you to clone Emotes & Stickers to your own server (right click them)",
    tags: ["StickerCloner"],
    authors: [Devs.Ven, Devs.Nuckyz],
    contextMenus: {
        "message": messageContextMenuPatch,
        "expression-picker": expressionPickerPatch
    }
});
