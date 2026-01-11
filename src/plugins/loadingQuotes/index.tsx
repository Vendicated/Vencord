/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { sleep } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { useEffect, useState } from "@webpack/common";
import presetQuotesText from "file://quotes.txt";
import { JSX } from "react";

const presetQuotes = presetQuotesText.split("\n").map(quote => /^\s*[^#\s]/.test(quote) && quote.trim()).filter(Boolean) as string[];
const noQuotesQuote = "Did you really disable all loading quotes? What a buffoon you are...";

const logger = new Logger("LoadingQuotes");

const settings = definePluginSettings({
    replaceEvents: {
        description: "Should this plugin also apply during events with special event themed quotes? (e.g. Halloween)",
        type: OptionType.BOOLEAN,
        default: true
    },
    enablePluginPresetQuotes: {
        description: "Enable the quotes preset by this plugin",
        type: OptionType.BOOLEAN,
        default: true
    },
    enableDiscordPresetQuotes: {
        description: "Enable Discord's preset quotes (including event quotes, during events)",
        type: OptionType.BOOLEAN,
        default: false
    },
    additionalQuotes: {
        description: "Additional custom quotes to possibly appear, separated by the below delimiter",
        type: OptionType.STRING,
        default: "",
    },
    additionalQuotesDelimiter: {
        description: "Delimiter for additional quotes",
        type: OptionType.STRING,
        default: "|",
    },
    enableRandomFactQuotes: {
        description: "Enable random fact quotes from an online API",
        type: OptionType.BOOLEAN,
        default: false
    },
    apiUrl: {
            description: "API endpoint to use (if enabled) for random facts.",
            type: OptionType.SELECT,
            options: [
                {
                    label: "Useless facts API. Gives you random useless but short facts.",
                    value: "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en",
                    default: true
                },
                {
                    label: "Wikipedia API. Gives you random facts from all topics but potentially long.",
                    value: "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({
                        action: "query",
                        prop: "extracts",
                        format: "json",
                        formatversion: "2",
                        exsentences: "2",
                        exsectionformat: "plain",
                        generator: "random",
                        grnnamespace: "0",
                        explaintext: "1",
                        origin: "*",
                    })
                }
            ]
        },
});

async function fetchQuote() {
    const url = settings.store.apiUrl;
    let currentQuote = "";
    try {
        const json = await fetch(url).then(res => res.json());
        if (url.includes("wiki")) {
            currentQuote = json?.query?.pages?.[0]?.extract || "";
        }
        else { currentQuote = json?.text || ""; }
    }
    catch (error) {
        logger.error("Failed to fetch quote", error);
        currentQuote = "";
    }
    for (let retryIndex = 0; retryIndex < 5; retryIndex++) {
        // check if the fact is just empty or a disambiguation page
        if (currentQuote === "" || (url.includes("wiki") && currentQuote.endsWith(":"))) {
            await sleep(1000 * (retryIndex + 1));
            try {
                const data = await fetch(url).then(response => response.json());
                currentQuote = data?.query?.pages?.[0]?.extract || "";
            }
            catch (error) {
                logger.error("Failed to fetch quote", error);
                currentQuote = "";
            }
        }
    }
    return currentQuote;
}

function QuoteComponent(): JSX.Element | null {
    const [quote, setQuote] = useState("Loading random fact...");
    useEffect(() => {
        (async () => {
            const quote = await fetchQuote();
            setQuote(quote);
        })();
    }, []);
    return <ErrorBoundary noop>{quote}</ErrorBoundary>;
}

export default definePlugin({
    name: "LoadingQuotes",
    description: "Replace Discords loading quotes",
    authors: [Devs.Ven, Devs.KraXen72, Devs.UlyssesZhan, Devs.DarkRedTitan],

    settings,

    patches: [
        {
            find: "#{intl::LOADING_DID_YOU_KNOW}",
            replacement: [
                {
                    match: /"_loadingText".+?(?=(\i)\[.{0,10}\.random)/,
                    replace: "$&$self.mutateQuotes($1),"
                },
                {
                    match: /"_eventLoadingText".+?(?=(\i)\[.{0,10}\.random)/,
                    replace: "$&$self.mutateQuotes($1),",
                    predicate: () => settings.store.replaceEvents
                }
            ]
        },
    ],

    mutateQuotes(quotes: (string | JSX.Element)[]): void {
        try {
            const { enableDiscordPresetQuotes, additionalQuotes, additionalQuotesDelimiter, enablePluginPresetQuotes, enableRandomFactQuotes } = settings.store;

            if (!enableDiscordPresetQuotes)
                quotes.length = 0;

            if (enablePluginPresetQuotes)
                quotes.push(...presetQuotes);

            if (enableRandomFactQuotes)
                quotes.push(<QuoteComponent />);

            quotes.push(...additionalQuotes.split(additionalQuotesDelimiter).filter(Boolean));

            if (!quotes.length)
                quotes.push(noQuotesQuote);
        } catch (e) {
            logger.error("Failed to mutate quotes", e);
        }
    }
});
