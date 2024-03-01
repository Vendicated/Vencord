/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import PluginModal from "@components/PluginSettings/PluginModal";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, SettingsRouter } from "@webpack/common";

const testieWestie: boolean = true;

const Engines = {
    DuckDuckGo: "https://duckduckgo.com/",
    Bing: "https://www.bing.com/search?q=",
    Yahoo: "https://search.yahoo.com/search?p=",
    Github: "https://github.com/search?q=",
    Kagi: "https://kagi.com/search?q=",
    Yandex: "https://yandex.com/search/?text=",
    AOL: "https://search.aol.com/aol/search?q=",
    Baidu: "https://www.baidu.com/s?wd=",
    Wikipedia: "https://wikipedia.org/w/index.php?search="
} as const;

function getSettings(): Record<string, any> {
    const settings = {};

    Object.keys(Engines).map((engine, index) => {
        settings[engine] = {
            type: OptionType.BOOLEAN,
            description: `Add ${engine} to to the context menu`,
            default: true
        };
    });

    return settings;
}

const settings = definePluginSettings(getSettings());

function search(src: string, engine: string) {
    open(engine + encodeURIComponent(src), "_blank");
}

function areBrowsersDisabled(): boolean {
    for (const engine in Engines) {
        if (settings.store[engine]) {
            return false;
        };
    }

    return true;
}


function makeSearchItem(src: string) {
    const browsersDisabled = areBrowsersDisabled();

    return (
        <Menu.MenuItem
            label="More Search Engines"
            key="search-content"
            id="search-content"
        >
            {Object.keys(Engines).map((engine, i) => {
                const key = "search-content-" + engine;
                if (!settings.store[engine]) return null; // Return null for engines not selected
                return (
                    <Menu.MenuItem
                        key={key}
                        id={key}
                        label={
                            <Flex style={{ alignItems: "center", gap: "0.5em" }}>
                                <img
                                    style={{
                                        borderRadius: i >= 3
                                            ? "50%"
                                            : void 0
                                    }}
                                    aria-hidden="true"
                                    height={16}
                                    width={16}
                                    src={new URL("/favicon.ico", Engines[engine]).toString()}
                                />
                                {engine}
                            </Flex>
                        }
                        action={() => search(src, Engines[engine])}
                    />
                );
            })}
            {browsersDisabled && (
                <Menu.MenuItem
                    key="search-content-none"
                    id="search-content-none"
                    label={
                        <Flex style={{ alignItems: "center", gap: "0.5em" }}>
                            Add engines
                        </Flex>
                    }

                    action={() => {
                        SettingsRouter.open("VencordPlugins");
                    }}
                />
            )}
        </Menu.MenuItem>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const selection = document.getSelection()?.toString();
    if (!selection) return;

    const group = findGroupChildrenByChildId("search-google", children);
    group?.push(makeSearchItem(selection));
};

export default definePlugin({
    name: "MoreSearchEngines",
    authors: [Devs.Moxxie, Devs.Ethan],
    description: "Allows you to search messages in diffrent search engines!",
    settings,

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
    }
});
