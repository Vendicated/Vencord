/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const blockReact = (data, output, className, _) => {
    return (
        <span className={className}>
            {output(data.content)}
        </span>
    );
};

const characterReact = (data, output, className, animLength) => {
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
                                animationDelay: `-${((offset++) * animLength / 48) % animLength}ms`,
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

const HTMLReact = (data, _1, _2, _3) => {
    let trueContent = "";
    for (const child of data.content) {
        try {
            if (child.type === "text") {
                trueContent += child.content
                    .replace(/<script/g, "&lt;script")
                    .replace(/<style/g, "&lt;style")
                    .replace(/<iframe/g, "&lt;iframe")
                    .replace(/<embed/g, "&lt;embed")
                    .replace(/<object/g, "&lt;object")
                    .replace(/<applet/g, "&lt;applet")
                    .replace(/<meta/g, "&lt;meta");
            }
            if (child.type === "link") {
                trueContent += child.content[0].content;
            }
        } catch (e) {
            console.error(e);
            console.error(data.content);
        }
    }
    return <div dangerouslySetInnerHTML={{ __html: trueContent }} />;
};

function escapeRegex(str: string): string {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const createRule = (name, order, charList, type, animLength = 0) => {
    const regex = new RegExp(`^${escapeRegex(charList[0])}([\\s\\S]+?)${escapeRegex(charList[1])}`);
    const reactFunction =
        type === "block" ? blockReact :
            type === "character" ? characterReact :
                type === "html" ? HTMLReact :
                    () => {
                        throw new Error(`Unsupported type: ${type}`);
                    };
    const rule = {
        name: name,
        order: order,
        match: (source) => source.match(regex),
        parse: (capture, transform, state) => ({
            content: transform(capture[1], state)
        }),
        react: (data, output) => reactFunction(data, output, name, animLength),
    };
    return rule;
};

let styles: HTMLStyleElement;
const updateStyles = () => {
    styles.textContent = `

[class*="messageContent"] {
    overflow: visible !important;
}

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

.glowing {
    animation: glow 1s infinite alternate;
}

@keyframes glow {
    0% { text-shadow: 0 0 3px #fff; }
    100% { text-shadow: 0 0 6px #fff; }
}

.rainbow {
    animation: rainbow 1.2s linear infinite alternate;
}

@keyframes rainbow {
    0% { color: red; }
    20% { color: yellow; }
    40% { color: green; }
    60% { color: cyan; }
    80% { color: blue; }
    100% { color: magenta; }
}

.blinking {
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

.scaling {
    animation: scale 1.2s infinite alternate ease-in-out;
    display: inline-block;
}

@keyframes scale {
    0% { transform: scale(0.8); }
    100% { transform: scale(1.2); }
}

.bouncing {
    animation: bounce 1s infinite alternate ease-in-out;
    display: inline-block;
}

@keyframes bounce {
    0% { transform: translateY(-5px) }
    100% { transform: translateY(5px) }
}
`;
};

const rules = [
    createRule("wiggly", 24, [")~", "~("], "character", 1200),
    createRule("highlighted", 24, ["==", "=="], "block"),
    createRule("spinning", 24, ["@@", "@@"], "block"),
    createRule("glowing", 24, ["++", "++"], "block"),
    createRule("rainbow", 24, ["%%", "%%"], "character", 2400),
    createRule("blinking", 24, ["--", "--"], "block"),
    createRule("scaling", 24, ["+-", "-+"], "character", 2400),
    createRule("bouncing", 24, ["^^", "^^"], "block"),
    createRule("html", 24, ["{{", "}}"], "html"),
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

