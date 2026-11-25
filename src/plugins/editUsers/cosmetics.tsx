/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading } from "@components/Heading";
import { Button, Card, Paragraph, Span } from "@components/index";
import { classNameFactory } from "@utils/css";
import { findByCodeLazy } from "@webpack";
import { SelectedGuildStore, TextInput, useState } from "@webpack/common";

import { CosmeticOverride, getDecorationUrl, logger, UserOverride } from "./data";
import { CosmeticType, getShopProduct } from "./shop";

const cl = classNameFactory("vc-editUsers-");

const cosmeticTypes = [
    { key: "decoration", label: "Avatar Decoration", type: CosmeticType.AvatarDecoration },
    { key: "profileEffect", label: "Profile Effect", type: CosmeticType.ProfileEffect },
    { key: "nameplate", label: "Nameplate", type: CosmeticType.Nameplate },
    { key: "profileFrame", label: "Profile Frame", type: CosmeticType.ProfileFrame },
] as const;

type Cosmetic = typeof cosmeticTypes[number]["key"];
type Cosmetics = Pick<UserOverride, Cosmetic>;

interface EquippedCosmetic {
    sku_id?: string;
    asset?: string;
    label?: string;
    palette?: string;
    expires_at?: string | null;
}

interface ProfileCosmetics {
    collectibles?: (EquippedCosmetic & { type: CosmeticType; })[] | null;
    profile_effect?: ({ id?: string; } & EquippedCosmetic) | null;
}

interface ProfileUser {
    avatar_decoration_data?: EquippedCosmetic | null;
    collectibles?: { nameplate?: EquippedCosmetic | null; } | null;
}

interface ProfileResponse {
    user: ProfileUser;
    user_profile?: ProfileCosmetics | null;
    guild_member?: ProfileUser | null;
    guild_member_profile?: ProfileCosmetics | null;
}

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

function isEquipped(item?: EquippedCosmetic | null): item is EquippedCosmetic {
    return item != null && (!item.expires_at || Date.parse(item.expires_at) > Date.now());
}

function readProfileCosmetics(profile?: ProfileCosmetics | null, user?: ProfileUser | null): Partial<Cosmetics> {
    const overrides: Partial<Cosmetics> = {};
    for (const { key, type } of cosmeticTypes) {
        const item = profile?.collectibles?.find(item => item.type === type && isEquipped(item));
        const equipped = key === "decoration"
            ? user?.avatar_decoration_data
            : key === "nameplate" ? user?.collectibles?.nameplate : undefined;
        const metadata = isEquipped(equipped) ? equipped : undefined;
        const legacyEffect = key === "profileEffect" && isEquipped(profile?.profile_effect)
            ? profile.profile_effect
            : undefined;

        const skuId = item?.sku_id ?? metadata?.sku_id ?? legacyEffect?.sku_id ?? legacyEffect?.id;
        if (skuId) {
            const details = metadata?.sku_id === skuId ? metadata : item;
            overrides[key] = {
                skuId,
                asset: details?.asset,
                label: details?.label,
                palette: details?.palette
            };
        } else if (key === "decoration" && metadata?.asset) {
            overrides.decoration = metadata.asset;
        }
    }
    return overrides;
}

