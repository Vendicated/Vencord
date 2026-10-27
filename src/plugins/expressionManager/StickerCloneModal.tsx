/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CheckedTextInput } from "@components/CheckedTextInput";
import { Flex } from "@components/Flex";
import { HeadingTertiary } from "@components/Heading";
import { Margins } from "@components/margins";
import { Span } from "@components/Span";
import { Text } from "@components/Text";
import { classNameFactory } from "@utils/css";
import { getGuildAcronym } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import { Guild, GuildSticker, Sticker, StickerItem } from "@vencord/discord-types";
import { AuthenticationStore, Clickable, Constants, FluxDispatcher, GuildStore, IconUtils, Modal, openModalLazy, PermissionsBits, PermissionStore, React, RestAPI, showToast, StickersStore, Tooltip, useMemo, UserStore, useState } from "@webpack/common";

import { formatStickerURL, logger } from ".";

const cl = classNameFactory("vc-expressionManager-");

const getFontSize = (s: string) => {
    // Font size array from Discord. We currently use XLarge, commented out is
    // [18, 18, 16, 16, 14, 12, 10]
    const sizes = [20, 20, 18, 18, 16, 14, 12];
    return sizes[s.length] ?? 4;
};

type PartialSticker = StickerItem & Partial<Sticker>;

const PremiumTierStickerLimitMap = {
    0: 5,
    1: 15,
    2: 30,
    3: 60
} as const;

const MAX_STICKER_SIZE_BYTES = 512 * 1024;

function getGuildMaxStickerSlots(guild: Guild): number {
    if (guild.features.has("MORE_STICKERS") && guild.premiumTier === 3)
        return 120;

    return PremiumTierStickerLimitMap[guild.premiumTier] ?? PremiumTierStickerLimitMap[0];
}

async function fetchSticker(id: string) {
    const cached = StickersStore.getStickerById(id);
    if (cached) return cached;

    const { body } = await RestAPI.get(Constants.Endpoints.STICKER(id));

    FluxDispatcher.dispatch({
        type: "STICKER_FETCH_SUCCESS",
        sticker: body
    });

    return body as GuildSticker;
}

async function fetchBlob(sticker: PartialSticker) {
    for (let size = 4096; size >= 16; size /= 2) {
        const url = formatStickerURL(sticker, size);
        const res = await fetch(url);

        if (!res.ok)
            throw new Error(`Failed to fetch ${url}: ${res.status}`);

        const contentLength = res.headers.get("Content-Length");
        if (Number(contentLength) > MAX_STICKER_SIZE_BYTES) {
            await res.body?.cancel();
            continue;
        }

        const blob = await res.blob();
        if (blob.size <= MAX_STICKER_SIZE_BYTES)
            return blob;
    }

    throw new Error(`Failed to fetch sticker within size limit of ${MAX_STICKER_SIZE_BYTES / 1024}KiB`);
}

async function doClone(guildId: string, sticker: PartialSticker) {
    try {
        const data = new FormData();
        data.append("name", sticker.name);
        if (sticker.tags) data.append("tags", sticker.tags);
        if (sticker.description) data.append("description", sticker.description);
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

        showToast({ text: `Successfully cloned ${sticker.name} to ${GuildStore.getGuild(guildId)?.name ?? "your server"}!`, variant: "success" });
    } catch (e: any) {
        let message = "Something went wrong (check console!)";
        try {
            message = JSON.parse(e.text).message;
        } catch { }

        logger.error(`Failed to clone ${sticker.name} to guild ${guildId}`, e);
        showToast({ text: `Failed to clone: ${message}`, variant: "critical" });
    }
}

function getGuildCandidates() {
    const meId = AuthenticationStore.getId();

    return GuildStore.getGuildsArray().filter(g => {
        const canCreate = g.ownerId === meId ||
            (PermissionStore.getGuildPermissions({ id: g.id }) & PermissionsBits.CREATE_GUILD_EXPRESSIONS) === PermissionsBits.CREATE_GUILD_EXPRESSIONS;
        if (!canCreate) return false;

        const stickerSlots = getGuildMaxStickerSlots(g);
        const stickers = StickersStore.getStickersByGuildId(g.id);

        return !stickers || stickers.length < stickerSlots;
    }).sort((a, b) => a.name.localeCompare(b.name));
}

export function CloneModal({ sticker }: { sticker: PartialSticker; }) {
    const [isCloning, setIsCloning] = useState(false);
    const [name, setName] = useState(sticker.name);

    const [guildCandidatesDep, refreshGuildCandidates] = useForceUpdater(true);
    const guilds = useMemo(() => getGuildCandidates(), [guildCandidatesDep]);

    return (
        <>
            <HeadingTertiary>Custom Name</HeadingTertiary>
            <CheckedTextInput
                initialValue={name}
                onChange={v => {
                    sticker.name = v;
                    setName(v);
                }}
                validate={v => (v.length >= 2 && v.length <= 30) || "Name must be between 2 and 30 characters and only contain alphanumeric characters"}
            />

            <Flex flexWrap="wrap" justifyContent="center" alignItems="center" className={Margins.top16}>
                {guilds.map(g => (
                    <Tooltip key={g.id} text={g.name}>
                        {tooltipProps =>
                            <Clickable
                                {...tooltipProps}
                                aria-disabled={isCloning}
                                className={cl("guild")}
                                data-is-cloning={isCloning}
                                onClick={() => {
                                    if (isCloning) return;

                                    setIsCloning(true);
                                    doClone(g.id, sticker).finally(() => {
                                        refreshGuildCandidates();
                                        setIsCloning(false);
                                    });
                                }}
                            >
                                {g.icon ? (
                                    <img
                                        aria-hidden
                                        className={cl("guild-icon")}
                                        src={IconUtils.getGuildIconURL({
                                            id: g.id,
                                            icon: g.icon,
                                            canAnimate: true,
                                            size: 512
                                        })}
                                        alt={g.name}
                                    />
                                ) : (
                                    <Span className={cl("guild-acronym")} style={{ fontSize: getFontSize(getGuildAcronym(g)) }}>
                                        {getGuildAcronym(g)}
                                    </Span>
                                )}
                            </Clickable>
                        }
                    </Tooltip>
                ))}
            </Flex>
        </>
    );
}

export function openCloneStickerModal(stickerData: PartialSticker) {
    openModalLazy(async () => {
        const sticker = await fetchSticker(stickerData.id)
            .catch(e => stickerData)
            .then(sticker => ({ ...sticker })); // Clone so we can safely mutate it

        return modalProps => {
            if (!sticker) {
                modalProps.onClose();
                return null;
            }

            return (
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
                            <Text tag="h3" size="md" weight="medium">Clone {sticker.name}</Text>
                        </Flex>
                    }
                >
                    <CloneModal sticker={sticker} />
                </Modal>
            );
        };
    });
}
