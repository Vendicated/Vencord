/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, Menu, React, UserStore } from "@webpack/common";
import { Channel } from "discord-types/general";

const ignoredChannelIds = new Set<string>();

const ContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!channel || (!channel.isDM() && !channel.isGroupDM())) return;

    const [checked, setChecked] = React.useState(ignoredChannelIds.has(channel.id));

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuCheckboxItem
            id="ic-ignore-calls"
            label="Ignore Calls"
            checked={checked}
            action={() => {
                if (checked)
                    ignoredChannelIds.delete(channel.id);
                else
                    ignoredChannelIds.add(channel.id);


                setChecked(!checked);
            }}
        ></Menu.MenuCheckboxItem>
    );
};

const settings = definePluginSettings({
    ignoreTimeout: {
        type: OptionType.SLIDER,
        description: "Timeout to click ignore",
        markers: [0, 1000, 2000, 2500, 5000, 10000],
        default: 2500,
        stickToMarkers: false,
    }
});


export default definePlugin({
    name: "IgnoreCalls",
    description: "Allows you to ignore calls from specific users or dm groups.",
    authors: [EquicordDevs.TheArmagan],
    patches: [
        {
            find: "#{intl::INCOMING_CALL_ELLIPSIS}",
            replacement: {
                match: /(?<=channel:(\i).{0,50}INCOMING_CALL_MODAL\).*?\}\)\]\}\))\]/,
                replace: ",$self.renderIgnore($1)]"
            }
        }
    ],
    settings,
    flux: {
        async CALL_UPDATE({ channelId, ringing, messageId, region }: { channelId: string; ringing: string[]; messageId: string; region: string; }) {
            setTimeout(() => {
                if (!ignoredChannelIds.has(channelId)) return;
                const currentUserId = UserStore.getCurrentUser().id;
                if (ringing.includes(currentUserId)) {
                    return FluxDispatcher.dispatch({
                        type: "CALL_UPDATE",
                        channelId,
                        ringing: ringing.filter((id: string) => id !== currentUserId),
                        messageId,
                        region
                    });
                }
            }, settings.store.ignoreTimeout);
        }
    },
    renderIgnore(channel) {
        const handeClick = () => {
            ignoredChannelIds.add(channel.id);
        };
        return (
            <ErrorBoundary>
                <span onClick={handeClick} style={{ textAlign: "center", color: "var(--text-danger)" }}>Ignore</span>
            </ErrorBoundary >
        );
    },
    contextMenus: {
        "user-context": ContextMenuPatch,
        "gdm-context": ContextMenuPatch,
    }
});
