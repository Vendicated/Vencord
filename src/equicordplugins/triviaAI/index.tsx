/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { IconComponent } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findExportedComponentLazy } from "@webpack";
import { ChannelStore, Menu } from "@webpack/common";

import { settings } from "./settings";
import { getResponse, handleResponse, parseMessageContent } from "./utils";

const RobotIconLazy = findExportedComponentLazy("RobotIcon");
const RobotIcon: IconComponent = props => <RobotIconLazy {...props} />;

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const payload = parseMessageContent(message);
    if (!payload) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-trivia-ai"
            label="Answer With AI"
            icon={RobotIcon}
            action={async () => {
                const ans = await getResponse(payload);
                handleResponse(message, ans);
            }}
        />
    ));
};

export default definePlugin({
    name: "TriviaAI",
    description: "A plugin that helps you answer trivia questions using AI.",
    authors: [EquicordDevs.yash],
    settings,
    contextMenus: {
        "message": messageCtxPatch
    },
    messagePopoverButton: {
        icon: RobotIcon,
        render(message: Message) {
            const payload = parseMessageContent(message);
            if (!payload) return null;

            return {
                label: "Answer With AI",
                icon: RobotIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const ans = await getResponse(payload);
                    handleResponse(message, ans);
                }
            };
        }
    }
});
