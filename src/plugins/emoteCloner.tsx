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

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { ModalContent, ModalHeader, ModalRoot, openModalLazy } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, Forms, GuildStore, Menu, PermissionStore, React, RestAPI, Toasts, Tooltip, UserStore } from "@webpack/common";
import { Promisable } from "type-fest";

const MANAGE_EMOJIS_AND_STICKERS = 1n << 30n;

const GuildEmojiStore = findStoreLazy("EmojiStore");
const StickersStore = findStoreLazy("StickersStore");
const uploadEmoji = findByCodeLazy('"EMOJI_UPLOAD_START"', "GUILD_EMOJIS(");

interface Sticker {
    description: string;
    format_type: number;
    guild_id: string;
    id: string;
    name: string;
    tags: string;
    type: number;
}

interface Emoji {
    id: string;
    name: string;
    isAnimated: boolean;
}

type Data = Emoji | Sticker;

const enum Type {
    Emoji,
    Sticker
}

const StickerExt = [, "png", "png", "json", "gif"] as const;

function getUrl(type: Type, data: Data) {
    if (type === Type.Emoji)
        return `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${data.id}.${(data as Emoji).isAnimated ? "gif" : "png"}`;

    return `${location.origin}/stickers/${data.id}.${StickerExt[(data as Sticker).format_type]}`;
}

async function fetchSticker(id: string) {
    const cached = StickersStore.getStickerById(id);
    if (cached) return cached;

    const { body } = await RestAPI.get({
        url: `/stickers/${id}`
    });

    FluxDispatcher.dispatch({
        type: "STICKER_FETCH_SUCCESS",
        sticker: body
    });

    return body as Sticker;
}

async function cloneSticker(guildId: string, sticker: Sticker) {
    const data = new FormData();
    data.append("name", sticker.name);
    data.append("tags", sticker.tags);
    data.append("description", sticker.description);
    data.append("file", await fetchBlob(getUrl(Type.Sticker, sticker)));

    const { body } = await RestAPI.post({
        url: `/guilds/${guildId}/stickers`,
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
    const data = await fetchBlob(getUrl(Type.Emoji, emoji));

    const dataUrl = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(data);
    });

    return uploadEmoji({
        guildId,
        name: emoji.name.split("~")[0],
        image: dataUrl
    });
}

