/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { ErrorBoundary } from "@components/index";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { FluxDispatcher, Menu, React, UserStore } from "@webpack/common";

const ignoredChannelIds: string[] = [];
const cl = classNameFactory("vc-ignore-calls-");

const ContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!channel || (!channel.isDM() && !channel.isGroupDM())) return;

    const [checked, setChecked] = React.useState(ignoredChannelIds.includes(channel.id));

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuCheckboxItem
            id="ic-ignore-calls"
            label="Ignore Calls"
            checked={checked}
            action={() => {
                if (checked)
                    ignoredChannelIds.includes(channel.id);
                else
                    ignoredChannelIds.push(channel.id);


                setChecked(!checked);
            }}
        ></Menu.MenuCheckboxItem>
    );
};

const settings = definePluginSettings({
    ignoreTimeout: {
        type: OptionType.SLIDER,
        description: "Timeout to click ignore",
        markers: makeRange(0, 10000, 1000),
        default: 5000,
        stickToMarkers: true,
    }
});


export default definePlugin({
    name: "IgnoreCalls",
    description: "Allows you to ignore calls from specific users or dm groups.",
    authors: [EquicordDevs.TheArmagan],
    settings,
    patches: [
        {
            find: "#{intl::INCOMING_CALL_ELLIPSIS}",
            replacement: {
                match: /(?<=channel:(\i).{0,50}INCOMING_CALL_MODAL\).*?\}\)\]\}\))\]/,
                replace: ",$self.renderIgnore($1)]"
            }
        }
    ],
    contextMenus: {
        "user-context": ContextMenuPatch,
        "gdm-context": ContextMenuPatch,
    },
    flux: {
        async CALL_UPDATE({ channelId, ringing, messageId, region }: { channelId: string; ringing: string[]; messageId: string; region: string; }) {
            setTimeout(() => {
                if (!ignoredChannelIds.includes(channelId)) return;
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
        return (
            <ErrorBoundary>
                <span
                    className={cl("render")}
                    onClick={() => ignoredChannelIds.push(channel.id)}
                >
                    Ignore
                </span>
            </ErrorBoundary >
        );
    }
});
