/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent } from "@utils/types";
import { React } from "@webpack/common";

import { handleSmartPaste } from "./pasteHandler";
import { settings } from "./settings";

const SmartPasteIcon: IconComponent = ({ height = 20, width = 20, className }) => React.createElement(
    "svg",
    {
        width,
        height,
        viewBox: "0 0 24 24",
        className,
        style: { scale: "1.15" }
    },
    React.createElement("path", {
        fill: "currentColor",
        d: "M7 3a2 2 0 0 0-2 2v10h2V5h10V3H7Zm2 4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H9Zm0 2h10v10H9V9Zm2 2v2h6v-2h-6Zm0 4v2h4v-2h-4Z"
    })
);

const SmartPasteDisabledIcon: IconComponent = ({ height = 20, width = 20, className }) => React.createElement(
    "svg",
    {
        width,
        height,
        viewBox: "0 0 24 24",
        className,
        style: { scale: "1.15" }
    },
    React.createElement("path", {
        fill: "currentColor",
        d: "M7 3a2 2 0 0 0-2 2v10h2V5h10V3H7Zm2 4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H9Zm0 2h10v10H9V9Zm10.5 8.5-1.414 1.414L6.086 7.914 7.5 6.5 19.5 18.5Z"
    })
);

const SmartPasteToggle: ChatBarButtonFactory = ({ isAnyChat }) => {
    const { enabled } = settings.use(["enabled"]);

    if (!isAnyChat) return null;

    return React.createElement(
        ChatBarButton as any,
        {
            tooltip: enabled ? "Disable SmartPaste" : "Enable SmartPaste",
            onClick: () => settings.store.enabled = !enabled,
        },
        enabled ? React.createElement(SmartPasteIcon) : React.createElement(SmartPasteDisabledIcon)
    );
};

export default definePlugin({
    name: "SmartPaste",
    description: "Attempts to automatically wrap pasted code in fenced Markdown code blocks",
    tags: ["Chat", "Utility"],
    authors: [Devs.luckfiel],
    settings,

    chatBarButton: {
        icon: SmartPasteIcon,
        render: SmartPasteToggle
    },

    start() {
        document.addEventListener("paste", handleSmartPaste, true);
    },

    stop() {
        document.removeEventListener("paste", handleSmartPaste, true);
    },
});
