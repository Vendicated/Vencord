/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { MessageActions, SelectedChannelStore } from "@webpack/common";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');
const UpArrowIcon = findComponentByCodeLazy("L11 6.42V20a1 1 0 1 0 2 0V6.41");

function jumpToTop(channelId: string) {
    MessageActions.jumpToMessage({
        channelId,
        messageId: channelId,
        flash: false,
        jumpType: "INSTANT"
    });
}

export default definePlugin({
    name: "JumpToTop",
    description: "Adds a button to jump to the first message in a channel",
    authors: [Devs.Kaerion],
    tags: ["Chat", "Utility"],

    patches: [{
        find: "Missing channel in Channel.renderHeaderToolbar",
        replacement: {
            match: /(?<=renderHeaderToolbar"\);let (\i)=\[\];)/,
            replace: "$1.push($self.jumpButton());"
        }
    }],

    jumpButton: ErrorBoundary.wrap(() => (
        <HeaderBarIcon
            tooltip={getIntlMessage("JUMP_TO_TOP")}
            icon={UpArrowIcon}
            onClick={() => jumpToTop(SelectedChannelStore.getChannelId())}
        />
    ), { noop: true })

});
