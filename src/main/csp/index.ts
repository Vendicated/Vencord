/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NativeSettings, RendererSettings } from "@main/settings";
import { session } from "electron";

type PolicyMap = Record<string, string[]>;

export const ConnectSrc = ["connect-src"];
export const ImageSrc = [...ConnectSrc, "img-src"];
export const CssSrc = ["style-src", "font-src"];
export const ImageAndMediaSrc = [...ImageSrc, "media-src"];
export const ImageAndCssSrc = [...ImageSrc, ...CssSrc];
export const ImageScriptsAndCssSrc = [...ImageAndCssSrc, "script-src", "worker-src"];
export const ImageMediaAndCssSrc = [...ImageAndMediaSrc, ...CssSrc];

// Plugins can whitelist their own domains by importing this object in their native.ts
// script and just adding to it. But generally, you should just edit this file instead

export const CspPolicies: PolicyMap = {
    "http://localhost:*": ImageAndCssSrc,
    "http://127.0.0.1:*": ImageAndCssSrc,
    "localhost:*": ImageAndCssSrc,
    "127.0.0.1:*": ImageAndCssSrc,
    "ws://localhost:*": ConnectSrc,
    "ws://127.0.0.1:*": ConnectSrc,

    "*.github.io": ImageAndCssSrc, // GitHub pages, used by most themes
    "github.com": ImageMediaAndCssSrc, // GitHub content (stuff uploaded to markdown forms), used by most themes
    "raw.githubusercontent.com": ImageMediaAndCssSrc, // GitHub raw, used by some themes
    "*.gitlab.io": ImageAndCssSrc, // GitLab pages, used by some themes
    "gitlab.com": ImageAndCssSrc, // GitLab raw, used by some themes
    "*.codeberg.page": ImageAndCssSrc, // Codeberg pages, used by some themes
    "codeberg.org": ImageAndCssSrc, // Codeberg raw, used by some themes

    "*.githack.com": ImageAndCssSrc, // githack (namely raw.githack.com), used by some themes
    "jsdelivr.net": ImageAndCssSrc, // jsDelivr, used by very few themes

    "fonts.googleapis.com": [...ConnectSrc, ...CssSrc], // Google Fonts, used by many themes

    "i.imgur.com": ImageSrc, // Imgur, used by some themes
    "i.ibb.co": ImageSrc, // ImgBB, used by some themes
    "i.pinimg.com": ImageSrc, // Pinterest, used by some themes
    "files.catbox.moe": ImageAndCssSrc, // Catbox, used by some themes

    "cdn.discordapp.com": ImageMediaAndCssSrc, // Discord CDN, used by Vencord and some themes to load media
    "media.discordapp.net": ImageSrc, // Discord media CDN, possible alternative to Discord CDN

    // CDNs used for some things by Vencord.
    // FIXME: we really should not be using CDNs anymore
    "cdnjs.cloudflare.com": ImageScriptsAndCssSrc,
    "cdn.jsdelivr.net": ImageScriptsAndCssSrc,

    // Function Specific
    "api.github.com": ConnectSrc, // used for updating Vencord itself
    "ws.audioscrobbler.com": ConnectSrc, // Last.fm API
    "musicbrainz.org": ConnectSrc,
    "*.listenbrainz.org": ConnectSrc,
    "coverartarchive.org": ConnectSrc,
    "archive.org": ConnectSrc,
    "*.archive.org": ConnectSrc,
    "translate-pa.googleapis.com": ConnectSrc, // Google Translate API
    "*.vencord.dev": ImageSrc, // VenCloud (api.vencord.dev) and Badges (badges.vencord.dev)
    "manti.vendicated.dev": ImageSrc, // ReviewDB API
    "decor.fieryflames.dev": ConnectSrc, // Decor API
    "ugc.decor.fieryflames.dev": ImageSrc, // Decor CDN
    "sponsor.ajay.app": ConnectSrc, // Dearrow API
    "dearrow-thumb.ajay.app": ImageSrc, // Dearrow Thumbnail CDN
    "usrbg.is-hardly.online": ImageSrc, // USRBG API
    "icons.duckduckgo.com": ImageSrc, // DuckDuckGo Favicon API (Reverse Image Search)

    // Tenor & Giphy, used by GifProviderSwitcher plugin and some themes
    "*.tenor.com": ImageAndMediaSrc,
    "*.tenor.co": ImageAndMediaSrc,
    "*.giphy.com": ImageAndMediaSrc,

    "equicord.org": ImageSrc,
    "*.equicord.org": ImageSrc,

    "fonts.gstatic.com": [...ConnectSrc, ...CssSrc],
    "fonts.google.com": ConnectSrc,
    "images-ext-1.discordapp.net": ImageSrc,
    "images-ext-2.discordapp.net": ImageSrc,
    "static.klipy.com": ImageAndMediaSrc,
    "avatars.githubusercontent.com": ImageSrc,
    "api.spotify.com": ConnectSrc,
    "*.scdn.co": ImageAndMediaSrc,
    "*.sndcdn.com": ImageAndMediaSrc,
    "*.mzstatic.com": ImageSrc,
    "audio-ssl.itunes.apple.com": ImageAndMediaSrc,
    "*.tidal.com": ImageAndMediaSrc,
    "embed.tidal.com": ["frame-src"],
    "lrclib.net": ConnectSrc,
    "spotify-lyrics-api-pi.vercel.app": ConnectSrc,
    "translate.googleapis.com": ConnectSrc,
    "dc.songspotlight.nexpid.xyz": ConnectSrc,
    "api.stats.fm": ConnectSrc,
    "timezone.creations.works": ConnectSrc,
    "openrouter.ai": ConnectSrc,
    "aiapi.serversmp.xyz": ConnectSrc,
    "embed.sammcheese.net": ConnectSrc,
    "encrypting.host": ConnectSrc,
    "api.thecatapi.com": ConnectSrc,
    "api.thedogapi.com": ConnectSrc,
    "www.reddit.com": ConnectSrc,
    "nekos.best": ConnectSrc,
    "huggingface.co": ConnectSrc,
    "*.huggingface.co": ConnectSrc,
    "*.hf.co": ConnectSrc,
    "st.ayaka.one": ImageSrc,
    "placeholder.nin0.dev": ImageSrc,
    "twemoji.maxcdn.com": ImageSrc,
    "shiggy.thororen.com": ImageSrc,

    "gb.obamabot.me": ImageSrc,
    "nekocord.dev": ImageSrc,
    "paicord.llsc12.me": ImageSrc,
    "file.coffee": ImageSrc,
    "backend.aliucord.com": ImageSrc,
    "sysspa.alyxia.dev": ImageSrc,
};

