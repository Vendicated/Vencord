/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getIntlMessage } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Clickable, ContextMenuApi, FluxDispatcher, Forms, Menu, Text, TooltipContainer, useState } from "@webpack/common";
import type { ComponentPropsWithRef, PropsWithChildren } from "react";

import { _cssColors, cssColors } from "./utils";


function searchMatch(search: string, name: string): boolean {
    if (search === "") return true;
    const words = name.toLowerCase().split("_");
    const searchKeywords = search.toLowerCase().split(" ").filter(keyword => keyword !== "");
    return searchKeywords.every(keyword => words.includes(keyword)) || words.every(keyword => searchKeywords.includes(keyword)) || name.toLowerCase().includes(search.toLowerCase());
}

export type ClickableProps<T extends "a" | "div" | "span" | "li" = "div"> = PropsWithChildren<ComponentPropsWithRef<T>> & {
    tag?: T;
};

export function IconTooltip({ children, copy, className, ...props }: ClickableProps & { children: string; copy: string; }) {
    return <TooltipContainer text={"Click to copy"} className={className}>
        <Clickable onClick={() => {
            // @ts-ignore
            Clipboard.copy(copy);
        }} {...props}>{children}</Clickable>
    </TooltipContainer>;
}

export const ModalHeaderTitle = ({ iconName, color, name }: { iconName: string; color: number; name: string; }) => {
    return <Text variant="heading-lg/semibold"
        style={{ flexGrow: 1, display: "flex" }}
        className={classes("vc-ic-modal-header-title", `vc-ic-${name}-modal-header-title`)}>
        <IconTooltip copy={iconName} className={classes(Margins.right8, "vc-icon-modal-color-tooltip")}>
            {iconName}
        </IconTooltip>
        {" - "}
        <IconTooltip copy={cssColors[color]?.css} className={classes(Margins.left8, "vc-icon-modal-color-tooltip")}
            onContextMenu={e => {
                ContextMenuApi.openContextMenu(e, () => {
                    const [query, setQuery] = useState("");
                    return (<Menu.Menu
                        navId="vc-ic-colors-header-menu"
                        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                        color="danger"
                        aria-label="Icon Viewer Colors"
                    >

                        <Menu.MenuControlItem
                            id="vc-ic-colors-search"
                            control={(props, ref) => (
                                <Menu.MenuSearchControl
                                    {...props}
                                    query={query}
                                    onChange={setQuery}
                                    ref={ref}
                                    placeholder={getIntlMessage("SEARCH")}
                                    autoFocus
                                />
                            )}
                        />

                        {!!_cssColors.length && <Menu.MenuSeparator />}

                        {_cssColors.map(p => (
                            searchMatch(query, p) && <Menu.MenuItem
                                key={p}
                                id={p}
                                label={p}
                                action={() => {
                                    // @ts-ignore
                                    FluxDispatcher.dispatch({ type: "ICONVIEWER_COLOR_CHANGE", color: p });
                                }}
                            />
                        ))}

                    </Menu.Menu>);
                });
            }}>
            {cssColors[color]?.name}
        </IconTooltip>
    </Text >;
};

export function SettingsAbout() {
    return <>
        <Forms.FormTitle tag="h3">Features</Forms.FormTitle>
        <Forms.FormText>
            <Text variant="heading-sm/normal">
                <ul className="vc-ic-unordered-list">
                    <li>Preview icons</li>
                    <li>Copy icon names and CSS variables</li>
                    <li>Ability to download icons in different formats (SVG, PNG, GIF, etc.)</li>
                    <li>Copy pre-made icon finds for your plugins (Only some icons have this, submit finds either in a server or DMs)</li>
                    <li>Find icons by function context (helpful when creating finds)</li>
                    <li>Search for colors by right-clicking the color name in the modal title</li>
                </ul>
            </Text>
        </Forms.FormText>
        <Forms.FormTitle tag="h3">Special thanks</Forms.FormTitle>
        <Forms.FormText>
            <Text variant="heading-sm/normal" className="vc-ic-unordered-list">
                <ul>
                    <li>krystalskullofficial._.</li>
                    <li>davr1</li>
                    <li>suffocate</li>
                </ul>
            </Text>
        </Forms.FormText>
    </>;
}

