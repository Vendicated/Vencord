/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ComponentDispatch, FocusLock, i18n, Menu, useEffect, useRef } from "@webpack/common";
import type { HTMLAttributes, ReactElement } from "react";

type SettingsEntry = { section: string, label: string };

const cl = classNameFactory("");
const Classes = findByPropsLazy("animating", "baseLayer", "bg", "layer", "layers");

const settings = definePluginSettings({
    disableFade: {
        description: "Disable the crossfade animation",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
    organizeMenu: {
        description: "Organizes the settings cog context menu",
        type: OptionType.BOOLEAN,
        default: true,
    },
    eagerLoad: {
        description: "Eagerly load menu contents",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "BetterSettings",
    description: "Enhances your settings-menu-opening experience",
    authors: [Devs.Kyuuhachi],
    settings,

    patches: [
        {
            find: "this.renderArtisanalHack()",
            replacement: [
                { // Fade in on layer
                    match: /(?<=(\i)\.contextType=\i\.AccessibilityPreferencesContext;)/,
                    replace: "$1=$self.Layer;",
                    predicate: () => settings.store.disableFade,
                },
                { // Lazy-load contents
                    match: /createPromise:\(\)=>([^:}]*?),webpackId:"\d+",name:(?!="CollectiblesShop")"[^"]+"/g,
                    replace: "$&,_:$1",
                    predicate: () => settings.store.eagerLoad,
                },
            ],
        },
        { // For some reason standardSidebarView also has a small fade-in
            find: "DefaultCustomContentScroller:function()",
            replacement: {
                match: /(?<=Fragment,\{children:)\i\(\((\i),\i\)=>(\(0,\i\.jsxs\))\(\i\.animated\.div,\{style:\1,/,
                replace: "($2(\"div\",{"
            },
            predicate: () => settings.store.disableFade,
        },
        { // load menu stuff on hover, not on click
            find: "Messages.USER_SETTINGS_WITH_BUILD_OVERRIDE.format",
            replacement: {
                match: /(?<=handleOpenSettingsContextMenu.{0,250}?\i\.el\(("\d+")\)\.then.*?Messages\.USER_SETTINGS,)(?=onClick:)/,
                replace: "onMouseEnter(){let r=Vencord.Webpack.wreq;r.el($1).then(r.bind(r,$1));},"
            },
            predicate: () => settings.store.eagerLoad,
        },
        {
            find: "Messages.USER_SETTINGS_ACTIONS_MENU_LABEL",
            replacement: {
                match: /\(0,\i.default\)\(\)(?=\.filter)/,
                replace: "$self.wrapMenu($&)"
            }
        }
    ],

    Layer({ mode, baseLayer = false, ...props }: {
        mode: "SHOWN" | "HIDDEN";
        baseLayer?: boolean;
    } & HTMLAttributes<HTMLDivElement>) {
        const hidden = mode === "HIDDEN";
        const containerRef = useRef<HTMLDivElement>(null);
        useEffect(() => () => {
            ComponentDispatch.dispatch("LAYER_POP_START");
            ComponentDispatch.dispatch("LAYER_POP_COMPLETE");
        }, []);
        const node = <div
            ref={containerRef}
            aria-hidden={hidden}
            className={cl({
                [Classes.layer]: true,
                [Classes.baseLayer]: baseLayer,
                "stop-animations": hidden,
            })}
            style={{ opacity: hidden ? 0 : undefined }}
            {...props}
        />;
        if(baseLayer) return node;
        else return <FocusLock containerRef={containerRef}>{node}</FocusLock>;
    },

    wrapMenu(list: SettingsEntry[]) {
        if(!settings.store.organizeMenu) return list;

        const items = [{ label: null as string|null, items: [] as SettingsEntry[] }];
        for(const item of list) {
            if(item.section === "HEADER") {
                items.push({ label: item.label, items: [] });
            } else if(item.section === "DIVIDER") {
                items.push({ label: i18n.Messages.OTHER_OPTIONS, items: [] });
            } else {
                items.at(-1)!.items.push(item);
            }
        }
        return {
            filter(predicate: (item: SettingsEntry) => boolean) {
                for(const category of items) {
                    category.items = category.items.filter(predicate);
                }
                return this;
            },
            map(render: (item: SettingsEntry) => ReactElement) {
                return items
                    .filter(a => a.items.length > 0)
                    .map(({ label, items }) => {
                        const children = items.map(render);
                        if(label) {
                            return <Menu.MenuItem
                                id={label.replace(/\W/, "_")}
                                label={label}
                                children={children}
                            />;
                        } else {
                            return children;
                        }
                    });
            },
        };
    }
});
