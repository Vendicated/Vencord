/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { SettingsTab, wrapTab } from "@components/settings";
import { TooltipContainer } from "@components/TooltipContainer";
import { debounce } from "@shared/debounce";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useIntersection } from "@utils/react";
import { Icon } from "@vencord/discord-types";
import { Clickable, TextInput, useCallback, useEffect, useMemo, useState } from "@webpack/common";

import { getNameByIcon, IconsFinds } from "../names";
import { IconsDef } from "../types";
import { findAllIcons } from "../utils";
import { openIconModal } from "./Modals";

let cachedIcons: IconsDef | null = null;

function getIcons(): IconsDef {
    if (cachedIcons) return cachedIcons;

    const allIcons = Array.from(new Set(findAllIcons()));
    cachedIcons = Object.fromEntries(
        allIcons.map((icon, idx) => [getNameByIcon(icon, String(idx)), icon])
    );
    return cachedIcons;
}

function searchMatch(search: string, name: string, Icon: Icon, searchByFunction: boolean): boolean {
    if (!search) return true;

    if (searchByFunction) return String(Icon).includes(search);

    const words = name.replace(/([A-Z]([a-z]+)?)/g, " $1").toLowerCase().split(" ");
    const keywords = search.toLowerCase().split(" ");
    return keywords.every(k => words.includes(k)) ||
        words.every(w => keywords.includes(w)) ||
        name.toLowerCase().includes(search.toLowerCase());
}

function IconItem({ iconName, Icon }: { iconName: string; Icon: Icon; }) {
    const fill = iconName === "CircleShield" ? "var(--background-base-low)" : "var(--interactive-icon-default)";

    return (
        <div className="vc-icon-box">
            <Clickable onClick={() => openIconModal(iconName, Icon, IconsFinds[iconName])}>
                <div className="vc-icon-container">
                    <Icon className="vc-icon-icon" size="lg" width={32} height={32} color="var(--interactive-icon-default)" fill={fill} />
                </div>
            </Clickable>
            <Heading className="vc-icon-title" tag="h3">{iconName}</Heading>
        </div>
    );
}

function IconsTab() {
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [searchByFunction, setSearchByFunction] = useState(false);

    const icons = useMemo(() => getIcons(), []);

    const debouncedSetSearch = useMemo(
        () => debounce((query: string) => setSearch(query), 150),
        []
    );

    const onSearch = useCallback((query: string) => {
        setSearchInput(query);
        debouncedSetSearch(query);
    }, [debouncedSetSearch]);

    const filteredIcons = useMemo(() =>
        Object.entries(icons).filter(([name, Icon]) => searchMatch(search, name, Icon, searchByFunction)),
        [icons, search, searchByFunction]
    );

    const iconsToLoad = 120;
    const [visibleCount, setVisibleCount] = useState(iconsToLoad);

    useEffect(() => {
        setVisibleCount(iconsToLoad);
    }, [search, searchByFunction]);

    const loadMore = useCallback(() => {
        setVisibleCount(v => Math.min(v + iconsToLoad, filteredIcons.length));
    }, [filteredIcons.length]);

    const [sentinelRef, isSentinelVisible] = useIntersection();

    useEffect(() => {
        if (isSentinelVisible && visibleCount < filteredIcons.length) {
            loadMore();
        }
    }, [isSentinelVisible, visibleCount, filteredIcons.length, loadMore]);

    const visibleIcons = filteredIcons.slice(0, visibleCount);

    return (
        <SettingsTab>
            <div className={classes(Margins.top16, "vc-icon-tab-search-bar-grid")}>
                <TextInput autoFocus value={searchInput} placeholder="Search for an icon..." onChange={onSearch} />
                <TooltipContainer text="Search by function context">
                    <Button
                        size="small"
                        aria-label="Search by function context"
                        className="vc-icon-search-func-btn"
                        variant={searchByFunction ? "positive" : "primary"}
                        onClick={() => setSearchByFunction(!searchByFunction)}
                    >
                        Func
                    </Button>
                </TooltipContainer>
            </div>
            <div className="vc-icons-tab-grid-container">
                {visibleIcons.map(([iconName, Icon]) => (
                    <IconItem key={iconName} iconName={iconName} Icon={Icon} />
                ))}
            </div>
            {visibleCount < filteredIcons.length && (
                <div ref={sentinelRef} className="vc-icon-sentinel" />
            )}
        </SettingsTab>
    );
}

export default wrapTab(IconsTab, "IconsTab");
