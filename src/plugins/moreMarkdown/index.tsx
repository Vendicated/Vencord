/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ReactNode } from "react";

const dirMap = {
    x: "0.6s wiggle-wavy-x alternate ease-in-out infinite",
    y: "1.2s wiggle-wavy-y linear infinite"
};

let styles: HTMLStyleElement;
const updateStyles = () => {
    const inten = "4px";
    const dir = "xy";
    styles.textContent = `
        .wiggly-inner {
            animation: ${dir.split("").map(dir => dirMap[dir]).join(", ")};
            position: relative;
            top: 0;
            left: 0;
        }

        @keyframes wiggle-wavy-x {
            from {
                left: -${inten};
            }

            to {
                left: ${inten};
            }
        }

        @keyframes wiggle-wavy-y {
            0% {
                top: 0;
                animation-timing-function: ease-out;
            }

            25% {
                top: -${inten};
                animation-timing-function: ease-in;
            }

            50% {
                top: 0;
                animation-timing-function: ease-out;
            }

            75% {
                top: ${inten};
                animation-timing-function: ease-in;
            }
        }`;
};

export default definePlugin({
    name: "MoreMarkdown",
    description: "Adds more features to markdown",
    authors: [Devs.Zoid],
    required: true,

    patches: [
        {
            find: "parseToAST:",
            replacement: {
                match: /(parse[\w]*):(.*?)\((\i)\),/g,
                replace: "$1:$2({...$3,wiggly:$self.wigglyRule}),",
            },
        },
    ],

    wigglyRule: {
        order: 24,
        match: (source: string) => source.match(/^~([\s\S]+?)~(?!_)/),
        parse: (
            capture: RegExpMatchArray,
            transform: (...args: any[]) => any,
            state: any
        ) => ({
            content: transform(capture[1], state),
        }),
        react: (
            data: { content: any[]; },
            output: (...args: any[]) => ReactNode[]
        ) => {
            let offset = 0;
            const traverse = (raw: any) => {
                const children = !Array.isArray(raw) ? [raw] : raw;
                let modified = false;

                let j = -1;
                for (const child of children) {
                    j++;
                    if (typeof child === "string") {
                        modified = true;
                        children[j] = child.split("").map((x, i) => (
                            <span key={i}>
                                <span
                                    className="wiggly-inner"
                                    style={{
                                        animationDelay: `${((offset++) * 25) % 1200}ms`,
                                    }}
                                >
                                    {x}
                                </span>
                            </span>
                        ));
                    } else if (child?.props?.children)
                        child.props.children = traverse(child.props.children);
                }

                return modified ? children : raw;
            };

            return traverse(output(data.content));
        },
    },

    start: () => {
        styles = document.createElement("style");
        styles.id = "WigglyText";
        document.head.appendChild(styles);

        updateStyles();
    },

    stop: () => styles.remove()
});