function getGuildCandidates(type: Type, data: Data) {
    const meId = UserStore.getCurrentUser().id;

    return Object.values(GuildStore.getGuilds()).filter(g => {
        const canCreate = g.ownerId === meId ||
            BigInt(PermissionStore.getGuildPermissions({ id: g.id }) & MANAGE_EMOJIS_AND_STICKERS) === MANAGE_EMOJIS_AND_STICKERS;
        if (!canCreate) return false;

        if (type === Type.Sticker) return true;

        const { isAnimated } = data as Emoji;

        const emojiSlots = g.getMaxEmojiSlots();
        const { emojis } = GuildEmojiStore.getGuilds()[g.id];

        let count = 0;
        for (const emoji of emojis)
            if (emoji.animated === isAnimated) count++;
        return count < emojiSlots;
    }).sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchBlob(url: string) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to fetch ${url} - ${res.status}`);

    return res.blob();
}

async function doClone(type: Type, guildId: string, data: Sticker | Emoji) {
    try {
        if (type === Type.Sticker)
            await cloneSticker(guildId, data as Sticker);
        else
            await cloneEmoji(guildId, data as Emoji);

        Toasts.show({
            message: `Successfully cloned ${data.name} to ${GuildStore.getGuild(guildId)?.name ?? "your server"}!`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId()
        });
    } catch (e) {
        new Logger("EmoteCloner").error("Failed to clone", data.name, "to", guildId, e);
        Toasts.show({
            message: "Oopsie something went wrong :( Check console!!!",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId()
        });
    }
}

const getFontSize = (s: string) => {
    // [18, 18, 16, 16, 14, 12, 10]
    const sizes = [20, 20, 18, 18, 16, 14, 12];
    return sizes[s.length] ?? 4;
};

const nameValidator = /^\w+$/i;

function CloneModal({ type, data }: { type: Type, data: Sticker | Emoji; }) {
    const [isCloning, setIsCloning] = React.useState(false);
    const [name, setName] = React.useState(data.name);

    const [x, invalidateMemo] = React.useReducer(x => x + 1, 0);

    const guilds = React.useMemo(() => getGuildCandidates(Type.Emoji, data), [data.id, x]);

    return (
        <>
            <Forms.FormTitle className={Margins.top20}>Custom Name</Forms.FormTitle>
            <CheckedTextInput
                value={name}
                onChange={setName}
                validate={v =>
                    (v.length > 1 && v.length < 32 && nameValidator.test(v))
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
                {guilds.map(g => (
                    <Tooltip text={g.name}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <div
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                role="button"
                                aria-label={"Clone to " + g.name}
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
                                onClick={isCloning ? void 0 : async () => {
                                    setIsCloning(true);
                                    doClone(type, g.id, data).finally(() => {
                                        invalidateMemo();
                                        setIsCloning(false);
                                    });
                                }}
                            >
                                {g.icon ? (
                                    <img
                                        aria-hidden
                                        style={{
                                            borderRadius: "50%",
                                            width: "100%",
                                            height: "100%",
                                        }}
                                        src={g.getIconURL(512, true)}
                                        alt={g.name}
                                    />
                                ) : (
                                    <Forms.FormText
                                        style={{
                                            fontSize: getFontSize(g.acronym),
                                            width: "100%",
                                            overflow: "hidden",
                                            whiteSpace: "nowrap",
                                            textAlign: "center",
                                            cursor: isCloning ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {g.acronym}
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

function buildMenuItem(type: Type, fetchData: () => Promisable<Sticker | Emoji>) {
    return (
        <Menu.MenuItem
            id="emote-cloner"
            key="emote-cloner"
            label={`Clone ${type === Type.Emoji ? "Emoji" : "Sticker"}`}
            action={() =>
                openModalLazy(async () => {
                    const data = await fetchData();
                    const url = getUrl(type, data);

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
                                <CloneModal type={type} data={data} />
                            </ModalContent>
                        </ModalRoot>
                    );
                })
            }
        />
    );
}

function isGifUrl(url: string) {
    return new URL(url).pathname.endsWith(".gif");
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const { favoriteableId, itemHref, itemSrc, favoriteableType } = props ?? {};

    if (!favoriteableId) return;

    const menuItem = (() => {
        switch (favoriteableType) {
            case "emoji":
                const match = props.message.content.match(RegExp(`<a?:(\\w+)(?:~\\d+)?:${favoriteableId}>|https://cdn\\.discordapp\\.com/emojis/${favoriteableId}\\.`));
                if (!match) return;
                const name = match[1] ?? "FakeNitroEmoji";

                return buildMenuItem(Type.Emoji, () => ({
                    id: favoriteableId,
                    name,
                    isAnimated: isGifUrl(itemHref ?? itemSrc)
                }));
            case "sticker":
                return buildMenuItem(Type.Sticker, () => fetchSticker(favoriteableId));
        }
    })();

    if (menuItem)
        findGroupChildrenByChildId("copy-link", children)?.push(menuItem);
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => () => {
    const { id, name, type } = props?.target?.dataset ?? {};
    if (!id) return;

    if (type === "emoji" && name) {
        const firstChild = props.target.firstChild as HTMLImageElement;

        children.push(buildMenuItem(Type.Emoji, () => ({
            id,
            name,
            isAnimated: firstChild && isGifUrl(firstChild.src)
        })));
    } else if (type === "sticker") {
        children.push(buildMenuItem(Type.Sticker, () => fetchSticker(id)));
    }
};

export default definePlugin({
    name: "EmoteCloner",
    description: "Adds a Clone context menu item to emotes to clone them your own server",
    authors: [Devs.Ven, Devs.Nuckyz],

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
        addContextMenuPatch("expression-picker", expressionPickerPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
        removeContextMenuPatch("expression-picker", expressionPickerPatch);
    }
});
