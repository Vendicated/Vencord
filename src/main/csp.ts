/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { session } from "electron";

type PolicyMap = Record<string, string[]>;

export const ConnectSrc = ["connect-src"];
export const MediaSrc = [...ConnectSrc, "img-src", "media-src"];
export const CssSrc = ["style-src", "font-src"];
export const MediaAndCssSrc = [...MediaSrc, ...CssSrc];
export const MediaScriptsAndCssSrc = [...MediaAndCssSrc, "script-src", "worker-src"];

// Plugins can whitelist their own domains by importing this object in their native.ts
// script and just adding to it. But generally, you should just edit this file instead

export const CspPolicies: PolicyMap = {
    "*.github.io": MediaAndCssSrc, // GitHub pages, used by most themes
    "github.com": MediaAndCssSrc, // GitHub content (stuff uploaded to markdown forms), used by most themes
    "raw.githubusercontent.com": MediaAndCssSrc, // GitHub raw, used by some themes
    "*.gitlab.io": MediaAndCssSrc, // GitLab pages, used by some themes
    "gitlab.com": MediaAndCssSrc, // GitLab raw, used by some themes
    "*.codeberg.page": MediaAndCssSrc, // Codeberg pages, used by some themes
    "codeberg.org": MediaAndCssSrc, // Codeberg raw, used by some themes

    "*.githack.com": MediaAndCssSrc, // githack (namely raw.githack.com), used by some themes
    "jsdelivr.net": MediaAndCssSrc, // jsDelivr, used by very few themes

    "fonts.googleapis.com": CssSrc, // Google Fonts, used by many themes

    "i.imgur.com": MediaSrc, // Imgur, used by some themes
    "i.ibb.co": MediaSrc, // ImgBB, used by some themes
    "i.pinimg.com": MediaSrc, // Pinterest, used by some themes
    "*.tenor.com": MediaSrc, // Tenor, used by some themes
    "files.catbox.moe": MediaSrc, // Catbox, used by some themes

    "cdn.discordapp.com": MediaAndCssSrc, // Discord CDN, used by Vencord and some themes to load media
    "media.discordapp.net": MediaSrc, // Discord media CDN, possible alternative to Discord CDN

    // CDNs used for some things by Vencord.
    // FIXME: we really should not be using CDNs anymore
    "cdnjs.cloudflare.com": MediaScriptsAndCssSrc,
    "cdn.jsdelivr.net": MediaScriptsAndCssSrc,

    // Function Specific
    "api.github.com": ConnectSrc, // used for updating Vencord itself
    "ws.audioscrobbler.com": ConnectSrc, // Last.fm API
    "translate-pa.googleapis.com": ConnectSrc, // Google Translate API
    "*.vencord.dev": MediaSrc, // VenCloud (api.vencord.dev) and Badges (badges.vencord.dev)
    "manti.vendicated.dev": MediaSrc, // ReviewDB API
    "decor.fieryflames.dev": ConnectSrc, // Decor API
    "ugc.decor.fieryflames.dev": MediaSrc, // Decor CDN
    "sponsor.ajay.app": ConnectSrc, // Dearrow API
    "dearrow-thumb.ajay.app": MediaSrc, // Dearrow Thumbnail CDN
    "usrbg.is-hardly.online": MediaSrc, // USRBG API
    "icons.duckduckgo.com": MediaSrc, // DuckDuckGo Favicon API (Reverse Image Search)
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
            pushDirective(directive, "blob:", "data:", "vencord:");
        }

        for (const [host, directives] of Object.entries(CspPolicies)) {
            for (const directive of directives) {
                pushDirective(directive, host);
            }
        }

        headers[header] = [stringifyPolicy(csp)];
    }
};

export function initCsp() {
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
