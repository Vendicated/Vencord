/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
import { type ReactNode } from "react";

import indicatorsDefault from "./indicators";
import ToneIndicator from "./ToneIndicator";

const settings = definePluginSettings({
    prefix: {
        type: OptionType.STRING,
        description: "Prefix character(s) for tone indicators.",
        default: "/",
    },
    customIndicators: {
        type: OptionType.STRING,
        description: "Custom tone indicators (format: jk=Joking; srs=Serious)",
        default: "",
    },
    maxIndicators: {
        type: OptionType.NUMBER,
        description: "Maximum number of tone indicators to show per message",
        default: 5,
    },
});

function getCustomIndicators(): Record<string, string> {
    const raw = settings.store.customIndicators || "";
    const result: Record<string, string> = {};

    raw.split("; ").forEach(entry => {
        const [key, ...rest] = entry.split("=");
        if (key && rest.length > 0) {
            result[key.trim().toLowerCase()] = rest.join("=").trim();
        }
    });

    return result;
}

function getIndicator(text: string): string | null {
    text = text.toLowerCase();
    const customIndicators = getCustomIndicators();

    return (
        customIndicators[text] ||
        customIndicators[`_${text}`] ||
        indicatorsDefault.get(text) ||
        indicatorsDefault.get(`_${text}`) ||
        null
    );
}

function buildIndicatorRegex(): RegExp {
    const customIndicators = getCustomIndicators();
    const allIndicators = new Set<string>();

    indicatorsDefault.forEach((_, key) => {
        allIndicators.add(key.replace(/^_/, "")); // remove underscore prefix for aliases
    });
    Object.keys(customIndicators).forEach(key => {
        allIndicators.add(key.replace(/^_/, "")); // remove underscore prefix for aliases
    });

    // escape special regex characters and sort by length (longest first)
    const escaped = Array.from(allIndicators)
        .map(ind => ind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .sort((a, b) => b.length - a.length); // longest first to avoid partial matches (should fix some edge cases)

    const prefix = settings.store.prefix || "/";
    let escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // if prefix is a markdown character, also match escaped version
    const isMarkdown = /[*_~`|]/.test(prefix);
    if (isMarkdown) {
        escapedPrefix = `(?:\\\\${escapedPrefix}|${escapedPrefix})`;
    }

    // exclude forward slash from punctuation to prevent sed syntax conflicts (s/find/replace)
    const pattern = `(?:^|\\s)${escapedPrefix}(${escaped.join("|")})(?=\\s|$|[^\\s\\w/])`;
    return new RegExp(pattern, "giu"); // 'i' = case-insensitive, 'u' = unicode
}

function splitTextWithIndicators(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let count = 0;
    const regex = buildIndicatorRegex();
    const prefix = settings.store.prefix || "/";
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) && count < settings.store.maxIndicators) {
        const indicator = match[1];
        const desc = getIndicator(indicator);

        const matchStart = match.index;
        const matchEnd = regex.lastIndex;

        if (matchStart > lastIndex) {
            nodes.push(text.slice(lastIndex, matchStart));
        }

        if (desc) {
            nodes.push(
                <ToneIndicator
                    key={`ti-${matchStart}`}
                    prefix={prefix}
                    indicator={indicator}
                    desc={desc}
                />,
            );
            count++;
        }

        lastIndex = matchEnd;
    }

    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

    return nodes;
}

function patchChildrenTree(children: any): any {
    const transform = (node: any): any => {
        if (node == null) return node;

        if (typeof node === "string") {
            const prefix = settings.store.prefix || "/";
            let escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            // if prefix is markdown character, also check for escaped version
            const isMarkdown = /[*_~`|]/.test(prefix);
            if (isMarkdown) {
                escapedPrefix = `(?:\\\\${escapedPrefix}|${escapedPrefix})`;
            }

            if (!new RegExp(`${escapedPrefix}[\\p{L}_]+`, "iu").test(node)) return node;
            const parts = splitTextWithIndicators(node);
            return parts.length === 1 ? parts[0] : parts;
        }

        if (node?.props?.children != null) {
            const c = node.props.children;
            if (Array.isArray(c)) {
                node.props.children = c.map(transform).flat();
            } else {
                node.props.children = transform(c);
            }
            return node;
        }

        return node;
    };

    if (Array.isArray(children)) return children.map(transform).flat();
    return transform(children);
}

export default definePlugin({
    name: "ToneIndicators",
    description: "Show tooltips for tone indicators like /srs, /gen, etc. in sent messages.",
    authors: [EquicordDevs.justjxke],
    settings,

    patches: [
        {
            find: '["strong","em","u","text","inlineCode","s","spoiler"]',
            replacement: [
                {
                    match: /(?=return\{hasSpoilerEmbeds:\i,content:(\i))/,
                    replace: (_: any, content: string) =>
                        `${content}=$self.patchToneIndicators(${content});`,
                },
            ],
        },
    ],

    patchToneIndicators(content: any): any {
        try {
            return patchChildrenTree(content);
        } catch {
            return content;
        }
    },
});
