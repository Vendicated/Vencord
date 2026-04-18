/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { findByPropsLazy } from "@webpack";
import { Alerts, ChannelStore, Clickable, Menu, React, showToast, Tooltip } from "@webpack/common";

const PrivateChannelActions = findByPropsLazy("closePrivateChannel") as any;

const settings = definePluginSettings({
    closeDms: {
        type: OptionType.BOOLEAN,
        description: "Allow closing DMs with the chat button",
        default: true
    },
    leaveGroups: {
        type: OptionType.BOOLEAN,
        description: "Allow leaving group DMs with the chat button",
        default: true
    },
    whitelist: {
        type: OptionType.STRING,
        description: "Comma-separated list of DM/group channel IDs to ignore",
        default: "",
        multiline: true,
        onChange(newValue: string) {
            settings.store.whitelist = normalizeWhitelist(newValue);
        }
    }
});

function normalizeWhitelist(value: string) {
    const ids = value
        .split(",")
        .map(id => id.trim())
        .filter(Boolean);

    return Array.from(new Set(ids)).join(", ");
}

function getWhitelistSet(value = settings.store.whitelist) {
    return new Set(
        value
            .split(",")
            .map(id => id.trim())
            .filter(Boolean)
    );
}

function isWhitelisted(channelId: string, value = settings.store.whitelist) {
    return getWhitelistSet(value).has(channelId);
}

function addToWhitelist(channelId: string) {
    const ids = getWhitelistSet();
    ids.add(channelId);
    settings.store.whitelist = Array.from(ids).join(", ");
}

function removeFromWhitelist(channelId: string) {
    const ids = getWhitelistSet();
    ids.delete(channelId);
    settings.store.whitelist = Array.from(ids).join(", ");
}

function getClosePlan() {
    const { closeDms, leaveGroups } = settings.store;
    const channels = ChannelStore.getSortedPrivateChannels();

    const closeIds: string[] = [];
    const leaveIds: string[] = [];

    for (const channel of channels) {
        if (isWhitelisted(channel.id)) continue;

        if (channel.isGroupDM()) {
            if (!leaveGroups) continue;

            leaveIds.push(channel.id);

            continue;
        }

        if (!channel.isDM() || !closeDms) continue;
        closeIds.push(channel.id);
    }

    return {
        closeIds,
        leaveIds
    };
}

function executeClosePlan(plan: { closeIds: string[]; leaveIds: string[]; }) {
    let closed = 0;
    let left = 0;

    for (const channelId of plan.leaveIds) {
        if (typeof PrivateChannelActions.leaveGroupDM === "function") {
            PrivateChannelActions.leaveGroupDM(channelId);
            left++;
        } else if (typeof PrivateChannelActions.leaveGroup === "function") {
            PrivateChannelActions.leaveGroup(channelId);
            left++;
        } else if (typeof PrivateChannelActions.closePrivateChannel === "function") {
            PrivateChannelActions.closePrivateChannel(channelId);
            left++;
        }
    }

    for (const channelId of plan.closeIds) {
        if (typeof PrivateChannelActions.closePrivateChannel === "function") {
            PrivateChannelActions.closePrivateChannel(channelId);
            closed++;
        }
    }

    if (closed === 0 && left === 0) {
        showToast("No DMs to close.");
        return;
    }

    const parts = [] as string[];
    if (closed) parts.push(`Closed ${closed} DM${closed === 1 ? "" : "s"}`);
    if (left) parts.push(`Left ${left} group${left === 1 ? "" : "s"}`);
    showToast(parts.join(" · "));
}

const CloseDmIcon: IconComponent = ({ height = 16, width = 16, className }) => (
    <span
        className={className}
        style={{ display: "inline-flex", width, height, alignItems: "center", justifyContent: "center" }}
    >
        X
    </span>
);

