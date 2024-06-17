/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";

import definePlugin, { OptionType, StartAt } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { FluxDispatcher, Menu } from "@webpack/common";
import { createStore, entries, set } from "@api/DataStore";

const hiddenGroupsStore = createStore("HiddenGroups", "HiddenGroupsList");

const hiddenGroups: string[] = [];

/**
 * Saves the list of hidden groups to the device's storage.
 */
async function saveToStorage(): Promise<void> {
    await set("list", JSON.stringify(hiddenGroups), hiddenGroupsStore);
}

/**
 * Check to ensure a channel should render.
 */
function shouldRender(channelId: string): boolean {
    return !hiddenGroups.includes(channelId);
}

let forceUpdate: () => void;

/**
 * Sets the global force update function.
 */
function setForceUpdate(func: () => void): undefined {
    forceUpdate = func;
    return undefined;
}

/**
 * Event handler for when a message is received.
 * @param event
 */
function removeIgnored(event: any) {
    if (!settings.store.showOnMessage) return;

    const { channelId, guildId } = event;
    if (guildId != undefined || channelId == undefined) return;

    if (!hiddenGroups.includes(channelId)) return;

    hiddenGroups.splice(hiddenGroups.indexOf(channelId), 1);
    forceUpdate?.();

    saveToStorage().catch(console.error);
}

const settings = definePluginSettings({
    showOnMessage: {
        description: "Reveals a hidden group when a message is received from it.",
        type: OptionType.BOOLEAN,
        default: true
    }
});

const GroupDMContext: NavContextMenuPatchCallback = (children, { channel }) => {
    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(
        <Menu.MenuItem
            id={"hide-group"}
            label={"Hide Group"}
            action={() => {
                hiddenGroups.push(channel.id);
                forceUpdate?.();
            }}
        />
    );
};

export default definePlugin({
    name: "Hide Groups",
    authors: [Devs.Magix],
    description: "Allows hiding group DMs.",
    settings,

    startAt: StartAt.DOMContentLoaded,
    patches: [
        {
            find: 'location:"private_channel"',
            replacement: {
                match: /return .\.isMultiUserDM\(\)/,
                replace: (match) => {
                    const ret = match.split(".")[0];
                    const varName = ret.charAt(ret.length - 1);

                    return `return !$self.shouldRender(${varName}.id)?undefined:${varName}.isMultiUserDM()`;
                }
            }
        },
        {
            find: 'location:"private_channel"',
            replacement: {
                match: /\i.default=\i=>{let{.+}=\i,/,
                replace: (match) => {
                    const declaration = match.split("=>")[0];
                    const props = declaration.split("=")[1];

                    return `${match}_a=$self.setForceUpdate(${props}._forceUpdate),`;
                }
            }
        },
        {
            find: ".renderDM(",
            replacement: {
                match: /\(O\.default,{/,
                replace: "$&_forceUpdate:this.forceUpdate.bind(this),"
            }
        }
    ],
    async start() {
        // Import hidden DMs.
        entries(hiddenGroupsStore).then(data => {
            const [_, list] = data[0];
            hiddenGroups.push(...JSON.parse(list));
        });

        FluxDispatcher.subscribe("MESSAGE_CREATE", removeIgnored);
    },
    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", removeIgnored);
    },

    contextMenus: {
        "gdm-context": GroupDMContext
    },

    shouldRender,
    setForceUpdate
});
