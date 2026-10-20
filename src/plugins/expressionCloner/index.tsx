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
import { BaseText } from "@components/BaseText";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Flex } from "@components/Flex";
import { DeleteIcon, PencilIcon, PlusIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { getGuildAcronym, hasGuildFeature } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { CustomEmoji, Guild, GuildSticker, Message } from "@vencord/discord-types";
import { StickerFormatType, StickerType } from "@vencord/discord-types/enums";
import { DefaultExtractAndLoadChunksRegex, extractAndLoadChunksLazy, findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { ConfirmModal, Constants, EmojiStore, FluxDispatcher, Forms, GuildStore, IconUtils, Menu, Modal, openModal, openModalLazy, PermissionsBits, PermissionStore, React, RestAPI, SelectedGuildStore, showToast, StickersStore, Tooltip, UserStore } from "@webpack/common";
import { Promisable } from "type-fest";

const uploadEmoji = findByCodeLazy(".GUILD_EMOJIS(", "EMOJI_UPLOAD_START");
const openEmojiStudioModal = findByCodeLazy("Emoji Studio");

const loadCreateStickerModal = extractAndLoadChunksLazy(["CREATE_STICKER_MODAL", "#{intl::STICKER_PICKER_CREATE_STICKER}"], new RegExp(`\\.CREATE_STICKER_MODAL.{0,100}?${DefaultExtractAndLoadChunksRegex.source}`));
const CreateStickerModal = findComponentByCodeLazy("#{intl::GUILD_STICKER_INVALID_STICKER}");

interface Sticker extends GuildSticker {
    t: "Sticker";
}

interface Emoji {
    t: "Emoji";
    id: string;
    name: string;
    isAnimated: boolean;
}

type Data = Emoji | Sticker;

const StickerExtMap = {
    [StickerFormatType.PNG]: "png",
    [StickerFormatType.APNG]: "png",
    [StickerFormatType.LOTTIE]: "json",
    [StickerFormatType.GIF]: "gif"
} as const;

const PremiumTierStickerLimitMap = {
    0: 5,
    1: 15,
    2: 30,
    3: 60
} as const;

const MAX_EMOJI_SIZE_BYTES = 256 * 1024;
const MAX_STICKER_SIZE_BYTES = 512 * 1024;

function getGuildMaxStickerSlots(guild: Guild) {
    if (guild.features.has("MORE_STICKERS") && guild.premiumTier === 3)
        return 120;

    return PremiumTierStickerLimitMap[guild.premiumTier] ?? PremiumTierStickerLimitMap[0];
}

function getGuildMaxEmojiSlots(guild: Guild) {
    return Math.max(
        hasGuildFeature(guild, "MORE_EMOJI") ? 200 : 50,
        50 + (guild.premiumFeatures?.additionalEmojiSlots ?? 0)
    );
}

function getUrl(data: Data, size: number) {
    if (data.t === "Emoji")
        return `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${data.id}.webp?size=${size}&lossless=true&animated=true`;

    return `${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${data.id}.${StickerExtMap[data.format_type]}?size=${size}&lossless=true&animated=true`;
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
    data.append("file", await fetchBlob(sticker));

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
    const data = await fetchBlob(emoji);

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

        if (data.t === "Sticker") {
            const stickerSlots = getGuildMaxStickerSlots(g);
            const stickers = StickersStore.getStickersByGuildId(g.id);

            return !stickers || stickers.length < stickerSlots;
        }

        const { isAnimated } = data as Emoji;

        const emojiSlots = getGuildMaxEmojiSlots(g);
        const emojis = EmojiStore.getGuildEmoji(g.id);

        let count = 0;
        for (const emoji of emojis) {
            if (emoji.animated === isAnimated && !emoji.managed) {
                count++;
            }
        }

        return count < emojiSlots;
    }).sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchBlob(data: Data) {
    const MAX_SIZE = data.t === "Sticker"
        ? MAX_STICKER_SIZE_BYTES
        : MAX_EMOJI_SIZE_BYTES;

    for (let size = 4096; size >= 16; size /= 2) {
        const url = getUrl(data, size);
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`Failed to fetch ${url} - ${res.status}`);

        const blob = await res.blob();
        if (blob.size <= MAX_SIZE)
            return blob;
    }

    throw new Error(`Failed to fetch ${data.t} within size limit of ${MAX_SIZE / 1000}kB`);
}

