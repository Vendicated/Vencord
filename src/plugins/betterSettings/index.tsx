/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { ComponentDispatch, FocusLock, Menu, useEffect, useRef } from "@webpack/common";
import type { HTMLAttributes, ReactElement } from "react";

import PluginsSubmenu from "./PluginsSubmenu";

type SettingsEntry = { section: string, label: string; };

const cl = classNameFactory("");
let Classes: Record<string, string>;
waitFor(["animating", "baseLayer", "bg", "layer", "layers"], m => Classes = m);

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
        default: true
    },
    eagerLoad: {
        description: "Removes the loading delay when opening the menu for the first time",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

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

    patches: [
        {
            find: "this.renderArtisanalHack()",
            replacement: [
                { // Fade in on layer
                    match: /(?<=\((\i),"contextType",\i\.\i\);)/,
                    replace: "$1=$self.Layer;",
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
            find: "#{intl::USER_SETTINGS_WITH_BUILD_OVERRIDE}",
            replacement: {
                match: /(\i)\(this,"handleOpenSettingsContextMenu",.{0,100}?null!=\i&&.{0,100}?(await [^};]*?\)\)).*?,(?=\1\(this)/,
                replace: "$&(async ()=>$2)(),"
            },
            predicate: () => settings.store.eagerLoad
        },
        { // Settings cog context menu
            find: "#{intl::USER_SETTINGS_ACTIONS_MENU_LABEL}",
            replacement: [
                {
                    match: /(EXPERIMENTS:.+?)(\(0,\i.\i\)\(\))(?=\.filter\(\i=>\{let\{section:\i\}=)/,
                    replace: "$1$self.wrapMenu($2)"
                },
                {
                    match: /case \i\.\i\.DEVELOPER_OPTIONS:return \i;/,
                    replace: "$&case 'VencordPlugins':return $self.PluginsSubmenu();"
                }
            ]
        },
    ],

    PluginsSubmenu,

    // This is the very outer layer of the entire ui, so we can't wrap this in an ErrorBoundary
    // without possibly also catching unrelated errors of children.
    //
    // Thus, we sanity check webpack modules & do this really hacky try catch to hopefully prevent hard crashes if something goes wrong.
    // try catch will only catch errors in the Layer function (hence why it's called as a plain function rather than a component), but
    // not in children
    Layer(props: LayerProps) {
        if (!FocusLock || !ComponentDispatch || !Classes) {
            new Logger("BetterSettings").error("Failed to find some components");
            return props.children;
        }

        return <Layer {...props} />;
    },

    wrapMenu(list: SettingsEntry[]) {
        if (!settings.store.organizeMenu) return list;

        const items = [{ label: null as string | null, items: [] as SettingsEntry[] }];

        for (const item of list) {
            if (item.section === "HEADER") {
                items.push({ label: item.label, items: [] });
            } else if (item.section === "DIVIDER") {
                items.push({ label: getIntlMessage("OTHER_OPTIONS"), items: [] });
            } else {
                items.at(-1)!.items.push(item);
            }
        }

        return {
            filter(predicate: (item: SettingsEntry) => boolean) {
                for (const category of items) {
                    category.items = category.items.filter(predicate);
                }
                return this;
            },
            map(render: (item: SettingsEntry) => ReactElement<any>) {
                return items
                    .filter(a => a.items.length > 0)
                    .map(({ label, items }) => {
                        const children = items.map(render);
                        if (label) {
                            return (
                                <Menu.MenuItem
                                    key={label}
                                    id={label.replace(/\W/, "_")}
                                    label={label}
                                    action={children[0].props.action}
                                >
                                    {children}
                                </Menu.MenuItem>
                            );
                        } else {
                            return children;
                        }
                    });
            }
        };
    }
});
