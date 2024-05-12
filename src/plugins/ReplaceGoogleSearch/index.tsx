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

interface Engine {
    name: string;
    url: string;
}

const Engines = {
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
    engine: {
        description: "Choose one of the default search engines to replace Google with",
        type: OptionType.SELECT,
        options: Object.keys(Engines).map((engine => ({
            label: engine,
            value: engine
        })))
    },
    useCustomEngine: {
        description: "Use a custom search engine",
        type: OptionType.BOOLEAN,
        default: false
    },
    engineName: {
        description: "",
        type: OptionType.STRING,
        default: "",
        placeholder: "Enter the name of the custom search engine",
    },
    engineUrl: {
        description: "",
        type: OptionType.STRING,
        default: "https://",
        placeholder: "Enter the URL of the custom search engine",
    }
});

export default definePlugin({
    name: "ReplaceGoogleSearch",
    description: "Replaces the Google search with different Engines",
    authors: [
        Devs.Moxxie,
        Devs.Ethan
    ],

    getUrl: (): Engine => {
        if (settings.store.engine) {
            if (settings.store.useCustomEngine) {
                return { name: settings.store.engineName, url: settings.store.engineUrl };
            }

            const engine = settings.store.engine as keyof typeof Engines;
            return { name: engine, url: Engines[engine] };
        }

        return { name: "Google", url: Engines.Google };
    },

    settings,

    patches: [
        {
            find: "\"text cannot be null\"",
            replacement: {
                match: /label:\i.default.Messages.SEARCH_WITH_GOOGLE,/,
                replace: "label:\"Search with \"+$self.getUrl().name,"
            }
        },
        {
            find: "\"text cannot be null\"",
            replacement: {
                match: /window.open\("https:\/\/www.google.com\/search\?q="/,
                replace: "window.open($self.getUrl().url"
            }
        }
    ],
});
