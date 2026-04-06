/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

const settings = definePluginSettings({
    fixation: {
        description: "Fixation (boldness) ratio",
        type: OptionType.SLIDER,
        default: 0.4,
        markers: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
        stickToMarkers: false
    }
});

export default definePlugin({
    name: "BionicReading",
    description: "Applies Bionic Reading to messages, bolding the beginning of words to improve reading speed and focus.",
    authors: [Devs.Ven],
    settings,

    patches: [
        {
            find: '["strong","em","u","text","inlineCode","s","spoiler"]',
            replacement: [
                {
                    match: /return\{hasSpoilerEmbeds:\i,hasBailedAst:\i,content:(\i)\}/,
                    replace: "return{hasSpoilerEmbeds:arguments[0].hasSpoilerEmbeds,hasBailedAst:arguments[0].hasBailedAst,content:$self.applyBionicReading($1)}"
                }
            ]
        }
    ],

    applyBionicReading(content: any[]) {
        try {
            return this.processNodes(content);
        } catch (e) {
            return content;
        }
    },

    processNodes(nodes: any[], prefix = "br"): any[] {
        if (!Array.isArray(nodes)) nodes = [nodes];
        return nodes.map((node, idx) => {
            if (typeof node === "string") {
                return this.bionify(node, `${prefix}-${idx}`);
            }
            if (React.isValidElement(node)) {
                const { children } = node.props as any;
                if (children) {
                    return React.cloneElement(node, {
                        key: `${prefix}-${idx}`,
                        children: this.processNodes(children, `${prefix}-${idx}`)
                    } as any);
                }
            }
            return node;
        }).flat();
    },

    bionify(text: string, prefix: string): (string | React.ReactElement)[] {
        const words = text.split(/(\s+)/);
        const { fixation } = settings.store;

        return words.map((word, i) => {
            if (i % 2 === 1) return word; // whitespace
            if (!word.length) return word;

            const boldLength = Math.ceil(word.length * fixation);
            const boldPart = word.slice(0, boldLength);
            const restPart = word.slice(boldLength);

            if (!boldPart) return restPart;
            if (!restPart) return <strong key={`${prefix}-${i}`}>{boldPart}</strong>;

            return (
                <React.Fragment key={`${prefix}-${i}`}>
                    <strong>{boldPart}</strong>
                    {restPart}
                </React.Fragment>
            );
        });
    }
});
