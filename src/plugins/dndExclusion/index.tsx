/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 rosemary
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, Menu, React, UserStore, useState } from "@webpack/common";
import { MessageJSON } from "discord-types/general";

let excluded = new Set<string>();
const EXCLUDED_KEY = "dnd-excluded-channels";

const getExcluded = async (): Promise<Set<string>> => {
    return excluded = (await get(EXCLUDED_KEY) ?? new Set<string>());
};

const settings = definePluginSettings({
    reset: {
        type: OptionType.COMPONENT,
        component: () => {
            const [size, setSize] = useState(excluded.size);

            return (<>
                {size === 0 ?
                    <Forms.FormText tag="h4">You don't have any channels excluded from Do Not Disturb!</Forms.FormText> :
                    <>
                        <Forms.FormText
                            tag="h4">{size.toLocaleString()} channel{size !== 1 ? "s" : ""} excluded from Do Not Disturb.</Forms.FormText>
                        <Button
                            onClick={() => {
                                setSize(0);
                                excluded.clear();
                                set(EXCLUDED_KEY, excluded).then();
                            }}
                            color={Button.Colors.RED}
                        >
                            Reset
                        </Button>
                    </>
                }
            </>);
        },

    }
});

const patchContextMenu: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    const isExcluded = excluded.has(channel.id);
    group.push(
        <Menu.MenuItem
            id={"mutate-dnd-exclusion"}
            label={isExcluded ? "Remove DND exclusion" : "Exclude from DND"}
            action={() => {
                if (isExcluded) {
                    excluded.delete(channel.id);
                } else {
                    excluded.add(channel.id);
                }
                set(EXCLUDED_KEY, excluded).then();
            }}
        >
        </Menu.MenuItem>
    );
};

interface ShouldNotifyEvent {
    channelId: string;
    guildId: string;
    isPushNotification: boolean;
    message: MessageJSON;
    optimistic: boolean;
    type: "MESSAGE_CREATE";
}

export default definePlugin({
    name: "DndExclusion",
    description: "Exclude specific channels from your Do Not Disturb status so you still get notifications from them!",
    authors: [Devs.rosemary],
    patches: [{
        // we are replacing:
        //   let N = (0,H.eF)(u, r, !et)
        // N should be *true* if we want notifications to play, otherwise leave untouched
        find: ".latestChangelogId()!==",
        replacement: {
            match: /\(0,\i\.\i\)\(\i,\i,!(\i)\)/,
            replace: "$&||$self.ShouldNotify(e,$1)"
        }
    }],
    settings,
    ShouldNotify(event: ShouldNotifyEvent, focused: boolean) {
        const currentChannel = getCurrentChannel();
        if(currentChannel && currentChannel.id === event.channelId && focused) return false;
        const user = UserStore.getCurrentUser();
        if(event.message.author.id === user.id) return false;
        return excluded.has(event.channelId);
    },
    start() {
        getExcluded().then(()=>{
            console.log("DndExclusion started");
        });
    },
    contextMenus: {
        "channel-context": patchContextMenu,
        "thread-context": patchContextMenu,
        "user-context": patchContextMenu,
        "gdm-context": patchContextMenu
    },
});
