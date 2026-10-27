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
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { DeleteIcon, LinkIcon, PencilIcon, PlusIcon, TopRightArrow } from "@components/Icons";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { removeFromArray } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { CustomEmoji, Guild, GuildSticker, Message, MessageSnapshot, Sticker } from "@vencord/discord-types";
import { StickerFormatType, StickerType } from "@vencord/discord-types/enums";
import { DefaultExtractAndLoadChunksRegex, extractAndLoadChunksLazy, findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { ConfirmModal, Constants, EmojiStore, FluxDispatcher, GuildStore, Menu, openModal, openModalLazy, PermissionsBits, PermissionStore, React, RestAPI, SelectedGuildStore, showToast, StickersStore } from "@webpack/common";

import { openCloneStickerModal } from "./StickerCloneModal";


const openEmojiStudioModal = findByCodeLazy("Emoji Studio");
const loadCreateStickerModal = extractAndLoadChunksLazy(["CREATE_STICKER_MODAL", "#{intl::STICKER_PICKER_CREATE_STICKER}"], new RegExp(`\\.CREATE_STICKER_MODAL.{0,100}?${DefaultExtractAndLoadChunksRegex.source}`));
const CreateStickerModal = findComponentByCodeLazy("#{intl::GUILD_STICKER_INVALID_STICKER}");
let emojiUrlRegex: RegExp;

interface Emoji {
    id: string;
    name: string;
    isAnimated: boolean;
}

interface ForumTagContextMenuProps {
    tag: {
        emojiId: null | string;
    };
}


type PartialSticker = Pick<Sticker, "id" | "format_type">;

const StickerExtMap = {
    [StickerFormatType.PNG]: "png",
    [StickerFormatType.APNG]: "png",
    [StickerFormatType.LOTTIE]: "json",
    [StickerFormatType.GIF]: "gif"
} as const;

const settings = definePluginSettings({
    stickerCopyAndOpen: {
        type: OptionType.BOOLEAN,
        description: 'Add "Copy Sticker Link" and "Open Sticker Link" options to the sticker context menu',
        default: true
    }
});

const formatEmojiURL = (emoji: Emoji, size: number) => `${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${emoji.id}.webp?size=${size}&lossless=true&animated=true`;
export const formatStickerURL = (sticker: PartialSticker, size: number) => `${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${sticker.id}.${StickerExtMap[sticker.format_type]}?size=${size}&lossless=true&animated=true`;

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
    return buildCloneItem("Emoji", () => openEmojiUploadModal(formatEmojiURL(emoji, 128)));
}

