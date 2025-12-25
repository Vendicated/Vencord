/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { ErrorBoundary } from "@components/index";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Menu, React, Tooltip, UserStore } from "@webpack/common";

const ignoredChannelIds = new Set<string>();
const cl = classNameFactory("vc-ignore-calls-");
const Deafen = findComponentByCodeLazy("0-1.02-.1H3.05a9");

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

const args = {
    ringing: [],
    messageId: "",
    region: "",
};

export default definePlugin({
    name: "IgnoreCalls",
    description: "Allows you to ignore calls from specific users or dm groups.",
    authors: [EquicordDevs.TheArmagan, Devs.thororen],
    settings,
    patches: [
        {
            find: "#{intl::INCOMING_CALL_ELLIPSIS}",
            replacement: {
                match: /actionButton\}\)/,
                replace: "$&,$self.renderIgnore(arguments[0].channel)"
            }
        }
    ],
    contextMenus: {
        "user-context": ContextMenuPatch,
        "gdm-context": ContextMenuPatch,
    },
    flux: {
        async CALL_UPDATE({ ringing, messageId, region }) {
            args.ringing = ringing;
            args.messageId = messageId;
            args.region = region;
        }
    },
    renderIgnore(channel) {
        const currentUserId = UserStore.getCurrentUser().id;
        const permanentlyIgnoredUsers = settings.store.permanentlyIgnoredUsers.split(",").map(s => s.trim()).filter(Boolean);
        if (ignoredChannelIds.has(channel.id) || permanentlyIgnoredUsers.includes(channel.id)) {
            FluxDispatcher.dispatch({
                type: "CALL_UPDATE",
                channelId: channel.id,
                ringing: args.ringing.filter((id: string) => id !== currentUserId),
                messageId: args.messageId,
                region: args.region
            });
            return null;
        }

        return (
            <ErrorBoundary>
                <Tooltip text="Ignore">
                    {({ onMouseEnter, onMouseLeave }) => (
                        <Button
                            className={cl("button")}
                            size="small"
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onClick={() => {
                                FluxDispatcher.dispatch({
                                    type: "CALL_UPDATE",
                                    channelId: channel.id,
                                    ringing: args.ringing.filter((id: string) => id !== currentUserId),
                                    messageId: args.messageId,
                                    region: args.region
                                });
                            }}
                        >
                            <Deafen color={"var(--interactive-icon-active)"} />
                        </Button>
                    )}
                </Tooltip>
            </ErrorBoundary >
        );
    }
});
