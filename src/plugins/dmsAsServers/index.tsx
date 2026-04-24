/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback,
} from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { Menu } from "@webpack/common";

const STORE_KEY = "DMsAsServers_promotedDmChannelIds";
let promotedDmChannelIds: string[] = [];

const PromotedDmsStore = {
    _listeners: new Set<() => void>(),
    addReactChangeListener(fn: () => void) {
        this._listeners.add(fn);
    },
    removeReactChangeListener(fn: () => void) {
        this._listeners.delete(fn);
    },
    emitChange() {
        this._listeners.forEach((fn) => fn());
    },
};

function getPromotedDmChannelIds(): string[] {
    return promotedDmChannelIds;
}

function setPromotedDmChannelIds(ids: string[]) {
    promotedDmChannelIds = ids;
    void DataStore.set(STORE_KEY, ids);
    PromotedDmsStore.emitChange();
}

function togglePromoted(channelId: string) {
    const promoted = getPromotedDmChannelIds();
    setPromotedDmChannelIds(
        promoted.includes(channelId)
            ? promoted.filter((id) => id !== channelId)
            : [...promoted, channelId],
    );
}

const userContextPatch: NavContextMenuPatchCallback = (
    children,
    { channel }: { channel?: Channel },
) => {
    if (!channel || channel.type !== ChannelType.DM) return;

    const group = findGroupChildrenByChildId("close-dm", children);
    if (!group) return;

    const isPromoted = getPromotedDmChannelIds().includes(channel.id);
    const closeDmIndex = group.findIndex((c) => c?.props?.id === "close-dm");
    group.splice(
        closeDmIndex >= 0 ? closeDmIndex : group.length,
        0,
        <Menu.MenuItem
            id="dass-server-list"
            label={
                isPromoted
                    ? "Remove from Server List"
                    : "Promote to Server List"
            }
            action={() => togglePromoted(channel.id)}
        />,
    );
};

export default definePlugin({
    name: "DMsAsServers",
    description:
        "Promote DMs as permanent icons in your server list as if they're servers.",
    authors: [Devs.t7ru],
    tags: ["Friends", "Organisation"],

    patches: [
        {
            // force promoted dms into guild-list-unread-dms to always shown regardless of read state
            // the whole thing is bit of a hack but i think it's pretty clever and 'stable'
            find: '"guild-list-unread-dms"',
            replacement: {
                match: /\(0,(\i\.\i)\)\(\[(\i\.\i)\],\(\)=>\2\.getUnreadPrivateChannelIds\(\)\)/,
                replace:
                    "(0,$1)([$self.store,$2],()=>[...$self.getPromotedIds(),...$2.getUnreadPrivateChannelIds()].filter((v,i,a)=>a.indexOf(v)===i))",
            },
        },
    ],

    store: PromotedDmsStore,
    getPromotedIds: getPromotedDmChannelIds,

    contextMenus: {
        "user-context": userContextPatch,
    },

    async start() {
        const stored = await DataStore.get<string[]>(STORE_KEY);
        promotedDmChannelIds = Array.isArray(stored) ? stored : [];
        PromotedDmsStore.emitChange();
    },
});
