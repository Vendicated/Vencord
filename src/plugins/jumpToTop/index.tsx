/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { UpArrowIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { MessageActions } from "@webpack/common";

const ChannelToolbarIcon = findComponentByCodeLazy("tooltipPosition:", '"aria-haspopup":', '"data-jump-section":');

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
            replace: "$1.push($self.renderJumpButton(this.props));"
        }
    }],

    renderJumpButton: ErrorBoundary.wrap(({ channel }: { channel: Channel }) => {
        if (channel.isForumPost()) {
            return null;
        }

        return (
            <ChannelToolbarIcon
                tooltip={getIntlMessage("JUMP_TO_TOP")}
                icon={UpArrowIcon}
                onClick={() => jumpToTop(channel.id)}
            />
        );
    }, { noop: true })
});
