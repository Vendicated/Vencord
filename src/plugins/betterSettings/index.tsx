/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { buildPluginMenuEntries, buildThemeMenuEntries } from "@plugins/vencordToolbox/menu";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { ComponentDispatch, FocusLock, Menu, useEffect, useRef } from "@webpack/common";
import type { HTMLAttributes, ReactElement } from "react";

import fullHeightStyle from "./fullHeightContext.css?managed";

type SettingsEntry = { section: string, label: string; };

const cl = classNameFactory("");
const Classes = findCssClassesLazy("animating", "baseLayer", "bg", "layer", "layers");

const settings = definePluginSettings({
    disableFade: {
        description: "Disable the crossfade animation",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    organizeMenu: {
        description: "Organizes the settings cog context menu into categories",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    eagerLoad: {
        description: "Removes the loading delay when opening the menu for the first time",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

interface TransformedSettingsEntry {
    section: string;
    items: SettingsEntry[];
}

interface LayerProps extends HTMLAttributes<HTMLDivElement> {
    mode: "SHOWN" | "HIDDEN";
    baseLayer?: boolean;
}

function Layer({ mode, baseLayer = false, ...props }: LayerProps) {
    const hidden = mode === "HIDDEN";
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => () => {
        ComponentDispatch.dispatch("LAYER_POP_START");
        ComponentDispatch.dispatch("LAYER_POP_COMPLETE");
    }, []);

    const node = (
        <div
            ref={containerRef}
            aria-hidden={hidden}
            className={cl({
                [Classes.layer]: true,
                [Classes.baseLayer]: baseLayer,
                "stop-animations": hidden
            })}
            style={{ opacity: hidden ? 0 : undefined }}
            {...props}
        />
    );

    return baseLayer
        ? node
        : <FocusLock containerRef={containerRef}>{node}</FocusLock>;
}

export default definePlugin({
    name: "BetterSettings",
    description: "Enhances your settings-menu-opening experience",
    authors: [Devs.Kyuuhachi],
    settings,

    start() {
        if (settings.store.organizeMenu)
            enableStyle(fullHeightStyle);
    },

    stop() {
        disableStyle(fullHeightStyle);
    },

    patches: [
        {
            find: "this.renderArtisanalHack()",
            replacement: [
                {
                    match: /class (\i)(?= extends \i\.PureComponent.+?static contextType=.+?jsx\)\(\1,\{mode:)/,
                    replace: "var $1=$self.Layer;class VencordPatchedOldFadeLayer",
                    predicate: () => settings.store.disableFade
                },
                { // Lazy-load contents
                    match: /createPromise:\(\)=>([^:}]*?),webpackId:"?\d+"?,name:(?!="CollectiblesShop")"[^"]+"/g,
                    replace: "$&,_:$1",
                    predicate: () => settings.store.eagerLoad
                }
            ]
        },
        { // For some reason standardSidebarView also has a small fade-in
            find: 'minimal:"contentColumnMinimal"',
            replacement: [
                {
                    match: /(?=\(0,\i\.\i\)\((\i),\{from:\{position:"absolute")/,
                    replace: "(_cb=>_cb(void 0,$1))||"
                },
                {
                    match: /\i\.animated\.div/,
                    replace: '"div"'
                }
            ],
            predicate: () => settings.store.disableFade
        },
        { // Load menu TOC eagerly
            find: "handleOpenSettingsContextMenu=",
            replacement: {
                match: /(?=handleOpenSettingsContextMenu=.{0,100}?null!=\i&&.{0,100}?(await [^};]*?\)\)))/,
                replace: "_vencordBetterSettingsEagerLoad=(async ()=>$1)();"
            },
            predicate: () => settings.store.eagerLoad
        },
        {
            // Settings cog context menu
            find: "#{intl::USER_SETTINGS_ACTIONS_MENU_LABEL}",
            replacement: [
                {
                    match: /=\[\];(\i)(?=\.forEach.{0,200}?"logout"===\i.{0,100}?(\i)\.get\(\i\))/,
                    replace: "=$self.wrapMap([]);$self.transformSettingsEntries($1,$2)",
                    predicate: () => settings.store.organizeMenu
                },
                {
                    match: /case \i\.\i\.DEVELOPER_OPTIONS:return \i;/,
                    replace: "$&case 'VencordPlugins':return $self.buildPluginMenuEntries(true);$&case 'VencordThemes':return $self.buildThemeMenuEntries();"
                }
            ]
        },
    ],

    buildPluginMenuEntries,
    buildThemeMenuEntries,

    // This is the very outer layer of the entire ui, so we can't wrap this in an ErrorBoundary
    // without possibly also catching unrelated errors of children.
    //
    // Thus, we sanity check webpack modules
    Layer(props: LayerProps) {
        try {
            [FocusLock.$$vencordGetWrappedComponent(), ComponentDispatch, Classes.layer].forEach(e => e.test);
        } catch {
            new Logger("BetterSettings").error("Failed to find some components");
            return props.children;
        }

        return <Layer {...props} />;
    },

    transformSettingsEntries(list: SettingsEntry[], keyMap: Map<string, string>) {
        const items = [] as TransformedSettingsEntry[];

        for (const item of list) {
            if (item.section === "HEADER") {
                keyMap.set(item.label, item.label);
                items.push({ section: item.label, items: [] });
            } else if (item.section !== "DIVIDER" && keyMap.has(item.section)) {
                items.at(-1)?.items.push(item);
            }
        }

        return items;
    },

    wrapMap(toWrap: TransformedSettingsEntry[]) {
        // @ts-expect-error
        toWrap.map = function (render: (item: SettingsEntry) => ReactElement<any>) {
            return this
                .filter(a => a.items.length > 0)
                .map(({ section, items }) => {
                    const children = items.map(render);
                    if (section) {
                        return (
                            <Menu.MenuItem
                                key={section}
                                id={section.replace(/\W/, "_")}
                                label={section}
                            >
                                {children}
                            </Menu.MenuItem>
                        );
                    } else {
                        return children;
                    }
                });
        };

        return toWrap;
    }
});