async function doClone(guildId: string, data: Sticker | Emoji) {
    try {
        if (data.t === "Sticker")
            await cloneSticker(guildId, data);
        else
            await cloneEmoji(guildId, data);

        showToast({ text: `Successfully cloned ${data.name} to ${GuildStore.getGuild(guildId)?.name ?? "your server"}!`, variant: "success" });
    } catch (e: any) {
        let message = "Something went wrong (check console!)";
        try {
            message = JSON.parse(e.text).message;
        } catch { }

        new Logger("ExpressionCloner").error("Failed to clone", data.name, "to", guildId, e);
        showToast({ text: "Failed to clone: " + message, variant: "critical" });
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
            <Forms.FormTitle>Custom Name</Forms.FormTitle>
            <CheckedTextInput
                initialValue={name}
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
            leadingAccessory={{ type: "icon", icon: PlusIcon }}
            action={() =>
                openModalLazy(async () => {
                    const res = await fetchData();
                    const data = { t: type, ...res } as Sticker | Emoji;
                    const url = getUrl(data, 128);

                    return modalProps => (
                        <Modal
                            {...modalProps}
                            title={
                                <Flex gap="0.5em" alignItems="center">
                                    <img
                                        role="presentation"
                                        aria-hidden
                                        src={url}
                                        alt=""
                                        height={24}
                                        width={24}
                                    />
                                    <BaseText tag="h3" size="md" weight="medium">Clone {data.name}</BaseText>
                                </Flex>
                            }
                        >
                            <CloneModal data={data} />
                        </Modal>
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

function resolveEmojiName(favoriteableId: string, message: Message) {
    const emoji = EmojiStore.getCustomEmojiById(favoriteableId);
    if (emoji) return emoji.name;

    const reaction = message.reactions.find(reaction => reaction.emoji.id === favoriteableId);
    if (reaction) return reaction.emoji.name;

    const match = message.content.match(RegExp(`<a?:(\\w+)(?:~\\d+)?:${favoriteableId}>|https://cdn\\.discordapp\\.com/emojis/${favoriteableId}\\.[\\w?&=%]*`));
    if (!match) return null;

    return match[1]
        ?? URL.parse(match[0])?.searchParams.get("name")
        ?? "FakeNitroEmoji";
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props: Record<"favoriteableId" | "itemHref" | "itemSrc" | "favoriteableType", string> & { message: Message; mediaItem?: any; }) => {
    const { favoriteableId, mediaItem, itemHref, itemSrc, favoriteableType, message } = props ?? {};

    const menuItem = (() => {
        switch (favoriteableType) {
            case "emoji":
                const name = resolveEmojiName(favoriteableId, message);
                if (!name) return;

                return buildMenuItem("Emoji", () => ({
                    id: favoriteableId,
                    name,
                    isAnimated: isGifUrl(itemHref ?? itemSrc)
                }));
            case "sticker":
                const sticker = message.stickerItems.find(s => s.id === favoriteableId);
                if (sticker?.format_type === 3 /* LOTTIE */) return;

                return buildMenuItem("Sticker", () => fetchSticker(favoriteableId));
        }
    })();

    if (menuItem)
        findGroupChildrenByChildId("copy-link", children)?.push(menuItem);

    if (mediaItem?.contentType?.startsWith("image/")) {
        findGroupChildrenByChildId("copy-link", children)?.push(
            <Menu.MenuItem
                key="vc-em-upload-as-emoji"
                id="vc-em-upload-as-emoji"
                label="Upload as Emoji"
                action={async () => {
                    const blob = await fetch(mediaItem.url).then(res => res.blob());

                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });

                    const image = new Image();
                    image.src = dataUrl;
                    await image.decode();

                    const filename = new URL(mediaItem.url).pathname.split("/").pop() ?? "emoji.png";
                    const file = new File([blob], filename, { type: "image/png" });

                    await openEmojiStudioModal({
                        analyticsLocation: {
                            page: "Guild Settings"
                        },
                        guildId: SelectedGuildStore.getGuildId(),
                        userImage: {
                            image,
                            file,
                            data: dataUrl
                        }
                    });
                }}
            />
        );
    }
};

function buildManageExpressionItems(id: string, type: string) {
    let guild: Guild | undefined;
    let expression: GuildSticker | CustomEmoji;

    if (type === "emoji") {
        const emoji = EmojiStore.getCustomEmojiById(id);
        if (emoji) {
            guild = GuildStore.getGuild(emoji.guildId);
            expression = emoji;
        }
    } else if (type === "sticker") {
        const sticker = StickersStore.getStickerById(id);
        if (sticker?.type === StickerType.GUILD) {
            guild = GuildStore.getGuild(sticker.guild_id);
            expression = sticker;
        }
    }

    if (!guild || !PermissionStore.can(PermissionsBits.MANAGE_GUILD_EXPRESSIONS, guild)) return null;

    const expressionName = type === "emoji" ? "Emoji" : "Sticker";

    return (
        <>
            <Menu.MenuItem
                key="vc-em-edit"
                id="vc-em-edit"
                label={`Edit ${expressionName}`}
                leadingAccessory={{ type: "icon", icon: PencilIcon }}
                action={() => {
                    if (type === "sticker") {
                        openModalLazy(async () => {
                            await loadCreateStickerModal();
                            return modalProps => {
                                <CreateStickerModal
                                    {...modalProps}
                                    sticker={expression}
                                    guildId={guild.id}
                                />;
                            };
                        });
                    } else {
                        openEmojiStudioModal({
                            analyticsLocation: "guild settings edit emoji",
                            emoji: expression,
                            guildId: guild.id
                        });
                    }
                }}
            />
            <Menu.MenuItem
                key="vc-em-delete"
                id="vc-em-delete"
                label={`Delete ${expressionName}`}
                leadingAccessory={{ type: "icon", icon: DeleteIcon }}
                color="danger"
                action={() => {
                    openModal(modalProps =>
                        <ConfirmModal
                            {...modalProps}
                            title={`Delete ${expression.name}`}
                            subtitle={`Are you sure you want to delete this ${type}?`}
                            confirmText="Delete"
                            onConfirm={async () => {
                                const url = type === "emoji"
                                    ? Constants.Endpoints.GUILD_EMOJI(guild.id, id)
                                    : Constants.Endpoints.GUILD_STICKER(guild.id, id);

                                await RestAPI.del(url).then(
                                    () => showToast({ text: `${expressionName} deleted successfully.`, variant: "success" }),
                                    () => showToast({ text: `Failed to delete ${expressionName}`, variant: "critical" })
                                );
                            }}
                        />
                    );
                }}
            />
        </>
    );
}

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
    const { id, name, type } = props?.target?.dataset ?? {};
    if (!id) return;

    if (type === "emoji" && name) {
        const firstChild = props.target.firstChild as HTMLImageElement;

        children.push(
            <Menu.MenuGroup key="vc-em-group">
                {buildMenuItem("Emoji", () => ({
                    id,
                    name,
                    isAnimated: firstChild && isGifUrl(firstChild.src)
                }))}
                {buildManageExpressionItems(id, type)}
            </Menu.MenuGroup>
        );
    } else if (type === "sticker" && !props.target.className?.includes("lottieCanvas")) {
        children.push(
            buildMenuItem("Sticker", () => fetchSticker(id)),
            buildManageExpressionItems(id, type)
        );
    }
};

migratePluginSettings("ExpressionCloner", "EmoteCloner");
export default definePlugin({
    name: "ExpressionCloner",
    description: "Allows you to clone Emotes & Stickers to your own server (right click them)",
    tags: ["Emotes", "Servers"],
    searchTerms: ["StickerCloner", "EmoteCloner", "EmojiCloner"],
    authors: [Devs.Ven, Devs.Nuckyz, Devs.scattagain],
    contextMenus: {
        "message": messageContextMenuPatch,
        "expression-picker": expressionPickerPatch
    }
});
