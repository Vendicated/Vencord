/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { parse } from "path";
import { ReactNode } from "react";

const blockReact = (data, output, className) => {
    return (
        <span className={className}>
            {output(data.content)}
        </span>
    );
};

const characterReact = (data, output, className) => {
    let offset = 0;
    const traverse = (raw) => {
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
                            className={className}
                            style={{
                                animationDelay: `${((offset++) * 25) % 1200}ms`,
                            }}
                        >
                            {x}
                        </span>
                    </span>
                ));
            } else if (child?.props?.children) {
                child.props.children = traverse(child.props.children);
            }
        }

        return modified ? children : raw;
    };

    return traverse(output(data.content));
};

function escapeRegex(str: string): string {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const createRule = (name, order, charList, className, type) => {
    const regex = new RegExp(`^${escapeRegex(charList[0])}([\\s\\S]+?)${escapeRegex(charList[1])}`);
    const reactFunction = type === "block" ? blockReact : characterReact;
    const rule = {
        name: name,
        order: order,
        match: (source) => source.match(regex),
        parse: (capture, transform, state) => ({
            content: transform(capture[1], state)
        }),
        react: (data, output) => reactFunction(data, output, className),
    };
    return rule;
};

let styles: HTMLStyleElement;
const updateStyles = () => {
    styles.textContent = `
.wiggly {
    position: relative;
    top: 0;
    left: 0;
    animation: 0.6s wiggle-x alternate ease-in-out infinite, 1.2s wiggle-y linear infinite;
}

@keyframes wiggle-x {
    from {
        left: -5px;
    }

    to {
        left: 5px;
    }
}

@keyframes wiggle-y {
    0% {
        top: 0px;
        animation-timing-function: ease-out;
    }

    25% {
        top: -5px;
        animation-timing-function: ease-in;
    }

    50% {
        top: 0px;
        animation-timing-function: ease-out;
    }

    75% {
        top: 5px;
        animation-timing-function: ease-in;
    }
}

.highlighted {
    background-color: white;
    color: black;
}

.spinning {
    animation: spin 2s linear infinite;
    display: inline-block;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
};

const rules = [
    createRule("wiggly", 24, [")~", "~("], "wiggly", "character"),
    createRule("highlighted", 24, ["==", "=="], "highlighted", "block"),
    createRule("spinning", 24, ["@@", "@@"], "spinning", "block"),
];

const rulesByName = {};
rules.forEach(rule => {
    rulesByName[rule.name] = rule;
});

let patch = "";
rules.forEach(rule => {
    patch += `${rule.name}:$self.rulesByName["${rule.name}"],`;
});
console.info("Patch: " + patch);

export default definePlugin({
    name: "MoreMarkdown",
    description: "More markdown capabilities for Zoidcord",
    authors: [Devs.Zoid],
    required: true,
    rulesByName: rulesByName,

    patches: [
        {
            find: "parseToAST:",
            replacement: {
                match: /(parse[\w]*):(.*?)\((\i)\),/g,
                replace: `$1:$2({...$3,${patch}}),`,
            },
        },
    ],
    start: () => {
        styles = document.createElement("style");
        styles.id = "moreMarkdownStyles";
        document.head.appendChild(styles);

        updateStyles();
        console.log(patch);
    },

    stop: () => styles.remove()
});

