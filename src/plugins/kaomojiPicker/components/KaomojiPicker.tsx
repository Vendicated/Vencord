/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { ClockIcon, DeleteIcon, SearchIcon, StarFilled, StarOutlined } from "@components/Icons";
import { cl } from "@plugins/kaomojiPicker/cl";
import { getAllKaomoji, getCategories, Kaomoji } from "@plugins/kaomojiPicker/data/kaomoji";
import { addRecent, deleteUserKaomoji, isFavorite, isFolded, removeRecent, toggleFavorite, toggleFolded, useKaomojiStore } from "@plugins/kaomojiPicker/store";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { findComponentByCodeLazy } from "@webpack";
import { ContextMenuApi, ExpressionPickerStore, Menu, ScrollerThin, TextInput, useCallback, useMemo, useState } from "@webpack/common";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

import { settings } from "..";
import { GridItem } from "./GridItem";
import { openManageKaomojiModal } from "./ManageKaomojiModal";

interface Section {
    title: string;
    icon?: ReactNode;
    items: Kaomoji[];
}

interface SectionHeaderProps {
    children?: ReactNode;
    icon?: ReactNode;
    isCollapsed?: boolean;
    onClick?: () => void;
}

const SectionHeader = findComponentByCodeLazy<SectionHeaderProps>(
    "isCollapsed:",
    "trailing:"
);

interface ExpressionPickerInspectorProps {
    className?: string;
    graphicPrimary?: ReactNode;
    graphicSecondary?: ReactNode;
    titlePrimary?: ReactNode;
    titleSecondary?: ReactNode;
    isFavorite?: boolean;
}

const ExpressionPickerInspector = findComponentByCodeLazy<ExpressionPickerInspectorProps>(
    "graphicPrimary",
    'variant:"text-md/semibold"',
    'variant:"text-xs/normal"'
);

const SearchAccessory = (props: ComponentProps<typeof SearchIcon>) => <SearchIcon width={16} height={16} {...props} />;

