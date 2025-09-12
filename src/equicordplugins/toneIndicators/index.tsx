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

function splitTextWithIndicators(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let count = 0;
    const regex = /\/([a-z]{1,20})(?=\s|$|[^\w])/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) && count < settings.store.maxIndicators) {
        const indicator = match[1];
        const desc = getIndicator(indicator);
        if (!desc) continue;

        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        nodes.push(
            <ToneIndicator
                key={`ti-${match.index}`}
                indicator={indicator}
                desc={desc}
            />,
        );

        lastIndex = regex.lastIndex;
        count++;
    }

    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

    return nodes;
}

function patchChildrenTree(children: any): any {
    const transform = (node: any): any => {
        if (node == null) return node;

        if (typeof node === "string") {
            if (!/\/[a-z]+/i.test(node)) return node;
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
                    match: /(?=return\{hasSpoilerEmbeds:\i,content:(\i)\})/,
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
