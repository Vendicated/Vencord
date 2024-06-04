/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps } from "@webpack";

const CssFormatCode: string = `body:has(
    div.{sidebar}
        > section
        div.{wrapper}
        div.{actionButtons}
        > button:nth-child(2).{buttonActive}
)
.{messageContent} {
filter: blur(12px);
}

body:has(
    div.{sidebar}
        > section
        div.{wrapper}
        div.{actionButtons}
        > button:nth-child(2).{buttonActive}
)
.{visualMediaItemContainer} {
filter: blur(50px) brightness(0.1);
}

body:has(
    div.{sidebar}
        > section
        div.{wrapper}
        div.{actionButtons}
        > button:nth-child(2).{buttonActive}
)
.{embedWrapper} {
filter: blur(50px);
}

body.vc-dnl-hide-in-streamer-mode:has(.{notice}.{colorStreamerMode})
.{visualMediaItemContainer} {
filter: blur(50px) brightness(0.1);
}

body.vc-dnl-hide-in-streamer-mode:has(.{notice}.{colorStreamerMode})
.{messageContent} {
filter: blur(12px);
}

body.vc-dnl-hide-in-streamer-mode:has(.{notice}.{colorStreamerMode})
.{embedWrapper} {
filter: blur(50px);
}

body.vc-dnl-show-messages .{visualMediaItemContainer} {
filter: blur(0px) brightness(1) !important;
}

body.vc-dnl-show-messages .{messageContent} {
filter: blur(0px) !important;
}

body.vc-dnl-show-messages .{embedWrapper} {
filter: blur(0px) !important;
}

body.vc-dnl-hover-to-view .{messageContent}:hover {
filter: blur(0px) brightness(1) !important;
}

body.vc-dnl-hover-to-view .{embedWrapper}:hover {
filter: blur(0px) brightness(1) !important;
}

body.vc-dnl-hover-to-view .{visualMediaItemContainer}:hover {
filter: blur(0px) brightness(1) !important;
}`;

/*
[
    "sidebar",
    "wrapper",
    "actionButtons",
    "buttonActive",
    "messageContent",
    "visualMediaItemContainer",
    "embedWrapper",
    "notice",
    "colorStreamerMode",
]
*/

export function getStyle(): [string, object] {
    const messageContent = findByProps("messageEditorCompact"); // ["messageContent","wrapper"]
    const embedWrapper = findByProps("embedWrapper");
    const mediaContainer = findByProps("visualMediaItemContainer");
    const notice = findByProps("colorStreamerMode", "notice");
    const actionBar = findByProps("actionButtons", "buttonActive", "wrapper");
    const sidebar = findByProps("sidebar", "panels");
    const Classes = Object.assign(
        {},
        actionBar,
        notice,
        mediaContainer,
        embedWrapper,
        messageContent,
        sidebar
    );
    let CssCode = CssFormatCode;
    for (const className in Classes) {
        CssCode = CssCode.replaceAll(`{${className}}`, Classes[className]);
    }
    return [CssCode, Classes];
}
