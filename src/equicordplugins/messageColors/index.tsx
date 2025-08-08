/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { React } from "@webpack/common";
import type { ReactElement } from "react";

import { BlockDisplayType, ColorType, regex, RenderType, replaceRegexp, settings } from "./constants";

interface ParsedColorInfo {
    type: "color";
    color: string;
    colorType: ColorType;
    text: string;
}

const requiredFirstCharacters = ["r", "h", "#"].flatMap(v => [v, v.toUpperCase()]);

export default definePlugin({
    authors: [EquicordDevs.Hen],
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
                replace: "color:$self.getColor($1),$&"
            }
        },
        // Changes text md rule regex, so it stops right before hsl( | rgb(
        // Without it discord will try to pass a string without those to color rule
        {
            find: ".defaultRules.text)",
            group: true,
            replacement: {
                // $)/)
                match: /\$\)\//,
                // hsl(|rgb(|$&
                replace: requiredFirstCharacters.join("|") + "|$&"
            }
        },
        // Fix the issue with [#123](https://example.com) rendered as plain text
        {
            find: "parseInlineCodeChildContent:",
            replacement: {
                match: /parseInlineCodeChildContent:/,
                replace: "isInsideOfLink:true,$&"
            }
        },
        // Discord just requires it to be here
        // Or it explodes (bad)
        {
            find: "Unknown markdown rule:",
            group: true,
            replacement: {
                match: /roleMention:{type:/,
                replace: "color:{type:\"inlineObject\"},$&",
            }
        },
    ],
    start() {
        const amount = settings.store.enableShortHexCodes ? "{1,2}" : "{2}";
        regex.push({
            reg: new RegExp("#(?:[0-9a-fA-F]{3})" + amount, "g"),
            type: ColorType.HEX
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
            parse(matchedContent: RegExpExecArray, _, parseProps: Record<string, any>):
                ParsedColorInfo | ({ type: "text", content: string; }) {
                // This check makes sure that it doesn't try to parse color
                // When typing/editing message
                //
                // Discord doesn't know how to deal with color and crashes
                if (!parseProps.messageId || parseProps.isInsideOfLink) return {
                    type: "text",
                    content: matchedContent[0]
                };

                const content = matchedContent[0];
                try {
                    const type = getColorType(content);

                    return {
                        type: "color",
                        colorType: type,
                        color: parseColor(content, type),
                        text: content
                    };
                } catch (e) {
                    console.error(e);
                    return {
                        type: "text",
                        content: matchedContent[0]
                    };
                }
            },
            react: ErrorBoundary.wrap(({ text, colorType, color }: ParsedColorInfo) => {
                if (settings.store.renderType === RenderType.FOREGROUND) {
                    return <span style={{ color: color }}>{text}</span>;
                }
                const styles = {
                    "--color": color
                } as React.CSSProperties;

                if (settings.store.renderType === RenderType.BACKGROUND) {
                    const isDark = isColorDark(color, colorType);
                    const className = `vc-color-bg ${!isDark ? "vc-color-bg-invert" : ""}`;
                    return <span className={className} style={styles}>{text}</span>;
                }

                // Only block display left
                const margin = "2px";

                switch (settings.store.blockView) {
                    case BlockDisplayType.LEFT:
                        styles.marginRight = margin;
                        return <><span className="vc-color-block" style={styles} />{text}</>;

                    case BlockDisplayType.RIGHT:
                        styles.marginLeft = margin;
                        return <>{text}<span className="vc-color-block" style={styles} /></>;

                    case BlockDisplayType.BOTH:
                        styles.marginLeft = margin;
                        styles.marginRight = margin;
                        return <>
                            <span className="vc-color-block" style={styles} />
                            {text}
                            <span className="vc-color-block" style={styles} />
                        </>;
                }
            }, {
                fallback: data => {
                    const child = data.children as ReactElement<any>;
                    return <>{child.props?.text}</>;
                }
            })
        };
    }
});

// https://en.wikipedia.org/wiki/Relative_luminance
const calcRGBLightness = (r: number, g: number, b: number) => {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const isColorDark = (color: string, type: ColorType): boolean => {
    const border = 115;
    switch (type) {
        case ColorType.RGBA:
        case ColorType.RGB: {
            const match = color.match(/\d+/g)!;
            const lightness = calcRGBLightness(+match[0], +match[1], +match[2]);
            return lightness < border;
        }
        case ColorType.HEX: {
            color = color.substring(1);
            if (color.length === 3) {
                color = color.split("").flatMap(v => [v, v]).join("");
            }

            const rgb = parseInt(color, 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;

            const lightness = calcRGBLightness(r, g, b);
            return lightness < border;
        }
        case ColorType.HSL: {
            const match = color.match(/\d+/g)!;
            const lightness = +match[2];
            return lightness < (border / 255 * 100);
        }
    }
};

const getColorType = (color: string): ColorType => {
    color = color.toLowerCase().trim();
    if (color.startsWith("#")) return ColorType.HEX;
    if (color.startsWith("hsl")) return ColorType.HSL;
    if (color.startsWith("rgba")) return ColorType.RGBA;
    if (color.startsWith("rgb")) return ColorType.RGB;

    throw new Error(`Can't resolve color type of ${color}`);
};

function parseColor(str: string, type: ColorType): string {
    str = str.toLowerCase().trim().replaceAll(/(\s|,)+/g, " ");
    switch (type) {
        case ColorType.RGB:
            return str;
        case ColorType.RGBA:
            if (!str.includes("/"))
                return str.replaceAll(replaceRegexp(/\f(?=\s*?\))/.source), "/$&");
            return str;
        case ColorType.HEX:
            return str[0] === "#" ? str : `#${str}`;
        case ColorType.HSL:
            return str.replace("°", "");
    }
}
