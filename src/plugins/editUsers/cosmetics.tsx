/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading } from "@components/Heading";
import { Button, Paragraph, Span } from "@components/index";
import { classNameFactory } from "@utils/css";
import { FluxStore } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { IconUtils, NavigationRouter, SelectedGuildStore, TextInput, useState } from "@webpack/common";

import { CosmeticOverride, getDecorationData, UserOverride } from "./data";

const cl = classNameFactory("vc-editUsers-");

const enum CosmeticType {
    AvatarDecoration = 0,
    ProfileEffect = 1,
}

type Cosmetic = "decoration" | "profileEffect";
type Cosmetics = Pick<UserOverride, Cosmetic>;

interface ShopItem {
    type: CosmeticType;
    skuId: string;
    asset?: string;
}

interface ShopProduct {
    name: string;
    items: ShopItem[];
}

interface ProfileCosmetics {
    collectibles?: { type: CosmeticType; sku_id: string; expires_at?: string | null; }[];
}

interface ProfileUser {
    avatar_decoration_data?: { sku_id?: string; asset?: string; } | null;
}

interface ProfileResponse {
    user: ProfileUser;
    user_profile?: ProfileCosmetics | null;
    guild_member?: ProfileUser | null;
    guild_member_profile?: ProfileCosmetics | null;
}

const ShopStore = findStoreLazy("CollectiblesCategoryStore") as FluxStore & {
    getProduct(skuId: string): ShopProduct | undefined;
};

const fetchProduct = findByCodeLazy('"COLLECTIBLES_PRODUCT_FETCH_SUCCESS"', "include_bundles") as (skuId: string) => Promise<void>;
const fetchProfile = findByCodeLazy('"USER_PROFILE_FETCH_SUCCESS"', '"USER_PROFILE_FETCH_START"', "join_request_id") as (
    userId: string,
    options: { guildId?: string; },
    onResponse: (profile: ProfileResponse) => void,
) => Promise<void>;

const snowflake = /^\d{17,20}$/;

function getShopSku(input: string) {
    if (snowflake.test(input)) {
        return input;
    }

    try {
        const url = new URL(input);
        const isDiscordShop = url.protocol === "https:"
            && /^(?:(?:canary|ptb|www)\.)?discord\.com$/.test(url.hostname)
            && url.pathname === "/shop";
        if (isDiscordShop) {
            return /^#itemSkuId=(\d{17,20})$/.exec(url.hash)?.[1];
        }
    } catch {
        return;
    }
}

function getProfileSku(profile: ProfileCosmetics | null | undefined, type: CosmeticType) {
    return profile?.collectibles?.find(item =>
        item.type === type && (!item.expires_at || Date.parse(item.expires_at) > Date.now())
    )?.sku_id;
}

function readProfileCosmetics(profile: ProfileResponse): Partial<Cosmetics> {
    const { guild_member_profile: guild, user_profile: global, guild_member: member, user } = profile;
    const guildDecoration = member?.avatar_decoration_data;
    const globalDecoration = user.avatar_decoration_data;
    const guildDecorationSku = getProfileSku(guild, CosmeticType.AvatarDecoration) || guildDecoration?.sku_id;
    const globalDecorationSku = getProfileSku(global, CosmeticType.AvatarDecoration) || globalDecoration?.sku_id;
    const effectSku = getProfileSku(guild, CosmeticType.ProfileEffect) || getProfileSku(global, CosmeticType.ProfileEffect);

    const overrides: Partial<Cosmetics> = {};
    if (guildDecorationSku) {
        overrides.decoration = {
            skuId: guildDecorationSku,
            asset: guildDecoration?.sku_id === guildDecorationSku ? guildDecoration.asset : undefined
        };
    } else if (guildDecoration?.asset) {
        overrides.decoration = guildDecoration.asset;
    } else if (globalDecorationSku) {
        overrides.decoration = {
            skuId: globalDecorationSku,
            asset: globalDecoration?.sku_id === globalDecorationSku ? globalDecoration.asset : undefined
        };
    } else if (globalDecoration?.asset) {
        overrides.decoration = globalDecoration.asset;
    }

    if (effectSku) {
        overrides.profileEffect = { skuId: effectSku };
    }
    return overrides;
}

async function getProfileCosmetics(userId: string) {
    const guildId = SelectedGuildStore.getGuildId();
    let profile: ProfileResponse | undefined;
    const receive = (response: ProfileResponse) => {
        profile = response;
    };
    try {
        await fetchProfile(userId, { guildId: guildId ?? undefined }, receive);
    } catch (error) {
        const { status } = error as { status?: number; };
        if (!guildId || (status !== 403 && status !== 404)) {
            throw error;
        }
        await fetchProfile(userId, {}, receive);
    }

    return profile && readProfileCosmetics(profile);
}

