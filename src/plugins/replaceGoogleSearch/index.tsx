/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Flex, Menu } from "@webpack/common";

const DefaultEngines = {
    Google: "https://www.google.com/search?q=",
    DuckDuckGo: "https://duckduckgo.com/?q=",
    Brave: "https://search.brave.com/search?q=",
    Bing: "https://www.bing.com/search?q=",
    Yahoo: "https://search.yahoo.com/search?p=",
    Yandex: "https://yandex.com/search/?text=",
    GitHub: "https://github.com/search?q=",
    Reddit: "https://www.reddit.com/search?q=",
    Wikipedia: "https://wikipedia.org/w/index.php?search=",
} as const;

const settings = definePluginSettings({
    customEngineName: {
        description: "Name of the custom search engine",
        type: OptionType.STRING,
        placeholder: "Google"
    },
    customEngineURL: {
        description: "The URL of your Engine",
        type: OptionType.STRING,
        placeholder: "https://google.com/search?q="
    },
    setDefaultEngine: {
        description: "Set your custom engine as the default search engine",
        type: OptionType.BOOLEAN,
        default: false,
    }
});

function search(src: string, engine: string) {
    open(engine + encodeURIComponent(src.trim()), "_blank");
}

function makeSearchItem(src: string) {
    const { customEngineName, customEngineURL, setDefaultEngine } = settings.store;
    if (setDefaultEngine && customEngineName && customEngineURL) {
        return (
            <Menu.MenuItem
                label={`Search with ${customEngineName}`}
                key="search-custom-engine"
                id="vc-search-custom-engine"
                action={() => search(src, customEngineURL)}
            />
        );
    }

    let Engines = {};

    if (customEngineName && customEngineURL) {
        Engines[customEngineName] = customEngineURL;
    }

    Engines = { ...Engines, ...DefaultEngines };

    return (
        <Menu.MenuItem
            label="Search Text"
            key="search-text"
            id="vc-search-text"
        >
            {Object.keys(Engines).map(engine => {
                const key = "vc-search-content-" + engine;
                return (
                    <Menu.MenuItem
                        key={key}
                        id={key}
                        label={
                            <Flex style={{ alignItems: "center", gap: "0.5em" }}>
                                <img
                                    style={{
                                        borderRadius: "50%"
                                    }}
                                    aria-hidden="true"
                                    height={16}
                                    width={16}
                                    src={`https://icons.duckduckgo.com/ip3/${new URL(Engines[engine]).hostname}.ico`}
                                />
                                {engine}
                            </Flex>
                        }
                        action={() => search(src, Engines[engine])}
                    />
                );
            })}
        </Menu.MenuItem>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, _props) => {
    const selection = document.getSelection()?.toString();
    if (!selection) return;

    const group = findGroupChildrenByChildId("search-google", children);
    if (group) {
        const idx = group.findIndex(c => c?.props?.id === "search-google");
        if (idx !== -1) group[idx] = makeSearchItem(selection);
    }
};

export default definePlugin({
    name: "ReplaceGoogleSearch",
    description: "Replaces the Google search with different Engine(s)",
    authors: [Devs.Moxxie, Devs.Ethan],

    settings,

    contextMenus: {
        "message": messageContextMenuPatch
    }
});
