/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, useEffect, useRef } from "webpack/common/react";

const blockReact = (data, output, className, _) => {
    return (
        <span className={className}>
            {output(data.content)}
        </span>
    );
};

const characterReact = (data, output, className, animLength) => {
    let offset = 0;
    const traverse = raw => {
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

const delayReact = (data, output, className, delay) => {
    let offset = 0;
    const traverse = raw => {
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
                                animationDelay: `${offset++ * delay}ms`,
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

const ShadowDomComponent = ({ children, ...props }) => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (hostRef.current) {
            try {
                const shadowRoot = hostRef.current.shadowRoot || hostRef.current.attachShadow({ mode: "open" });
                shadowRoot.innerHTML = DOMPurify.sanitize(children.__html, { ADD_TAGS: ["style", "link"], FORBID_TAGS: ["video", "audio"] });
            } catch (e) {
                if (!(e instanceof DOMException && e.name === "NotSupportedError")) {
                    console.error(e);
                }
            }
        }
    }, [children.__html]);

    return <span ref={hostRef} {...props}></span>;
};

const HTMLReact = (data, _1, _2, _3) => {
    let trueContent = "";
    for (const child of data.content) {
        try {
            if (child.type === "text") {
                trueContent += child.content;
            }
            if (child.type === "link") {
                trueContent += child.content[0].content;
            }
        } catch (e) {
            console.error(e);
            console.error(data.content);
        }
    }
    return <ShadowDomComponent className="HTMLMessageContent" children={{ __html: trueContent }} />;
};

function escapeRegex(str: string): string {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

const createRule = (name, order, charList, type, animLength = 0) => {
    const regex = new RegExp(`^${escapeRegex(charList[0])}([\\s\\S]+?)${escapeRegex(charList[1])}`);
    const reactFunction =
        type === "block" ? blockReact :
            type === "character" ? characterReact :
                type === "html" ? HTMLReact :
                    type === "delay" ? delayReact :
                        () => {
                            throw new Error(`Unsupported type: ${type}`);
                        };
    const rule = {
        name: name,
        order: order,
        match: source => source.match(regex),
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

span.HTMLMessageContent {
    display: inline-block;
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

.scaling {
    animation: scale 1.2s infinite alternate ease-in-out;
    display: inline-block;
}

@keyframes scale {
    0% { transform: scale(0.8); }
    100% { transform: scale(1.2); }
}

.bouncing {
    display: inline-block;
    animation-name: boing-text;
    animation-duration: 1s;
    animation-iteration-count: infinite;
    animation-timing-function: cubic-bezier(0.075, 0.82, 0.165, 1);
}
@keyframes boing-text {
    0% {
        transform: translateY(-4px);
    }
    50% {
        transform: translateY(4px);
    }
    100% {
        transform: translateY(-4px);
    }
}

.slam {
    display: inline-block;
    transform: translateY(-100px) scale(10);
    animation: slam 0.2s forwards;
    opacity: 0;
}

@keyframes slam {
    0% {
        transform: translateY(-100px) scale(10);
        opacity: 0;
    }
    100% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

.cursive {
    font-family: 'Times New Roman', Times, cursive;
}
}
`;
};

const rules = [
    createRule("wiggly", 24, [")~", "~("], "character", 1200),
    createRule("highlighted", 24, ["==", "=="], "block"),
    createRule("spinning", 24, ["@@", "@@"], "block"),
    createRule("glowing", 24, ["++", "++"], "block"),
    createRule("rainbow", 24, ["%%", "%%"], "character", 2400),
    createRule("scaling", 24, ["+-", "-+"], "character", 2400),
    createRule("bouncing", 24, ["^^", "^^"], "block"),
    createRule("html", 24, ["[[", "]]"], "html"),
    createRule("slam", 24, [">>", "<<"], "delay", 250),
    createRule("cursive", 24, ["&&", "&&"], "block"),
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

declare const DOMPurify: any;

export default definePlugin({
    name: "MoreMarkdown",
    description: "More markdown capabilities for Nexulien",
    nexulien: true,
    authors: [Devs.Zoid, Devs.Jaegerwald, Devs.SwitchedCube],
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

        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.4.0/purify.min.js";
        document.head.appendChild(script);
    },

    stop: () => styles.remove()
});

