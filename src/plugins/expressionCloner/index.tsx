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
import { BaseText } from "@components/BaseText";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Flex } from "@components/Flex";
import { PlusIcon } from "@components/Icons";
import { Span } from "@components/Span";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getGuildAcronym, hasGuildFeature } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Guild, GuildSticker } from "@vencord/discord-types";
import { StickerFormatType } from "@vencord/discord-types/enums";
import { findByCodeLazy } from "@webpack";
import { Clickable, Constants, EmojiStore, FluxDispatcher, Forms, GuildStore, IconUtils, Menu, Modal, openModalLazy, PermissionsBits, PermissionStore, React, RestAPI, StickersStore, Toasts, Tooltip, UserStore } from "@webpack/common";
import { CSSProperties, PropsWithChildren } from "react";
import { Promisable } from "type-fest";

const cn = classNameFactory("vc-expr-cloner-");

const uploadEmoji = findByCodeLazy(".GUILD_EMOJIS(", "EMOJI_UPLOAD_START");

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

// return number instead of inference because tsserver is insane and has some UI issues
function getGuildMaxStickerSlots(guild: Guild): number {
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

interface GuildCandidate {
    guild: Guild;
    /**
     * total number of slots for an expression type
     */
    totalSlots: number;
    /**
     * number of used slots for an expression type
     *
     * could be greater than {@link totalSlots} if the guild has lost slots due to nitro expiring
     */
    usedSlots: number;
}

function hasFreeSlots(guild: GuildCandidate) {
    return guild.usedSlots < guild.totalSlots;
}

function filterGuildCandidate(c: GuildCandidate | null): c is GuildCandidate {
    if (!c) return false;
    if (!settings.store.showFullGuilds && !hasFreeSlots(c)) return false;

    return true;
}

function getGuildCandidates(data: Data): GuildCandidate[] {
    const meId = UserStore.getCurrentUser().id;

    return Object.values(GuildStore.getGuilds())
        .map((g): GuildCandidate | null => {
            const canCreate = g.ownerId === meId ||
                (PermissionStore.getGuildPermissions({ id: g.id }) & PermissionsBits.CREATE_GUILD_EXPRESSIONS) === PermissionsBits.CREATE_GUILD_EXPRESSIONS;
            if (!canCreate) return null;

            if (data.t === "Sticker") {
                const stickerSlots = getGuildMaxStickerSlots(g);
                const stickers = StickersStore.getStickersByGuildId(g.id);

                return {
                    guild: g,
                    totalSlots: stickerSlots,
                    usedSlots: stickers?.length ?? 0
                };
            }

            const { isAnimated } = data;
            const emojiSlots = getGuildMaxEmojiSlots(g);
            const emojis = EmojiStore.getGuildEmoji(g.id);
            let usedSlots = 0;

            for (const emoji of emojis) {
                if (emoji.animated === isAnimated && !emoji.managed) {
                    usedSlots++;
                }
            }

            return {
                guild: g,
                totalSlots: emojiSlots,
                usedSlots,
            };
        })
        .filter(filterGuildCandidate)
        .sort((a, b) => a.guild.name.localeCompare(b.guild.name))
        // move guilds with no free slots to the end, but keep them sorted by name
        .sort((a, b) => +hasFreeSlots(b) - +hasFreeSlots(a));
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

function getFontSize(s: string) {
    // [18, 18, 16, 16, 14, 12, 10]
    const sizes = [20, 20, 18, 18, 16, 14, 12];
    return sizes[s.length] ?? 4;
}

const nameValidator = /^\w+$/i;


interface SlotBadgeProps extends PropsWithChildren {
    used: number;
    total: number;
}

function SlotBadge({ used, total, children }: SlotBadgeProps) {
    return (
        <div
            className={cn("slot-badge-container")}
        >
            {children}
            <div
                className={cn("slot-badge", {
                    "slot-badge-full": used >= total
                })}
            >
                {used}/{total}
            </div>
        </div>
    );
}

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
            <div className={cn("guild-select-modal")}>
                {guilds.map(({ guild: g, totalSlots, usedSlots }) => {
                    const hasFreeSlots = usedSlots < totalSlots;
                    const canClone = hasFreeSlots && !isCloning;
                    const cursor: CSSProperties["cursor"] = canClone ? "pointer" : "not-allowed";
                    const filter: CSSProperties["filter"] = !hasFreeSlots
                        ? "grayscale(1) brightness(50%)"
                        : isCloning
                            ? "brightness(50%)"
                            : undefined;
                    return (
                        <Tooltip key={g.id} text={<Span>{g.name} &mdash; {usedSlots}/{totalSlots}</Span>}>
                            {({ onMouseLeave, onMouseEnter }) => (
                                <Clickable
                                    onMouseLeave={onMouseLeave}
                                    onMouseEnter={onMouseEnter}
                                    role="button"
                                    aria-label={`Clone to ${g.name}`}
                                    aria-disabled={!canClone}
                                    onClick={canClone ? async () => {
                                        setIsCloning(true);
                                        doClone(g.id, data).finally(() => {
                                            invalidateMemo();
                                            setIsCloning(false);
                                        });
                                    } : void 0}
                                >
                                    <SlotBadge total={totalSlots} used={usedSlots}>
                                        <div
                                            className={cn("guild-icon-container")}
                                            style={{ filter }}
                                        >
                                            {g.icon ? (
                                                <img
                                                    aria-hidden
                                                    style={{ cursor }}
                                                    className={cn("guild-icon")}
                                                    src={IconUtils.getGuildIconURL({
                                                        id: g.id,
                                                        icon: g.icon,
                                                        canAnimate: true,
                                                        size: 512
                                                    })}
                                                    alt={name} />
                                            ) : (
                                                <Forms.FormText
                                                    style={{
                                                        fontSize: getFontSize(getGuildAcronym(g)),
                                                        cursor,
                                                    }}
                                                    className={cn("guild-icon-placeholder")}
                                                >
                                                    {getGuildAcronym(g)}
                                                </Forms.FormText>
                                            )}
                                        </div>
                                    </SlotBadge>
                                </Clickable>
                            )}
                        </Tooltip>
                    );
                })}
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

const settings = definePluginSettings({
    showFullGuilds: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show guilds that have no free expression slots left in the clone modal"
    }
});

migratePluginSettings("ExpressionCloner", "EmoteCloner");
export default definePlugin({
    name: "ExpressionCloner",
    description: "Allows you to clone Emotes & Stickers to your own server (right click them)",
    tags: ["Emotes", "Servers"],
    searchTerms: ["StickerCloner", "EmoteCloner", "EmojiCloner"],
    authors: [Devs.Ven, Devs.Nuckyz, Devs.sadan],
    contextMenus: {
        "message": messageContextMenuPatch,
        "expression-picker": expressionPickerPatch
    },
    settings,
});
