/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Flex, Menu } from "@webpack/common";

interface Engine {
    name: string;
    url: string;
}

const DefaultEngines = {
    Google: "https://www.google.com/search?q=",
    DuckDuckGo: "https://duckduckgo.com/",
    Bing: "https://www.bing.com/search?q=",
    Yahoo: "https://search.yahoo.com/search?p=",
    Github: "https://github.com/search?q=",
    Kagi: "https://kagi.com/search?q=",
    Yandex: "https://yandex.com/search/?text=",
    AOL: "https://search.aol.com/aol/search?q=",
    Baidu: "https://www.baidu.com/s?wd=",
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
    }
});

function search(src: string, engine: string) {
    open(engine + encodeURIComponent(src), "_blank");
}

export function makeSearchItem() {
    const src = document.getSelection()?.toString();
    if (!src) return;

    const Engines = { ...DefaultEngines };

    if(settings.store.customEngineName && settings.store.customEngineURL) {
        Engines[settings.store.customEngineName] = settings.store.customEngineURL;
    }

    return (
        <Menu.MenuItem
            label="Search Text with..."
            key="search-text"
            id="search-text"
        >
            {Object.keys(Engines).map((engine, i) => {
                const key = "search-content-" + engine;
                if (!key) return;
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
                                    src={`https://www.google.com/s2/favicons?domain=${new URL(Engines[engine])}`}
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

export default definePlugin({
    name: "ReplaceGoogleSearch",
    description: "Replaces the Google search with different Engines",
    authors: [
        Devs.Moxxie,
        Devs.Ethan
    ],

    settings,
    makeSearchItem,

    patches: [
        {
            find: "\"text cannot be null\"",
            replacement: {
                match: /\[\(0,\i.jsx\)\(\i.MenuItem,\{id:"search-google",label:\i.default.Messages.SEARCH_WITH_GOOGLE,action:t},"search-google"\)\]/,
                replace: "$self.makeSearchItem()"
            }
        }
    ],
});
