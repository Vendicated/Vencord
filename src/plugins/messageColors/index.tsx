/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { React } from "@webpack/common";
import type { ReactElement } from "react";

import {
    BlockDisplayType,
    ColorType,
    regex,
    RenderType,
    replaceRegexp,
    settings,
} from "./constants";

interface ParsedColorInfo {
    type: "color";
    color: string;
    text: string;
}

const requiredFirstCharacters = ["r", "h", "#"].flatMap(v => [
    v,
    v.toUpperCase(),
]);

export default definePlugin({
    authors: [Devs.hen],
    name: "MessageColors",
    description: "Displays color codes like #FF0042 inside of messages",
    settings,
    patches: [
        // Create a new markdown rule, so it parses just like any other features
        // Like bolding, spoilers, mentions, etc
        {
            find: "roleMention:{order:",
            group: true,
            replacement: {
                match: /roleMention:\{order:(\i\.\i\.order)/,
                replace: "color:$self.getColor($1),$&",
            },
        },
        // Changes text md rule regex, so it stops right before hsl( | rgb(
        // Without it discord will try to pass a string without those to color rule
        {
            find: ".defaultRules.text,match:",
            group: true,
            replacement: {
                // $)/)
                match: /\$\)\//,
                // hsl(|rgb(|$&
                replace: requiredFirstCharacters.join("|") + "|$&",
            },
        },
        // Fix the issue with [#123](https://example.com) rendered as plain text
        {
            find: "parseInlineCodeChildContent:",
            replacement: {
                match: /parseInlineCodeChildContent:/,
                replace: "isInsideOfLink:true,$&",
            },
        },
        // Discord just requires it to be here
        // Or it explodes (bad)
        {
            find: "Unknown markdown rule:",
            group: true,
            replacement: {
                match: /roleMention:{type:/,
                replace: 'color:{type:"inlineObject"},$&',
            },
        },
    ],
    start() {
        // We have to know that setting on startup, so it's omited from consts
        const amount = settings.store.enableShortHexCodes ? "{1,2}" : "{2}";
        regex.push({
            reg: new RegExp("#(?:[0-9a-fA-F]{3})" + amount, "g"),
            type: ColorType.HEX,
        });
    },
    // Needed to load all regex before patching
    startAt: StartAt.Init,
    getColor(order: number) {
        const source = regex.map(r => r.reg.source).join("|");
        const matchAllRegExp = new RegExp(`^(${source})`, "i");
        return {
            order,
            // Don't even try to match if the message chunk doesn't start with...
            requiredFirstCharacters,
            // Match -> Parse -> React
            // Result of previous action is dropped as a first argument of the next one
            match(content: string) {
                return matchAllRegExp.exec(content);
            },
            parse(
                matchedContent: RegExpExecArray,
                _,
                parseProps: Record<string, any>,
            ): ParsedColorInfo | { type: "text"; content: string } {
                // This check makes sure that it doesn't try to parse color
                // When typing/editing message
                //
                // Discord doesn't know how to deal with color and crashes
                if (!parseProps.messageId || parseProps.isInsideOfLink)
                    return {
                        type: "text",
                        content: matchedContent[0],
                    };

                const content = matchedContent[0];
                try {
                    const type = getColorType(content);

                    return {
                        type: "color",
                        color: parseColor(content, type),
                        text: content,
                    };
                } catch (e) {
                    console.error(e);
                    return {
                        type: "text",
                        content: matchedContent[0],
                    };
                }
            },
            react: ErrorBoundary.wrap(
                ({ text, color }: ParsedColorInfo) => {
                    if (settings.store.renderType === RenderType.FOREGROUND) {
                        return <span style={{ color: color }}>{text}</span>;
                    }
                    const styles = {
                        "--color": color,
                    } as React.CSSProperties;

                    if (settings.store.renderType === RenderType.BACKGROUND) {
                        const className = "vc-color-bg";
                        return (
                            <span className={className} style={styles}>
                                <span>{text}</span>
                            </span>
                        );
                    }

                    // Only block display left
                    const margin = "2px";

                    switch (settings.store.blockView) {
                        case BlockDisplayType.LEFT:
                            styles.marginRight = margin;
                            return (
                                <>
                                    <span
                                        className="vc-color-block"
                                        style={styles}
                                    />
                                    {text}
                                </>
                            );

                        case BlockDisplayType.RIGHT:
                            styles.marginLeft = margin;
                            return (
                                <>
                                    {text}
                                    <span
                                        className="vc-color-block"
                                        style={styles}
                                    />
                                </>
                            );

                        case BlockDisplayType.BOTH:
                            styles.marginLeft = margin;
                            styles.marginRight = margin;
                            return (
                                <>
                                    <span
                                        className="vc-color-block"
                                        style={styles}
                                    />
                                    {text}
                                    <span
                                        className="vc-color-block"
                                        style={styles}
                                    />
                                </>
                            );
                    }
                },
                {
                    fallback: data => {
                        const child = data.children as ReactElement<any>;
                        return <>{child.props?.text}</>;
                    },
                },
            ),
        };
    },
});

const getColorType = (color: string): ColorType => {
    color = color.toLowerCase().trim();
    if (color.startsWith("#")) return ColorType.HEX;
    if (color.startsWith("hsl")) return ColorType.HSL;
    if (color.startsWith("rgba")) return ColorType.RGBA;
    if (color.startsWith("rgb")) return ColorType.RGB;

    throw new Error(`Can't resolve color type of ${color}`);
};

function parseColor(str: string, type: ColorType): string {
    str = str
        .toLowerCase()
        .trim()
        .replaceAll(/(\s|,)+/g, " ");
    switch (type) {
        case ColorType.RGB:
            return str;
        case ColorType.RGBA:
            if (!str.includes("/"))
                return str.replaceAll(
                    replaceRegexp(/\f(?=\s*?\))/.source),
                    "/$&",
                );
            return str;
        case ColorType.HEX:
            return str[0] === "#" ? str : `#${str}`;
        case ColorType.HSL:
            return str.replace("°", "");
    }
}