export function KaomojiPicker() {
    const { favorites, recent, userKaomoji, version } = useKaomojiStore();

    const [search, setSearch] = useState("");
    const [hoveredItem, setHoveredItem] = useState<Kaomoji | null>(null);

    const query = search.trim().toLowerCase();

    const groupedSections = useMemo(() => {
        const lookup = (v: string): Kaomoji =>
            getAllKaomoji().find(e => e.value === v) ?? { id: v, value: v, tags: [] };

        const categories = getCategories();

        const _sections: Section[] = [];

        if (favorites.length)
            _sections.push({ title: "Favorites", icon: <StarFilled width={16} height={16} />, items: favorites.map(lookup) });

        if (settings.store.showRecent && recent.length)
            _sections.push({ title: "Recent", icon: <ClockIcon width={16} height={16} />, items: recent.map(lookup) });

        const grouped = new Map<string, Kaomoji[]>();
        for (const cat of categories) grouped.set(cat, []);

        for (const e of getAllKaomoji()) {
            for (const tag of e.tags) {
                const lowerTag = tag.toLowerCase();
                if (grouped.has(lowerTag)) {
                    grouped.get(lowerTag)!.push(e);
                    break;
                }
            }
        }

        for (const cat of categories) {
            const items = grouped.get(cat)!;
            if (items.length) _sections.push({ title: cat, items });
        }

        return _sections;
    }, [version, settings.store.showRecent]);

    const visible = useMemo<Section[]>(() => {
        if (!query) return groupedSections;

        return [{
            title: "Search Results",
            items: Array.from(
                new Map(
                    groupedSections
                        .flatMap(s => s.items)
                        .filter(e =>
                            e.id.toLowerCase().includes(query)
                            || e.value.toLowerCase().includes(query)
                            || e.tags.some(t => t.toLowerCase().includes(query))
                        )
                        .map(e => [e.id + e.value, e] as const)
                ).values()
            )
        }].filter(s => s.items.length > 0);
    }, [query, groupedSections]);

    const handleInsert = useCallback((item: Kaomoji) => {
        insertTextIntoChatInputBox(item.value + " ");
        addRecent(item.value);
        ExpressionPickerStore.closeExpressionPicker();
    }, []);

    const handleHover = useCallback((item: Kaomoji) => {
        setHoveredItem(item);
    }, []);

    const handleContextMenu = useCallback((event: MouseEvent, item: Kaomoji, sectionTitle: string) => {
        const fav = isFavorite(item.value);
        const isCustomItem = userKaomoji.some(e => e.value === item.value || e.id === item.id);

        ContextMenuApi.openContextMenu(event, () => (
            <Menu.Menu
                navId={cl("context")}
                onClose={ContextMenuApi.closeContextMenu}
                aria-label="Kaomoji Actions"
            >
                <Menu.MenuItem
                    id={cl("fav")}
                    label={fav ? "Unfavorite Kaomoji" : "Favorite Kaomoji"}
                    icon={fav ? StarOutlined : StarFilled}
                    leadingAccessory={{ type: "icon", icon: fav ? StarOutlined : StarFilled }}
                    action={() => { toggleFavorite(item.value); }}
                />
                {sectionTitle === "Recent" && (
                    <Menu.MenuItem
                        id={cl("remove-recent")}
                        label="Remove from Recent"
                        icon={DeleteIcon}
                        leadingAccessory={{ type: "icon", icon: DeleteIcon }}
                        action={() => { removeRecent(item.value); }}
                    />
                )}
                {isCustomItem && sectionTitle !== "Recent" && (
                    <Menu.MenuItem
                        id={cl("delete")}
                        color="danger"
                        label="Delete Kaomoji"
                        icon={DeleteIcon}
                        leadingAccessory={{ type: "icon", icon: DeleteIcon }}
                        action={() => deleteUserKaomoji(item.value)}
                    />
                )}
            </Menu.Menu>
        ));
    }, [userKaomoji]);

    const displayItem = hoveredItem ?? visible[0]?.items[0];

    return (
        <div className={cl("wrapper")}>
            <Flex alignItems="center" gap={12} className={cl("header")}>
                <div className={cl("search-bar")}>
                    <TextInput
                        placeholder={hoveredItem ? hoveredItem.id : "Find the cutest kaomoji"}
                        value={search}
                        onChange={setSearch}
                        autoFocus
                        {...{ leading: SearchAccessory }}
                    />
                </div>
                <Button
                    variant="secondary"
                    onClick={() => openManageKaomojiModal()}
                >
                    Manage
                </Button>
            </Flex>

            <div className={cl("body-wrap")}>
                <ScrollerThin
                    className={cl("body")}
                    orientation="auto"
                >
                    {visible.map(s => (
                        <div
                            key={s.title}
                            id={`kaomoji-section-${s.title.replace(/\s+/g, "-")}`}
                            className={cl("section")}
                        >
                            {!query && (
                                <SectionHeader
                                    icon={s.icon}
                                    isCollapsed={isFolded(s.title)}
                                    onClick={() => toggleFolded(s.title)}
                                >
                                    {s.title.charAt(0).toUpperCase() + s.title.slice(1)}
                                </SectionHeader>
                            )}
                            {(query || !isFolded(s.title)) && (
                                <ul className={cl("grid")} role="list">
                                    {s.items.map((item, idx) => (
                                        <li key={`${s.title}-${item.id}-${idx}`} role="listitem">
                                            <GridItem
                                                item={item}
                                                sectionTitle={s.title}
                                                onInsert={handleInsert}
                                                onHover={handleHover}
                                                onContextMenu={handleContextMenu}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}

                    {visible.length === 0 && (
                        <div className={cl("empty")}>No kaomoji match your search</div>
                    )}
                </ScrollerThin>
            </div>

            <ExpressionPickerInspector
                className={cl("inspector")}
                graphicPrimary={displayItem && (
                    <span className={cl("inspector-preview")}>{displayItem.value}</span>
                )}
                titlePrimary={displayItem?.id}
                titleSecondary={displayItem?.tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
                isFavorite={displayItem ? isFavorite(displayItem.value) : false}
            />
        </div>
    );
}
