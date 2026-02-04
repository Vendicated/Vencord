/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { type React, Select } from "@webpack/common";

// consts and types
const PROVIDERS = {
    TENOR: "tenor",
    GIPHY: "giphy",
    KLIPY: "klipy"
} as const;

type Provider = typeof PROVIDERS[keyof typeof PROVIDERS];

const PROVIDER_OPTIONS = [
    { label: "Tenor", value: PROVIDERS.TENOR },
    { label: "Giphy", value: PROVIDERS.GIPHY },
    { label: "Klipy", value: PROVIDERS.KLIPY }
];

export const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        description: "Default GIF provider to use for searches",
        options: [
            { label: "Tenor", value: PROVIDERS.TENOR, default: true },
            { label: "Giphy", value: PROVIDERS.GIPHY },
            { label: "Klipy", value: PROVIDERS.KLIPY }
        ] as const
    }
});


function ProviderSelector() {
    // Use settings.use() for reactivity - component re-renders when settings change
    const currentProvider = settings.use(["provider"]).provider ?? PROVIDERS.TENOR;

    const handleClick = (e: React.MouseEvent) => {
        // Prevent click from bubbling up and closing the GIF picker
        e.stopPropagation();
    };

    return (
        <div
            className="vc-gif-provider-selector"
            onClick={handleClick}
            onMouseDown={handleClick}
        >
            <Select
                options={PROVIDER_OPTIONS}
                isSelected={(v: string) => v === currentProvider}
                select={(v: Provider) => { settings.store.provider = v; }}
                serialize={(v: string) => v}
                popoutPosition="bottom"
                closeOnSelect={true}
            />
        </div>
    );
}


interface WrapperProps {
    searchBar: React.ReactNode;
}

function HeaderWrapper({ searchBar }: WrapperProps) {
    return (
        <ErrorBoundary noop>
            <div className="vc-gif-provider-header">
                <div className="vc-gif-provider-search">{searchBar}</div>
                <ProviderSelector />
            </div>
        </ErrorBoundary>
    );
}

let originalFetch: typeof fetch;
let originalXHROpen: typeof XMLHttpRequest.prototype.open;

function getProvider(): Provider {
    return settings.store.provider ?? PROVIDERS.TENOR;
}

function patchUrl(url: string): string {
    if (url.includes("/gifs/search") && url.includes("provider=")) {
        const provider = getProvider();
        const newUrl = url.replace(/provider=\w+/, `provider=${provider}`);
        if (newUrl !== url) {
            return newUrl;
        }
    }
    return url;
}

function patchFetch() {
    originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        let url: string;

        if (typeof input === "string") {
            url = input;
        } else if (input instanceof URL) {
            url = input.toString();
        } else if (input instanceof Request) {
            url = input.url;
        } else {
            return originalFetch.call(window, input, init);
        }

        const patchedUrl = patchUrl(url);
        if (patchedUrl !== url) {
            if (input instanceof Request) {
                return originalFetch.call(window, new Request(patchedUrl, input), init);
            }
            return originalFetch.call(window, patchedUrl, init);
        }

        return originalFetch.call(window, input, init);
    };
}

function patchXHR() {
    originalXHROpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async: boolean = true,
        user?: string | null,
        password?: string | null
    ) {
        const urlStr = url.toString();
        const patchedUrl = patchUrl(urlStr);

        return originalXHROpen.call(this, method, patchedUrl, async, user, password);
    };
}

function unpatchFetch() {
    if (originalFetch) {
        window.fetch = originalFetch;
    }
}

function unpatchXHR() {
    if (originalXHROpen) {
        XMLHttpRequest.prototype.open = originalXHROpen;
    }
}

export default definePlugin({
    name: "GifProviderSelector",
    description: "Adds a dropdown to select between Giphy, Klipy, and Tenor for GIF searches",
    authors: [Devs.Thereallo],
    settings,

    /**
     * Patches to inject our component into the GIF picker header.
     *
     * Based on actual Discord code (Module 855057):
     *
     * renderHeaderContent(){
     *   ...
     *   default:{
     *     let t=(0,m.cf)(),n=(0,h.w)(t);
     *     return(0,r.jsx)(l.IWV,{query:e,onChange:this.handleChangeQuery,
     *            onClear:this.handleClearQuery,placeholder:n,"aria-label":n,
     *            ref:this.props.searchBarRef,autoFocus:!0})
     *   }
     * }
     *
     * Strategy: Capture "return" separately from the JSX call, then wrap
     * only the JSX call with our wrapper function.
     */
    patches: [
        // Patch 1: Change placeholder - replace all provider-specific search text
        // Discord may show "Search Tenor", "Search Giphy", or "Search Klipy"
        {
            find: "Search Tenor",
            replacement: {
                match: /"Search Tenor"/g,
                replace: '"Search GIFs"'
            }
        },
        {
            find: "Search Giphy",
            replacement: {
                match: /"Search Giphy"/g,
                replace: '"Search GIFs"'
            }
        },
        {
            find: "Search Klipy",
            replacement: {
                match: /"Search Klipy"/g,
                replace: '"Search GIFs"'
            }
        },

        // Patch 2: Inject ProviderSelector into the GIF picker header
        //
        // Original: return(0,r.jsx)(l.IWV,{...autoFocus:!0})
        // After:    return $self.wrapWithSelector((0,r.jsx)(l.IWV,{...autoFocus:!0}))
        //
        // We use capture groups:
        // $1 = "return"
        // $2 = "(0,r.jsx)(l.IWV,{...autoFocus:!0})"
        {
            find: "renderHeaderContent()",
            replacement: {
                // Match the return statement with the IWV (SearchBar) component
                // Capture groups:
                // $1 = "return"
                // $2 = the jsx call "(0,r.jsx)(l.IWV,{...})"
                match: /(return)(\(0,i\.jsx\)\(\i\.IWV,\{[^}]+autoFocus:!0\}\))/,
                replace: "$1 $self.wrapWithSelector($2)"
            }
        }
    ],

    wrapWithSelector(searchBarElement: React.ReactNode): React.ReactNode {
        return <HeaderWrapper searchBar={searchBarElement} />;
    },

    start() {
        patchFetch();
        patchXHR();
    },

    stop() {
        unpatchFetch();
        unpatchXHR();
    }
});
