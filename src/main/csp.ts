/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { session } from "electron";

type PolicyMap = Record<string, string[]>;

const MediaSrc = ["connect-src", "img-src", "media-src"];
const CssSrc = ["style-src", "font-src"];
const MediaAndCssSrc = [...MediaSrc, ...CssSrc];
const MediaScriptsAndCssSrc = [...MediaAndCssSrc, "script-src", "worker-src"];

const Policies: PolicyMap = {
    "*.github.io": MediaAndCssSrc, // github pages, used by most themes
    "raw.githubusercontent.com": MediaAndCssSrc, // github raw, used by some themes
    "*.gitlab.io": MediaAndCssSrc, // gitlab pages, used by some themes
    "gitlab.com": MediaAndCssSrc, // gitlab raw, used by some themes
    "*.codeberg.page": MediaAndCssSrc, // codeberg pages, used by some themes
    "codeberg.org": MediaAndCssSrc, // codeberg raw, used by some themes

    "*.githack.com": MediaAndCssSrc, // githack (namely raw.githack.com), used by some themes
    "jsdelivr.net": MediaAndCssSrc, // jsdeliver, used by very few themes

    "fonts.googleapis.com": CssSrc, // google fonts, used by many themes

    "i.imgur.com": MediaSrc, // imgur, used by some themes
    "i.ibb.co": MediaSrc, // imgbb, used by some themes

    "cdn.discordapp.com": MediaAndCssSrc, // Discord CDN, used by Vencord and some themes to load media
    "media.discordapp.net": MediaSrc, // Discord media CDN, possible alternative to Discord CDN

    "*.vencord.dev": MediaSrc, // used for VenCloud (api.vencord.dev) and badges (badges.vencord.dev)

    // CDNs used for some things by Vencord.
    // FIXME: we really should not be using CDNs anymore
    "cdnjs.cloudflare.com": MediaScriptsAndCssSrc,
    "unpkg.com": MediaScriptsAndCssSrc,
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


const patchCsp = (headers: Record<string, string[]>) => {
    const reportOnlyHeader = findHeader(headers, "content-security-policy-report-only");
    if (reportOnlyHeader)
        delete headers[reportOnlyHeader];

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
