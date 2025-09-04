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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings } from "@api/Settings";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Devs } from "@utils/constants";
import { getGuildAcronym } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { ModalContent, ModalHeader, ModalRoot, openModalLazy } from "@utils/modal";
import definePlugin from "@utils/types";
import { Guild } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { Constants, EmojiStore, FluxDispatcher, Forms, GuildStore, IconUtils, Menu, PermissionsBits, PermissionStore, React, RestAPI, Toasts, Tooltip, UserStore } from "@webpack/common";
import { Promisable } from "type-fest";

const StickersStore = findStoreLazy("StickersStore");
const uploadEmoji = findByCodeLazy(".GUILD_EMOJIS(", "EMOJI_UPLOAD_START");

const getGuildMaxEmojiSlots = findByCodeLazy(".additionalEmojiSlots") as (guild: Guild) => number;

interface Sticker {
    t: "Sticker";
    description: string;
    format_type: number;
    guild_id: string;
    id: string;
    name: string;
    tags: string;
    type: number;
}

interface Emoji {
    t: "Emoji";
    id: string;
    name: string;
    isAnimated: boolean;
}

type Data = Emoji | Sticker;

const StickerExt = [, "png", "png", "json", "gif"] as const;

function getUrl(data: Data) {
    if (data.t === "Emoji")
        return `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${data.id}.${data.isAnimated ? "gif" : "png"}?size=4096&lossless=true`;

    return `${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${data.id}.${StickerExt[data.format_type]}?size=4096&lossless=true`;
}

async function fetchSticker(id: string) {
    const cached = StickersStore.getStickerById(id);
    if (cached) return cached;

    const { body } = await RestAPI.get({
        url: Constants.Endpoints.STICKER(id)
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
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(data);
    });

    return uploadEmoji({
        guildId,
        name: emoji.name.split("~")[0],
        image: dataUrl
    });
}

function getGuildCandidates(data: Data) {
    const meId = UserStore.getCurrentUser().id;

    return Object.values(GuildStore.getGuilds()).filter(g => {
        const canCreate = g.ownerId === meId ||
            (PermissionStore.getGuildPermissions({ id: g.id }) & PermissionsBits.CREATE_GUILD_EXPRESSIONS) === PermissionsBits.CREATE_GUILD_EXPRESSIONS;
        if (!canCreate) return false;

        if (data.t === "Sticker") return true;

        const { isAnimated } = data as Emoji;

        const emojiSlots = getGuildMaxEmojiSlots(g);
        const { emojis } = EmojiStore.getGuilds()[g.id];

        let count = 0;
        for (const emoji of emojis)
            if (emoji.animated === isAnimated && !emoji.managed)
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

async function doClone(guildId: string, data: Sticker | Emoji) {
    try {
        if (data.t === "Sticker")
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

        new Logger("ExpressionCloner").error("Failed to clone", data.name, "to", guildId, e);
        Toasts.show({
            message: "Failed to clone: " + message,
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

function CloneModal({ data }: { data: Sticker | Emoji; }) {
    const [isCloning, setIsCloning] = React.useState(false);
    const [name, setName] = React.useState(data.name);

    const [x, invalidateMemo] = React.useReducer(x => x + 1, 0);

    const guilds = React.useMemo(() => getGuildCandidates(data), [data.id, x]);

    return (
        <>
            <Forms.FormTitle className={Margins.top20}>Custom Name</Forms.FormTitle>
            <CheckedTextInput
                value={name}
                onChange={v => {
                    data.name = v;
                    setName(v);
                }}
                validate={v =>
                    (data.t === "Emoji" && v.length > 2 && v.length < 32 && nameValidator.test(v))
                    || (data.t === "Sticker" && v.length > 2 && v.length < 30)
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
                    <Tooltip key={g.id} text={g.name}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <div
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                role="button"
                                aria-label={"Clone to " + g.name}
                                aria-disabled={isCloning}
                                style={{
                                    borderRadius: "50%",
                                    backgroundColor: "var(--background-base-lower)",
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
                                    doClone(g.id, data).finally(() => {
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
                                        src={IconUtils.getGuildIconURL({
                                            id: g.id,
                                            icon: g.icon,
                                            canAnimate: true,
                                            size: 512
                                        })}
                                        alt={g.name}
                                    />
                                ) : (
                                    <Forms.FormText
                                        style={{
                                            fontSize: getFontSize(getGuildAcronym(g)),
                                            width: "100%",
                                            overflow: "hidden",
                                            whiteSpace: "nowrap",
                                            textAlign: "center",
                                            cursor: isCloning ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {getGuildAcronym(g)}
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

function buildMenuItem(type: "Emoji" | "Sticker", fetchData: () => Promisable<Omit<Sticker | Emoji, "t">>) {
    return (
        <Menu.MenuItem
            id="emote-cloner"
            key="emote-cloner"
            label={`Clone ${type}`}
            action={() =>
                openModalLazy(async () => {
                    const res = await fetchData();
                    const data = { t: type, ...res } as Sticker | Emoji;
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
}

function isGifUrl(url: string) {
    const u = new URL(url);
    return u.pathname.endsWith(".gif") || u.searchParams.get("animated") === "true";
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const { favoriteableId, itemHref, itemSrc, favoriteableType } = props ?? {};

    if (!favoriteableId) return;

    const menuItem = (() => {
        switch (favoriteableType) {
            case "emoji":
                const match = props.message.content.match(RegExp(`<a?:(\\w+)(?:~\\d+)?:${favoriteableId}>|https://cdn\\.discordapp\\.com/emojis/${favoriteableId}\\.`));
                const reaction = props.message.reactions.find(reaction => reaction.emoji.id === favoriteableId);
                if (!match && !reaction) return;
                const name = (match && match[1]) ?? reaction?.emoji.name ?? "FakeNitroEmoji";

                return buildMenuItem("Emoji", () => ({
                    id: favoriteableId,
                    name,
                    isAnimated: isGifUrl(itemHref ?? itemSrc)
                }));
            case "sticker":
                const sticker = props.message.stickerItems.find(s => s.id === favoriteableId);
                if (sticker?.format_type === 3 /* LOTTIE */) return;

                return buildMenuItem("Sticker", () => fetchSticker(favoriteableId));
        }
    })();

    if (menuItem)
        findGroupChildrenByChildId("copy-link", children)?.push(menuItem);
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
    const { id, name, type } = props?.target?.dataset ?? {};
    if (!id) return;

    if (type === "emoji" && name) {
        const firstChild = props.target.firstChild as HTMLImageElement;

        children.push(buildMenuItem("Emoji", () => ({
            id,
            name,
            isAnimated: firstChild && isGifUrl(firstChild.src)
        })));
    } else if (type === "sticker" && !props.target.className?.includes("lottieCanvas")) {
        children.push(buildMenuItem("Sticker", () => fetchSticker(id)));
    }
};

migratePluginSettings("ExpressionCloner", "EmoteCloner");
export default definePlugin({
    name: "ExpressionCloner",
    description: "Allows you to clone Emotes & Stickers to your own server (right click them)",
    tags: ["StickerCloner", "EmoteCloner", "EmojiCloner"],
    authors: [Devs.Ven, Devs.Nuckyz],
    contextMenus: {
        "message": messageContextMenuPatch,
        "expression-picker": expressionPickerPatch
    }
});