function OverrideRow({ title, value, src, onReset, busy }: {
    title: string;
    value: CosmeticOverride | string;
    src?: string;
    onReset(): void;
    busy: boolean;
}) {
    const sku = typeof value === "object" ? value.skuId : value;
    const name = typeof value === "object" ? value.name : undefined;

    return (
        <div className={cl("cosmeticRow")}>
            {src && <img src={src} className={cl("decorationPreview")} alt="" />}
            <div className={cl("cosmeticLabel")}>
                <Span weight="semibold">{title}</Span>
                <Paragraph size="sm">{name || sku || "Discord default"}</Paragraph>
                {name && <Paragraph size="sm">SKU {sku}</Paragraph>}
            </div>
            {value && <Button variant="secondary" disabled={busy} onClick={onReset}>Reset</Button>}
        </div>
    );
}

export function CosmeticsEditor({ decoration, profileEffect, onSelect, onError, onOpenShop, busy, onBusy }: Cosmetics & {
    onSelect(kind: Cosmetic, value: UserOverride[Cosmetic]): void;
    onError(message: string): void;
    onOpenShop(): void;
    busy: boolean;
    onBusy(value: boolean): void;
}) {
    const [link, setLink] = useState("");
    const [userId, setUserId] = useState("");
    const avatarDecoration = getDecorationData(decoration);
    const src = avatarDecoration && IconUtils.getAvatarDecorationURL({ avatarDecoration, size: 64, canAnimate: true });

    async function addShopItem() {
        onError("");
        const sku = getShopSku(link.trim());
        if (!sku) {
            onError("Paste a Discord Shop share link or enter a SKU ID.");
            return;
        }

        onBusy(true);
        try {
            if (!ShopStore.getProduct(sku)) {
                await fetchProduct(sku);
            }
            const product = ShopStore.getProduct(sku);
            if (!product) {
                onError("Could not load that shop item.");
                return;
            }

            const items = product.items.filter(item => item.skuId === sku);
            const source = items.length ? items : product.items;
            const decoration = source.find(item => item.type === CosmeticType.AvatarDecoration);
            const profileEffect = source.find(item => item.type === CosmeticType.ProfileEffect);
            if (!decoration && !profileEffect) {
                onError("That shop item has no avatar decoration or profile effect.");
                return;
            }
            if (decoration) {
                onSelect("decoration", {
                    skuId: decoration.skuId,
                    name: product.name,
                    asset: decoration.asset
                });
            }
            if (profileEffect) {
                onSelect("profileEffect", { skuId: profileEffect.skuId, name: product.name });
            }
            setLink("");
        } catch {
            onError("Could not load that shop item.");
        } finally {
            onBusy(false);
        }
    }

    async function copyProfile() {
        onError("");
        const id = userId.trim();
        if (!snowflake.test(id)) {
            onError("Enter a Discord user ID.");
            return;
        }

        onBusy(true);
        try {
            const cosmetics = await getProfileCosmetics(id);
            if (!cosmetics?.decoration && !cosmetics?.profileEffect) {
                onError("That user has no avatar decoration or profile effect to copy.");
                return;
            }
            if (cosmetics.decoration) {
                onSelect("decoration", cosmetics.decoration);
            }
            if (cosmetics.profileEffect) {
                onSelect("profileEffect", cosmetics.profileEffect);
            }
            setUserId("");
        } catch {
            onError("Could not load that user's profile.");
        } finally {
            onBusy(false);
        }
    }

    return (
        <>
            <section className={cl("field")}>
                <Heading tag="h3">Cosmetic Overrides</Heading>
                <OverrideRow
                    title="Avatar Decoration"
                    value={decoration}
                    src={src}
                    busy={busy}
                    onReset={() => onSelect("decoration", "")}
                />
                <OverrideRow
                    title="Profile Effect"
                    value={profileEffect}
                    busy={busy}
                    onReset={() => onSelect("profileEffect", "")}
                />
            </section>

            <section className={cl("field")}>
                <Heading tag="h3">Add From the Shop</Heading>
                <Paragraph size="sm">Use Share on a shop item to copy its link, or enter its SKU ID.</Paragraph>
                <div className={cl("inputRow")}>
                    <TextInput
                        aria-label="Shop link or SKU ID"
                        placeholder="Shop link or SKU ID"
                        value={link}
                        onChange={setLink}
                        disabled={busy}
                    />
                    <Button variant="secondary" disabled={busy || !link.trim()} onClick={addShopItem}>Apply Item</Button>
                </div>
                <Button
                    className={cl("shopButton")}
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                        onOpenShop();
                        NavigationRouter.transitionTo("/shop");
                    }}
                >
                    Open Shop
                </Button>
            </section>

            <section className={cl("field")}>
                <Heading tag="h3">Copy From a User</Heading>
                <Paragraph size="sm">Use the equipped cosmetics from their server profile when available.</Paragraph>
                <div className={cl("inputRow")}>
                    <TextInput
                        aria-label="User ID"
                        placeholder="User ID"
                        value={userId}
                        onChange={setUserId}
                        disabled={busy}
                    />
                    <Button variant="secondary" disabled={busy || !userId.trim()} onClick={copyProfile}>Copy Cosmetics</Button>
                </div>
            </section>
        </>
    );
}
