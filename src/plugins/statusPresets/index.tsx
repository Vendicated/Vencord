/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, Menu, Text, Toasts } from "@webpack/common";

const Components = findByPropsLazy("Status");
const StatusStyles = findByPropsLazy("statusItem");

const statusCrossSponding = {
    "online": "rgb(35, 165, 90)"
};

interface Emoji {
    animated: boolean;
    id: bigint | null;
    name: string;
}

interface DiscordStatus {
    emojiInfo: Emoji | null;
    text: string;
    clearAfter: string | number | null;
    status: "online" | "dnd" | "idle" | "invisible";
}

const settings = definePluginSettings({
    StatusPresets: {
        type: OptionType.COMPONENT,
        description: "yaps",
        component: () => {
            return (<Text>yo</Text>);
        },
        default: {}
    }
});

function StatusMenuItem({ status }: { status: DiscordStatus; }) {
    return (<Menu.MenuItem
        id={"status-presets-" + status.text}
        label={status.status}
        action={() => console.log("pog")}
        render={() => (<div className={StatusStyles.statusItem}><Components.Status
            status={status} className={StatusStyles.icon}
            size={10}
            color={statusCrossSponding[status.status] || "currentColor"}
        />
            <div className={StatusStyles.status}>{status.status}</div>
            <div className={StatusStyles.description}>{status.text}</div>
        </div>)}
    />);
}

function MakeContextCallback(): NavContextMenuPatchCallback {
    return (children, contextMenuApiArguments) => {
        children[1]?.props.children.props.children.props.children.splice(1, 0,
            <Menu.MenuItem
                id="status-presets"
                label="Presets" // add an icon to fit in
            >
                {Object.values((settings.store.StatusPresets as { [k: string]: DiscordStatus; })).map(status => <StatusMenuItem status={status} />)}
            </Menu.MenuItem>
        );
    };
}

export default definePlugin({
    name: "StatusPresetsS",
    description: "do now and think later",
    authors: [Devs.Dolfies],
    settings: settings,
    patches: [
        {
            find: ".Messages.CUSTOM_STATUS_CLEAR_AFTER",
            replacement: {
                match: /\.ModalFooter,.+\.Messages\.SAVE\}\)/,
                replace: "$&,$self.renderRememberButton(this.state)"
            }
        }
    ],
    contextMenus: {
        "status": MakeContextCallback()
    },
    renderRememberButton({ statue }: { statue: DiscordStatus; }) {
        if (!statue) return;
        return <Button onClick={() => {
            settings.store.StatusPresets[statue.text] = statue;
            Toasts.show({
                message: "Successfully Saved Status",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
        }}>Remember</Button>;
    }
});