const findHeader = (headers: PolicyMap, headerName: Lowercase<string>) => {
    return Object.keys(headers).find(h => h.toLowerCase() === headerName);
};

const parsePolicy = (policy: string): PolicyMap => {
    const result: PolicyMap = {};
    policy.split(";").forEach(directive => {
        const [directiveKey, ...directiveValue] = directive.trim().split(/\s+/g);
        if (directiveKey && !Object.prototype.hasOwnProperty.call(result, directiveKey)) {
            result[directiveKey] = directiveValue;
        }
    });

    return result;
};

const stringifyPolicy = (policy: PolicyMap): string =>
    Object.entries(policy)
        .filter(([, values]) => values?.length)
        .map(directive => directive.flat().join(" "))
        .join("; ");

const patchCsp = (headers: PolicyMap) => {
    const reportOnlyHeader = findHeader(headers, "content-security-policy-report-only");
    if (reportOnlyHeader)
        delete headers[reportOnlyHeader];

    const header = findHeader(headers, "content-security-policy");

    if (header) {
        const csp = parsePolicy(headers[header][0]);

        const pushDirective = (directive: string, ...values: string[]) => {
            csp[directive] ??= [...(csp["default-src"] ?? [])];
            csp[directive].push(...values);
        };

        pushDirective("style-src", "'unsafe-inline'");
        // we could make unsafe-inline safe by using strict-dynamic with a random nonce on our Vencord loader script https://content-security-policy.com/strict-dynamic/
        // HOWEVER, at the time of writing (24 Jan 2025), Discord is INSANE and also uses unsafe-inline
        // Once they stop using it, we also should
        pushDirective("script-src", "'unsafe-inline'", "'unsafe-eval'");

        for (const directive of ["style-src", "connect-src", "img-src", "font-src", "media-src", "worker-src"]) {
            pushDirective(directive, "blob:", "data:", "vencord:", "vesktop:", "equicord:", "equibop:");
        }

        for (const [host, directives] of Object.entries(NativeSettings.store.customCspRules)) {
            for (const directive of directives) {
                pushDirective(directive, host);
            }
        }

        for (const [host, directives] of Object.entries(CspPolicies)) {
            for (const directive of directives) {
                pushDirective(directive, host);
            }
        }

        headers[header] = [stringifyPolicy(csp)];
    }
};

function migrateThemeLinks() {
    if (NativeSettings.store.migratedThemeLinkCsp) return;

    const { themeLinks = [], enabledThemeLinks = [] } = RendererSettings.store;
    for (const link of new Set([...themeLinks, ...enabledThemeLinks])) {
        const url = URL.parse(link.replace(/^@(light|dark) /, ""));
        if (url?.protocol !== "https:") continue;

        const { host } = url;
        const isAllowed = Object.entries({ ...CspPolicies, ...NativeSettings.store.customCspRules })
            .some(([source, directives]) => (source === host || source.startsWith("*.") && host.endsWith(source.slice(1))) && directives.includes("style-src"));

        if (!isAllowed) NativeSettings.store.customCspRules[host] = ["style-src", "img-src", "font-src"];
    }

    NativeSettings.store.migratedThemeLinkCsp = true;
}

export function initCsp() {
    migrateThemeLinks();

    session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, resourceType }, cb) => {
        if (responseHeaders) {
            if (resourceType === "mainFrame")
                patchCsp(responseHeaders);

            // Fix hosts that don't properly set the css content type, such as
            // raw.githubusercontent.com
            if (resourceType === "stylesheet") {
                const header = findHeader(responseHeaders, "content-type");
                if (header)
                    responseHeaders[header] = ["text/css"];
            }
        }

        cb({ cancel: false, responseHeaders });
    });

    // assign a noop to onHeadersReceived to prevent other mods from adding their own incompatible ones.
    // For instance, OpenAsar adds their own that doesn't fix content-type for stylesheets which makes it
    // impossible to load css from github raw despite our fix above
    session.defaultSession.webRequest.onHeadersReceived = () => { };
}