function CloseHeaderButton({ classes }: { classes: Record<string, string>; }) {
    const { closeDms, leaveGroups } = settings.store;
    if (!closeDms && !leaveGroups) return null;

    return (
        <Tooltip text="Close DMs / Leave groups">
            {({ onMouseEnter, onMouseLeave }) => (
                <Clickable
                    aria-label="Close DMs / Leave groups"
                    className={classes.U2}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onClick={() => {
                        const plan = getClosePlan();
                        const closeCount = plan.closeIds.length;
                        const leaveCount = plan.leaveIds.length;

                        if (closeCount === 0 && leaveCount === 0) {
                            showToast("No DMs to close.");
                            return;
                        }

                        const parts = [] as string[];
                        if (closeCount) parts.push(`${closeCount} DM${closeCount === 1 ? "" : "s"}`);
                        if (leaveCount) parts.push(`${leaveCount} group${leaveCount === 1 ? "" : "s"}`);

                        Alerts.show({
                            title: "Confirm Close",
                            body: `This will close ${parts.join(" and ")}. Continue?`,
                            confirmText: "Proceed",
                            cancelText: "Cancel",
                            onConfirm: () => executeClosePlan(plan)
                        });
                    }}
                >
                    <svg
                        aria-hidden="true"
                        role="img"
                        className={classes.Br}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ opacity: 0.85, display: "block" }}
                    >
                        <path
                            fill="currentColor"
                            d="M19.3 20.7a1 1 0 0 0 1.4-1.4L13.42 12l7.3-7.3a1 1 0 0 0-1.42-1.4L12 10.58l-7.3-7.3a1 1 0 0 0-1.4 1.42L10.58 12l-7.3 7.3a1 1 0 1 0 1.42 1.4L12 13.42l7.3 7.3Z"
                        />
                    </svg>
                </Clickable>
            )}
        </Tooltip>
    );
}

function makeWhitelistMenuItem(channelId: string) {
    const whitelisted = isWhitelisted(channelId);

    return (
        <Menu.MenuItem
            id="vc-close-dm-whitelist"
            label={whitelisted ? "Remove from Close DM whitelist" : "Add to Close DM whitelist"}
            action={() => whitelisted ? removeFromWhitelist(channelId) : addToWhitelist(channelId)}
        />
    );
}

const GroupContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("leave-channel", children);
    if (!container || !props?.channel?.id) return;

    container.unshift(makeWhitelistMenuItem(props.channel.id));
};

const UserContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (!container || !props?.channel?.id) return;

    const idx = container.findIndex(c => c?.props?.id === "close-dm");
    const insertIndex = idx === -1 ? container.length : idx;
    container.splice(insertIndex, 0, makeWhitelistMenuItem(props.channel.id));
};

export default definePlugin({
    name: "CloseDMs",
    description: "Adds a button to close DMs or leave group DMs.",
    tags: ["Chat", "Utility"],
    authors: [Devs.smuki],
    settings,
    patches: [
        {
            find: "renderSection=e=>{let{section:t}=e;return 0===t?null:(0,i.jsxs)(E.A,{className:D._e",
            replacement: {
                match: /children:\[(\(0,\i\.jsx\)\("span",\{className:(\i)\.TK,children:\i\.intl\.string\(\i\.t\.YUU0RF\)\}\)),(\(0,\i\.jsx\)\(\i\.Ay,\{tooltip:\i\.intl\.string\(\i\.t\.bA875g\),tooltipPosition:\"top\",className:\2\.U2,iconClassName:\2\.Br,icon:\i\.TIR,subscribeToGlobalHotkey:!0\}\))\]/,
                replace: "children:[$1,$self.renderHeaderButton($2),$3]"
            }
        }
    ],

    contextMenus: {
        "gdm-context": GroupContextMenu,
        "user-context": UserContextMenu
    },
    renderHeaderButton: (classes: Record<string, string>) => <CloseHeaderButton classes={classes} />,
    CloseDmIcon
});