function buildCloneStickerItem(fetchSticker: () => Promise<Sticker>) {
    return buildCloneItem("Sticker", () => openCloneStickerModal(fetchSticker));
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
                            return modalProps =>
                                <CreateStickerModal
                                    {...modalProps}
                                    sticker={expression}
                                    guildId={guild.id}
                                />;
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

function buildStickerLinkItems(sticker: PartialSticker, ParentComponent = Menu.MenuGroup) {
    return (
        <ParentComponent key="vc-em-sticker-links">
            <Menu.MenuItem
                id="vc-copy-sticker-link"
                key="vc-copy-sticker-link"
                label="Copy Sticker Link"
                leadingAccessory={{ type: "icon", icon: LinkIcon }}
                action={() => copyWithToast(formatStickerURL(sticker, 512), "Link copied!")}
            />

            <Menu.MenuItem
                id="vc-open-sticker-link"
                key="vc-open-sticker-link"
                label="Open Sticker Link"
                leadingAccessory={{ type: "icon", icon: LinkIcon }}
                trailingIndicator={{ type: "icon", icon: TopRightArrow }}
                action={() => VencordNative.native.openExternal(formatStickerURL(sticker, 512))}
            />
        </ParentComponent>
    );
}

function isAnimatedEmojiUrl(url: string) {
    const { pathname, searchParams } = new URL(url);
    return pathname.endsWith(".gif") || searchParams.get("animated") === "true";
}

function resolveEmojiName(favoriteableId: string, message: MessageSnapshot | Message) {
    const emoji = EmojiStore.getCustomEmojiById(favoriteableId);
    if (emoji) return emoji.name;

    const reaction = "reactions" in message && message.reactions.find(reaction => reaction.emoji.id === favoriteableId);
    if (reaction) return reaction.emoji.name;

    const match = message.content.match(RegExp(`<a?:(\\w+)(?:~\\d+)?:${favoriteableId}>|https://cdn\\.discordapp\\.com/emojis/${favoriteableId}\\.[\\w?&=%]*`));
    if (!match) return null;

    return match[1]
        ?? URL.parse(match[0])?.searchParams.get("name")
        ?? "FakeNitroEmoji";
}

const patchExpressionPickerMenu: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
    const { id, name, type, formatType } = props?.target?.dataset ?? {};
    if (!id) return;

    if (type === "emoji" && name) {
        const firstChild = props.target.firstChild as HTMLImageElement;

        children.push(
            <Menu.MenuGroup key="vc-em-group">
                {buildCloneEmojiItem({ id, name, isAnimated: firstChild && isAnimatedEmojiUrl(firstChild.src) })}
                {buildManageExpressionItems(id, type)}
            </Menu.MenuGroup>
        );

        return;
    }

    if (type === "sticker" && !props.target.className?.includes("lottieCanvas")) {
        if (settings.store.stickerCopyAndOpen) {
            const oldCopyLinkParent = findGroupChildrenByChildId("copy-image-link", children);
            if (oldCopyLinkParent) removeFromArray(oldCopyLinkParent, c => c?.props?.id === "copy-image-link");

            children.push(buildStickerLinkItems({ id, format_type: formatType as any }));
        }

        children.push(
            <Menu.MenuGroup key="vc-em-manage">
                {buildCloneStickerItem(() => fetchSticker(id))}
                {buildManageExpressionItems(id, type)}
            </Menu.MenuGroup>
        );
    }
};

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, props: Record<"favoriteableId" | "itemHref" | "itemSrc" | "favoriteableType", string> & { message: Message; mediaItem?: any; }) => {
    const { favoriteableId, mediaItem, itemHref, itemSrc, favoriteableType } = props ?? {};
    const { message } = props.message.messageSnapshots?.[0] ?? props;

    switch (favoriteableType) {
        case "emoji": {
            const name = resolveEmojiName(favoriteableId, message);
            if (!name) return;

            const favContainer = findGroupChildrenByChildId("favorite", children);
            const container = favContainer ?? findGroupChildrenByChildId("copy-native-link", children);

            container?.unshift(
                buildCloneEmojiItem({
                    id: favoriteableId,
                    name,
                    isAnimated: isAnimatedEmojiUrl(itemHref ?? itemSrc)
                }),
                !favContainer ? <Menu.MenuSeparator key="vc-em-emoji-separator" /> : null,
            );
            break;
        }
        case "sticker": {
            const sticker = message.stickerItems.find(s => s.id === favoriteableId);
            if (!sticker || sticker.format_type === StickerFormatType.LOTTIE) return;

            const favoriteContainer = findGroupChildrenByChildId("favorite", children);

            const cloneItem = buildCloneStickerItem(() => fetchSticker(favoriteableId));

            if (favoriteContainer) {
                favoriteContainer.unshift(cloneItem);
                favoriteContainer.push(
                    <Menu.MenuSeparator key="vc-em-sticker-links-separator" />,
                    buildStickerLinkItems(sticker, React.Fragment),
                );
            } else {
                children.splice(-1, 0,
                    <Menu.MenuGroup key="vc-em-clone-sticker-group">{cloneItem}</Menu.MenuGroup>,
                    buildStickerLinkItems(sticker)
                );
            }

            break;
        }
    }

    if (mediaItem?.contentType?.startsWith("image/")) {
        findGroupChildrenByChildId("save-image", children)?.push(
            <Menu.MenuItem
                key="vc-em-upload-as-emoji"
                id="vc-em-upload-as-emoji"
                label="Upload as Emoji"
                leadingAccessory={{ type: "icon", icon: PlusIcon }}
                action={() => openEmojiUploadModal(mediaItem.url)}
            />
        );
    }
};
/**
 * discord uses iamge-context for nitro emoijs in user status
 */
const patchImageContextMenu: NavContextMenuPatchCallback = (children, { target, src, ...props }: {
    target?: HTMLImageElement;
    src?: string;
}) => {
    console.log({ target, src, ...props });
    const [, id] = src?.match(emojiUrlRegex) ?? [];

    if (!id) return;

    const name = target?.alt || "EmojiName";
    children.push(buildCloneEmojiItem({
        id,
        name,
        isAnimated: isAnimatedEmojiUrl(src!)
    }));
    return;
};

const patchForumTagContextMenu: NavContextMenuPatchCallback = (children, { tag }: ForumTagContextMenuProps) => {
    if (!tag?.emojiId) return;
    // same function discord calls on the emoji id
    const emoji = EmojiStore.getUsableCustomEmojiById(tag.emojiId);

    if (!emoji) return;

    children.push(buildCloneEmojiItem({
        id: emoji.id,
        name: emoji.name,
        isAnimated: emoji.animated,
    }));
};

migratePluginSettings("ExpressionManager", "ExpressionCloner", "EmoteCloner");
export default definePlugin({
    name: "ExpressionManager",
    description: "Clone Emotes & Stickers. Adds context menu options to quickly clone, edit, or delete them. Also adds Copy & Save options for stickers",
    tags: ["Emotes", "Servers"],
    searchTerms: ["StickerCloner", "ExpressionCloner", "EmoteCloner", "EmojiCloner"],
    authors: [Devs.Ven, Devs.Nuckyz, Devs.scattagain, Devs.sadan],

    start() {
        const { CDN_HOST } = window.GLOBAL_ENV;
        if (!CDN_HOST) {
            new Logger("ExpressionManager").warn("GLOBAL_ENV.CDN_HOST missing");
        }
        emojiUrlRegex ??= new RegExp(`^${location.protocol}//${CDN_HOST}/emojis/(\\d+)\\.\\w+.+$`);
    },

    settings,

    contextMenus: {
        "message": patchMessageContextMenu,
        "expression-picker": patchExpressionPickerMenu,
        "image-context": patchImageContextMenu,
        "forum-tag": patchForumTagContextMenu,
    }
});
