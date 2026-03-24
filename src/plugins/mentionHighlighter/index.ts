/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ColorPicker, React } from "@webpack/common";

const logger = new Logger("MentionHighlighter");

const settings = definePluginSettings({
    highlightColor: {
        type: OptionType.COMPONENT,
        default: "#ff6100",
        name: "Highlight Color",
        description: "The color to highlight your own mentions with",
        component: ({ setValue }) => React.createElement(ColorPicker, {
            color: parseInt(settings.store.highlightColor.replace("#", ""), 16),
            onChange: (v: number) => {
                const hex = `#${v.toString(16).padStart(6, "0")}`;
                setValue(hex);
                document.body.style.setProperty("--mention-highlighter-color", hex);
            }
        })
    },
    removeBackground: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Remove standard yellow background for mentioned messages",
        onChange: v => {
            if (v) document.body.classList.add("vc-mention-highlighter-remove-background");
            else document.body.classList.remove("vc-mention-highlighter-remove-background");
        }
    },
    glowEnabled: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Add a glow effect to mentioned messages",
        onChange: v => {
            if (v) document.body.classList.add("vc-mention-highlighter-glow");
            else document.body.classList.remove("vc-mention-highlighter-glow");
        }
    }
});

export default definePlugin({
    name: "MentionHighlighter",
    description: "Highlights mentions of yourself more prominently within messages",
    authors: [Devs.reese],
    settings,

    start() {
        document.body.style.setProperty("--mention-highlighter-color", settings.store.highlightColor);
        if (settings.store.removeBackground) {
            document.body.classList.add("vc-mention-highlighter-remove-background");
        }
        if (settings.store.glowEnabled) {
            document.body.classList.add("vc-mention-highlighter-glow");
        }
    },

    stop() {
        document.body.style.removeProperty("--mention-highlighter-color");
        document.body.classList.remove("vc-mention-highlighter-remove-background");
        document.body.classList.remove("vc-mention-highlighter-glow");
    },

    patches: [
        {
            find: "isCurrentUser",
            replacement: {
                match: /className:([\w$]+)\.mention/,
                replace: "className:$self.processMentionProps($1, $1.mention)"
            }
        }
    ],

    processMentionProps(props: any, originalClass: string) {
        try {
            if (props.isCurrentUser) {
                return `${originalClass} vc-mention-highlighter`;
            }
        } catch (e) {
            logger.error("Error processing mention props", e);
        }
        return originalClass;
    }
});
