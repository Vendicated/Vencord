/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { session } from "electron";

const findHeader = (headers: Record<string, string[]>, headerName: Lowercase<string>) => {
    return Object.keys(headers).find(h => h.toLowerCase() === headerName);
};

const MediaSrc = ["connect-src", "img-src", "media-src"];
const CssSrc = ["style-src", "font-src"];
const MediaAndCssSrc = [...MediaSrc, ...CssSrc];
const MediaScriptsAndCssSrc = [...MediaAndCssSrc, "script-src", "worker-src"];

const Policies: Record<string, string[]> = {
    // Used by Themes
    "*.github.io": MediaAndCssSrc,
    "raw.githubusercontent.com": MediaAndCssSrc,
    "*.githack.com": MediaAndCssSrc,
    "jsdelivr.net": MediaAndCssSrc,
    "fonts.googleapis.com": CssSrc,

    // Used by themes and some Vencord code
    "cdn.discordapp.com": MediaAndCssSrc,
    "media.discordapp.net": MediaSrc,

    // CDNs used for some things by Vencord.
    // FIXME: we really should not be using CDNs anymore
    "cdnjs.cloudflare.com": MediaScriptsAndCssSrc,
    "unpkg.com": MediaScriptsAndCssSrc,

    // used for VenCloud (api.vencord.dev) and badges (badges.vencord.dev)
    "*.vencord.dev": MediaSrc,
};

// Remove CSP
type PolicyResult = Record<string, string[]>;

const parsePolicy = (policy: string): PolicyResult => {
    const result: PolicyResult = {};
    policy.split(";").forEach(directive => {
        const [directiveKey, ...directiveValue] = directive.trim().split(/\s+/g);
        if (directiveKey && !Object.prototype.hasOwnProperty.call(result, directiveKey)) {
            result[directiveKey] = directiveValue;
        }
    });

    return result;
};
const stringifyPolicy = (policy: PolicyResult): string =>
    Object.entries(policy)
        .filter(([, values]) => values?.length)
        .map(directive => directive.flat().join(" "))
        .join("; ");


const patchCsp = (headers: Record<string, string[]>) => {
    const header = findHeader(headers, "content-security-policy");

    if (header) {
        const csp = parsePolicy(headers[header][0]);

        const pushDirective = (directive: string, ...values: string[]) => {
            csp[directive] ??= [];
            csp[directive].push(...values);
        };

        for (const directive of ["style-src", "connect-src", "img-src", "font-src", "media-src", "worker-src"]) {
            pushDirective(directive, "blob:", "data:", "vencord:", "'unsafe-inline'");
        }

        pushDirective("script-src", "'unsafe-inline'", "'unsafe-eval'");

        for (const [host, directives] of Object.entries(Policies)) {
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
