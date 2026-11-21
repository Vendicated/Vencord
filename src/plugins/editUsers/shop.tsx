/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Flex, Link, Paragraph, Span } from "@components/index";
import { FluxStore } from "@vencord/discord-types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { SearchableSelect, TextInput, useEffect, useMemo, useState, useStateFromStores } from "@webpack/common";

type Cosmetic = "decoration" | "profileEffect";

interface ShopItem {
    type: number;
    skuId: string;
    asset?: string;
}

interface ShopProduct {
    name: string;
    skuId: string;
    items: ShopItem[];
}

const ShopStore = findStoreLazy("CollectiblesCategoryStore") as FluxStore & {
    isFetchingCategories: boolean;
    lastSuccessfulFetch?: number;
    products: Map<string, ShopProduct>;
    getProduct(skuId: string): ShopProduct | undefined;
};

const fetchShop = findByCodeLazy('"COLLECTIBLES_CATEGORIES_FETCH"', '"COLLECTIBLES_CATEGORIES_FETCH_SUCCESS"') as () => Promise<void>;
const fetchProduct = findByCodeLazy('"COLLECTIBLES_PRODUCT_FETCH_SUCCESS"', "include_bundles") as (skuId: string) => Promise<void>;

function getCosmeticValue(item: ShopItem, kind: Cosmetic) {
    if (kind === "decoration" && item.type === 0) {
        return item.asset;
    }
    if (kind === "profileEffect" && item.type === 1) {
        return item.skuId;
    }
}

function getShopOptions(products: Map<string, ShopProduct>, kind: Cosmetic, value: string) {
    const items = new Map<string, string>();
    for (const product of products.values()) {
        for (const item of product.items) {
            const cosmetic = getCosmeticValue(item, kind);
            if (cosmetic && (!items.has(cosmetic) || item.skuId === product.skuId)) {
                items.set(cosmetic, product.name);
            }
        }
    }

    const options = [...items].map(([value, label]) => ({ label, value }));
    options.sort((a, b) => a.label.localeCompare(b.label));
    if (value && !items.has(value)) {
        options.unshift({ label: "Current override", value });
    }
    options.unshift({ label: "Use Discord appearance", value: "" });
    return options;
}

function getShopSku(link: string) {
    try {
        const url = new URL(link);
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

export function ShopPicker({ decoration, profileEffect, onSelect, onError, busy, onBusy }: {
    decoration: string;
    profileEffect: string;
    onSelect(kind: Cosmetic, value: string): void;
    onError(message: string): void;
    busy: boolean;
    onBusy(value: boolean): void;
}) {
    const products = useStateFromStores([ShopStore], () => ShopStore.products);
    const loading = useStateFromStores([ShopStore], () => ShopStore.isFetchingCategories);
    const [link, setLink] = useState("");
    const decorationOptions = useMemo(() => getShopOptions(products, "decoration", decoration), [products, decoration]);
    const effectOptions = useMemo(() => getShopOptions(products, "profileEffect", profileEffect), [products, profileEffect]);

    useEffect(() => {
        if (!ShopStore.lastSuccessfulFetch && !ShopStore.isFetchingCategories) {
            void fetchShop().catch(() => onError("Could not load the shop picker. You can still paste a shop link."));
        }
    }, []);

    async function useShopLink() {
        onError("");
        const sku = getShopSku(link.trim());
        if (!sku) {
            onError("Paste a Discord Shop item link from the item's Share button.");
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

            const decoration = product.items.map(item => getCosmeticValue(item, "decoration")).find(Boolean);
            const profileEffect = product.items.map(item => getCosmeticValue(item, "profileEffect")).find(Boolean);
            if (!decoration && !profileEffect) {
                onError("That shop item has no avatar decoration or profile effect.");
                return;
            }
            if (decoration) {
                onSelect("decoration", decoration);
            }
            if (profileEffect) {
                onSelect("profileEffect", profileEffect);
            }
            setLink("");
        } catch {
            onError("Could not load that shop item.");
        } finally {
            onBusy(false);
        }
    }

    return (
        <>
            <div>
                <Span>Avatar Decoration</Span>
                <SearchableSelect
                    options={decorationOptions}
                    isDisabled={busy}
                    value={decoration}
                    placeholder={loading ? "Loading the shop…" : "Search avatar decorations"}
                    onChange={value => onSelect("decoration", value ?? "")}
                    closeOnSelect
                />
            </div>
            <div>
                <Span>Profile Effect</Span>
                <SearchableSelect
                    options={effectOptions}
                    isDisabled={busy}
                    value={profileEffect}
                    placeholder={loading ? "Loading the shop…" : "Search profile effects"}
                    onChange={value => onSelect("profileEffect", value ?? "")}
                    closeOnSelect
                />
            </div>
            <div>
                <Paragraph>For other items, copy the link using Share in the <Link href="https://discord.com/shop">Discord Shop</Link>.</Paragraph>
                <Flex alignItems="center">
                    <TextInput
                        aria-label="Shop item link"
                        placeholder="Paste a shop item link"
                        value={link}
                        onChange={setLink}
                        disabled={busy}
                    />
                    <Button variant="secondary" disabled={busy || !link.trim()} onClick={useShopLink}>Use Link</Button>
                </Flex>
            </div>
        </>
    );
}
