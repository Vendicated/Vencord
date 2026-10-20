/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { MessageActions, SelectedChannelStore } from "@webpack/common";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

function jumpToTop(channelId: string) {
    MessageActions.jumpToMessage({
        channelId,
        messageId: channelId,
        flash: false,
        jumpType: "INSTANT"
    });
}

// arrow-up-to-line (in the code as "UpArrowIcon") from Lucide (https://lucide.dev), ISC license
function UpArrowIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h14"/><path d="m18 13-6-6-6 6"/><path d="M12 7v14"/></svg>
    );
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

    jumpButton() {
        return (
            <ErrorBoundary key="vc-jump-to-top" noop>
                <HeaderBarIcon
                    tooltip="Jump to top"
                    icon={UpArrowIcon}
                    onClick={() => jumpToTop(SelectedChannelStore.getChannelId())}
                />
            </ErrorBoundary>
        );
    }

});
