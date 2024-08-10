/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Text } from "@webpack/common";
import { ReactNode } from "react";

import ExampleWiggle from "./ui/components/ExampleWiggle";

const settings = definePluginSettings({
    intensity: {
        type: OptionType.SLIDER,
        description: "Animation intensity in px",
        markers: makeRange(1, 10, 1),
        default: 4,
        stickToMarkers: true,
        onChange: () => updateStyles()
    }
});

const dirMap = {
    x: "0.6s wiggle-wavy-x alternate ease-in-out infinite",
    y: "1.2s wiggle-wavy-y linear infinite"
};

const classMap = [
    {
        chars: ["<", ">"],
        className: "wiggle-inner-x",
    },
    {
        chars: ["^", "^"],
        className: "wiggle-inner-y",
    },
    {
        chars: [")", "("],
        className: "wiggle-inner-xy"
    }
];

let styles: HTMLStyleElement;
const updateStyles = () => {
    const inten = Vencord.Settings.plugins.WigglyText.intensity + "px";
    styles.textContent = `
.wiggle-example {
    list-style-type: disc;
    list-style-position: outside;
    margin: 4px 0 0 16px;
}

.wiggle-example li {
    white-space: break-spaces;
    margin-bottom: 4px;
}

.wiggle-inner {
    position: relative;
    top: 0;
    left: 0;

    &.wiggle-inner-x {
        animation: ${dirMap.x};
    }

    &.wiggle-inner-y {
        animation: ${dirMap.y};
    }

    &.wiggle-inner-xy {
        animation: ${dirMap.x}, ${dirMap.y};
    }
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
    name: "WigglyText",
    description: "Adds a new markdown formatting that makes text wiggly.",
    authors: [EquicordDevs.nexpid],
    settings,
    settingsAboutComponent: () => (
        <Text>
            You can make text wiggle with the following:<br />
            <ul className="wiggle-example">
                <li><ExampleWiggle wiggle="x">left and right</ExampleWiggle> by typing <code>&lt;~text~&gt;</code></li>
                <li><ExampleWiggle wiggle="y">up and down</ExampleWiggle> by typing <code>^~text~^</code></li>
                <li><ExampleWiggle wiggle="xy">in a circle</ExampleWiggle> by typing <code>)~text~(</code></li>
            </ul>
        </Text>
    ),

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
        match: (source: string) => classMap.map(({ chars }) => source.match(new RegExp(`^(\\${chars[0]})~([\\s\\S]+?)~(\\${chars[1]})(?!_)`))).find(x => x !== null),
        parse: (
            capture: RegExpMatchArray,
            transform: (...args: any[]) => any,
            state: any
        ) => {
            const className = classMap.find(({ chars }) => chars[0] === capture[1] && chars[1] === capture[3])?.className ?? "";

            return {
                content: transform(capture[2], state),
                className
            };
        },
        react: (
            data: { content: any[]; className: string; },
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
                                    className={`wiggle-inner ${data.className}`}
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
