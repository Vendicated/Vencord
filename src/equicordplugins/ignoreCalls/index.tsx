/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { ErrorBoundary } from "@components/index";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { FluxDispatcher, Menu, React, UserStore } from "@webpack/common";

const ignoredChannelIds = new Set<string>();
const cl = classNameFactory("vc-ignore-calls-");

const ContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!channel || (!channel.isDM() && !channel.isGroupDM())) return;

    const permanentlyIgnoredUsers = settings.store.permanentlyIgnoredUsers.split(",").map(s => s.trim()).filter(Boolean);

    const [tempChecked, setTempChecked] = React.useState(ignoredChannelIds.has(channel.id));
    const [permChecked, setPermChecked] = React.useState(permanentlyIgnoredUsers.includes(channel.id));

    children.push(
        <>
            <Menu.MenuSeparator />
            <Menu.MenuCheckboxItem
                id="vc-ignore-calls-temp"
                label="Temporarily Ignore Calls"
                checked={tempChecked}
                action={() => {
                    if (tempChecked)
                        ignoredChannelIds.delete(channel.id);
                    else
                        ignoredChannelIds.add(channel.id);

                    setTempChecked(!tempChecked);
                }}
            />
            <Menu.MenuCheckboxItem
                id="vc-ignore-calls-perm"
                label="Permanently Ignore Calls"
                checked={permChecked}
                action={() => {
                    let updated = permanentlyIgnoredUsers.slice();
                    if (permChecked) {
                        updated = updated.filter(id => id !== channel.id);
                    } else {
                        updated.push(channel.id);
                    }
                    settings.store.permanentlyIgnoredUsers = updated.join(", ");

                    setPermChecked(!permChecked);
                }}
            />
        </>
    );
};


const settings = definePluginSettings({
    permanentlyIgnoredUsers: {
        type: OptionType.STRING,
        description: "User IDs (comma + space) who should be permanetly ignored",
        restartNeeded: true,
        default: "",
    },
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
            const permanentlyIgnoredUsers = settings.store.permanentlyIgnoredUsers.split(",").map(s => s.trim()).filter(Boolean);
            setTimeout(() => {
                if (!ignoredChannelIds.has(channelId) && !permanentlyIgnoredUsers.includes(channelId)) return;
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
            }, 30000);
        }
    },
    renderIgnore(channel) {
        return (
            <ErrorBoundary>
                <span
                    className={cl("render")}
                    onClick={() => ignoredChannelIds.add(channel.id)}
                >
                    Ignore
                </span>
            </ErrorBoundary >
        );
    }
});