async function getProfileCosmetics(userId: string) {
    const guildId = SelectedGuildStore.getGuildId();
    let cosmetics: Partial<Cosmetics> = {};
    const receive = (response: ProfileResponse) => {
        // Discord normalizes the response in place after this callback.
        cosmetics = {
            ...readProfileCosmetics(response.user_profile, response.user),
            ...readProfileCosmetics(response.guild_member_profile, response.guild_member)
        };
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

    const { nameplate } = cosmetics;
    if (typeof nameplate === "object" && !nameplate.asset) {
        delete cosmetics.nameplate;
        try {
            const product = await getShopProduct(nameplate.skuId);
            const item = product?.items.find(item =>
                item.type === CosmeticType.Nameplate && item.skuId === nameplate.skuId
            );
            if (item?.asset) {
                cosmetics.nameplate = {
                    skuId: item.skuId,
                    name: product?.name,
                    asset: item.asset,
                    label: item.label,
                    palette: item.palette
                };
            }
        } catch (error) {
            logger.error("Could not load nameplate from the shop", error);
        }
    }

    return cosmetics;
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
                <Span size="sm" weight="medium">{title}</Span>
                <Paragraph size="sm" className={cl("description")}>{name || sku || "Discord default"}</Paragraph>
                {name && <Paragraph size="xs" className={cl("description")}>SKU {sku}</Paragraph>}
            </div>
            {value && <Button variant="secondary" disabled={busy} onClick={onReset}>Reset</Button>}
        </div>
    );
}

export function CosmeticsEditor({ cosmetics, onSelect, onError, onOpenShop, busy, onBusy }: {
    cosmetics: Cosmetics;
    onSelect(kind: Cosmetic, value: UserOverride[Cosmetic]): void;
    onError(message: string): void;
    onOpenShop(): void;
    busy: boolean;
    onBusy(value: boolean): void;
}) {
    const [link, setLink] = useState("");
    const [userId, setUserId] = useState("");
    const src = getDecorationUrl(cosmetics.decoration, 64, true);

    async function addShopItem() {
        onError("");
        const sku = getShopSku(link.trim());
        if (!sku) {
            onError("Paste a Discord Shop share link or enter a SKU ID.");
            return;
        }

        onBusy(true);
        try {
            const product = await getShopProduct(sku);
            if (!product) {
                onError("Could not load that shop item.");
                return;
            }

            const items = product.items.filter(item => item.skuId === sku);
            const source = items.length ? items : product.items;
            let applied = false;
            for (const { key, type } of cosmeticTypes) {
                const item = source.find(item => item.type === type);
                if (!item) {
                    continue;
                }

                onSelect(key, {
                    skuId: item.skuId,
                    name: product.name,
                    asset: item.asset,
                    label: item.label,
                    palette: item.palette
                });
                applied = true;
            }

            if (!applied) {
                onError("That shop item has no supported cosmetics.");
                return;
            }
            setLink("");
        } catch (error) {
            logger.error("Could not load shop item", error);
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
            if (!Object.keys(cosmetics).length) {
                onError("That user has no equipped cosmetics to copy.");
                return;
            }

            for (const { key } of cosmeticTypes) {
                const value = cosmetics[key];
                if (value) {
                    onSelect(key, value);
                }
            }
            setUserId("");
        } catch (error) {
            logger.error("Could not copy profile cosmetics", error);
            onError("Could not load that user's profile.");
        } finally {
            onBusy(false);
        }
    }

    return (
        <>
            <section className={cl("section")}>
                <Heading>Cosmetic Overrides</Heading>
                <Card className={cl("cosmeticList")} defaultPadding={false}>
                    {cosmeticTypes.map(({ key, label }) => (
                        <OverrideRow
                            key={key}
                            title={label}
                            value={cosmetics[key]}
                            src={key === "decoration" ? src : undefined}
                            busy={busy}
                            onReset={() => onSelect(key, "")}
                        />
                    ))}
                </Card>
            </section>

            <section className={cl("section")}>
                <Heading>Add From the Shop</Heading>
                <Paragraph size="sm" className={cl("description")}>
                    Use Share on a shop item to copy its link, or enter its SKU ID.
                </Paragraph>
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
                    onClick={onOpenShop}
                >
                    Save and Open Shop
                </Button>
            </section>

            <section className={cl("section")}>
                <Heading>Copy From a User</Heading>
                <Paragraph size="sm" className={cl("description")}>
                    Copy someone's cosmetics. Will prefer decorations from the currently selected server's profile if available.
                </Paragraph>
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
