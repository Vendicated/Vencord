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

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { migratePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { DeleteIcon, PencilIcon, PlusIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { CustomEmoji, Guild, GuildSticker, Message, Sticker } from "@vencord/discord-types";
import { StickerFormatType, StickerType } from "@vencord/discord-types/enums";
import { DefaultExtractAndLoadChunksRegex, extractAndLoadChunksLazy, findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { ConfirmModal, Constants, EmojiStore, FluxDispatcher, GuildStore, Menu, Modal, openModal, openModalLazy, PermissionsBits, PermissionStore, RestAPI, SelectedGuildStore, showToast, StickersStore } from "@webpack/common";

import { CloneModal } from "./StickerCloneModal";

const openEmojiStudioModal = findByCodeLazy("Emoji Studio");

const loadCreateStickerModal = extractAndLoadChunksLazy(["CREATE_STICKER_MODAL", "#{intl::STICKER_PICKER_CREATE_STICKER}"], new RegExp(`\\.CREATE_STICKER_MODAL.{0,100}?${DefaultExtractAndLoadChunksRegex.source}`));
const CreateStickerModal = findComponentByCodeLazy("#{intl::GUILD_STICKER_INVALID_STICKER}");

export interface Emoji {
    id: string;
    name: string;
    isAnimated: boolean;
}
const StickerExtMap = {
    [StickerFormatType.PNG]: "png",
    [StickerFormatType.APNG]: "png",
    [StickerFormatType.LOTTIE]: "json",
    [StickerFormatType.GIF]: "gif"
} as const;

const formatEmojiURL = (emoji: Emoji, size: number) => `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${emoji.id}.webp?size=${size}&lossless=true&animated=true`;
export const formatStickerURL = (sticker: Sticker, size: number) => `${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${sticker.id}.${StickerExtMap[sticker.format_type]}?size=${size}&lossless=true&animated=true`;

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

    return body as GuildSticker;
}

function buildCloneItem(type: string, action: () => void) {
    return (
        <Menu.MenuItem
            id="vc-em-clone"
            key="vc-em-clone"
            label={`Clone ${type}`}
            leadingAccessory={{ type: "icon", icon: PlusIcon }}
            action={action}
        />
    );
}

function buildCloneEmojiItem(emoji: Emoji) {
    return buildCloneItem(
        "Emoji",
        () => openEmojiUploadModal(formatEmojiURL(emoji, 128))
    );
}

function buildCloneStickerItem(fetchSticker: () => Promise<Sticker>) {
    return buildCloneItem(
        "Sticker",
        () =>
            openModalLazy(async () => {
                const sticker = await fetchSticker();
                return modalProps => (
                    <Modal
                        {...modalProps}
                        title={
                            <Flex gap="0.5em" alignItems="center">
                                <img
                                    role="presentation"
                                    aria-hidden
                                    src={formatStickerURL(sticker, 128)}
                                    alt=""
                                    height={24}
                                    width={24}
                                />
                                <BaseText tag="h3" size="md" weight="medium">Clone {sticker.name}</BaseText>
                            </Flex>
                        }
                    >
                        <CloneModal sticker={sticker} />
                    </Modal>
                );
            })
    );
}

async function openEmojiUploadModal(url: string, filename?: string) {
    filename ||= new URL(url).pathname.split("/").pop() ?? "emoji.png";

    const blob = await fetch(url).then(res => res.blob());

    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const image = new Image();
    image.src = dataUrl;
    await image.decode();

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
}

function buildManageExpressionItems(id: string, type: string) {
    let guild: Guild | undefined;
    let expression: GuildSticker | CustomEmoji;

    if (type === "emoji") {
        expression = EmojiStore.getCustomEmojiById(id)!;
        if (!expression) return null;

        guild = GuildStore.getGuild(expression.guildId);
    } else {
        const sticker = StickersStore.getStickerById(id);
        if (sticker?.type !== StickerType.GUILD) return null;

        expression = sticker;
        guild = GuildStore.getGuild(sticker.guild_id);
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

const patchExpressionPickerMenu: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
    const { id, name, type } = props?.target?.dataset ?? {};
    if (!id) return;

    if (type === "emoji" && name) {
        const firstChild = props.target.firstChild as HTMLImageElement;

        children.push(
            <Menu.MenuGroup key="vc-em-group">
                {buildCloneEmojiItem({ id, name, isAnimated: firstChild && isGifUrl(firstChild.src) })}
                {buildManageExpressionItems(id, type)}
            </Menu.MenuGroup>
        );

        return;
    }

    if (type === "sticker" && !props.target.className?.includes("lottieCanvas")) {
        children.push(
            buildCloneStickerItem(() => fetchSticker(id)),
            buildManageExpressionItems(id, type)
        );
    }
};

function isGifUrl(url: string) {
    const { pathname, searchParams } = new URL(url);
    return pathname.endsWith(".gif") || searchParams.get("animated") === "true";
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

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, props: Record<"favoriteableId" | "itemHref" | "itemSrc" | "favoriteableType", string> & { message: Message; mediaItem?: any; }) => {
    const { favoriteableId, mediaItem, itemHref, itemSrc, favoriteableType, message } = props ?? {};

    switch (favoriteableType) {
        case "emoji":
            const name = resolveEmojiName(favoriteableId, message);
            if (!name) return;

            findGroupChildrenByChildId("copy-link", children)?.push(
                buildCloneEmojiItem({
                    id: favoriteableId,
                    name,
                    isAnimated: isGifUrl(itemHref ?? itemSrc)
                })
            );
            break;

        case "sticker":
            const sticker = message.stickerItems.find(s => s.id === favoriteableId);
            if (sticker?.format_type === StickerFormatType.LOTTIE) return;

            findGroupChildrenByChildId("copy-link", children)?.push(
                buildCloneStickerItem(() => fetchSticker(favoriteableId))
            );
            break;
    }

    if (mediaItem?.contentType?.startsWith("image/")) {
        findGroupChildrenByChildId("copy-link", children)?.push(
            <Menu.MenuItem
                key="vc-em-upload-as-emoji"
                id="vc-em-upload-as-emoji"
                label="Upload as Emoji"
                action={() => openEmojiUploadModal(mediaItem.url)}
            />
        );
    }
};

migratePluginSettings("ExpressionManager", "ExpressionCloner", "EmoteCloner");
export default definePlugin({
    name: "ExpressionManager",
    description: "Clone Emotes & Stickers or quickly edit or delete them via the context menu",
    tags: ["Emotes", "Servers"],
    searchTerms: ["StickerCloner", "ExpressionCloner", "EmoteCloner", "EmojiCloner"],
    authors: [Devs.Ven, Devs.Nuckyz, Devs.scattagain],
    contextMenus: {
        "message": patchMessageContextMenu,
        "expression-picker": patchExpressionPickerMenu
    }
});
