/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MessagePopoverAPI",
    description: "API to add buttons to message popovers.",
    authors: [Devs.KingFish, Devs.Ven, Devs.Nuckyz],
    patches: [{
        find: "Messages.MESSAGE_UTILITIES_A11Y_LABEL",
        replacement: {
            // foo && !bar ? createElement(reactionStuffs)... createElement(blah,...makeElement(reply-other))
            match: /\i&&!\i\?\(0,\i\.jsxs?\)\(.{0,200}renderEmojiPicker:.{0,500}\?(\i)\(\{key:"reply-other"/,
            replace: (m, makeElement) => {
                const msg = m.match(/message:(.{1,3}),/)?.[1];
                if (!msg) throw new Error("Could not find message variable");
                return `...Vencord.Api.MessagePopover._buildPopoverElements(${msg},${makeElement}),${m}`;
            }
        }
    }],
});
