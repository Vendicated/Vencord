/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import IpcEvents from "@utils/IpcEvents";
import { LazyComponent } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCode } from "@webpack";
import { Menu, Popout, useState } from "@webpack/common";
import type { ReactNode } from "react";

const HeaderBarIcon = LazyComponent(() => findByCode(".HEADER_BAR_BADGE,", ".tooltip"));

function VencordPopout(onClose: () => void) {
    const pluginEntries = [] as ReactNode[];

    for (const plugin of Object.values(Vencord.Plugins.plugins)) {
        if (plugin.toolbarActions) {
            pluginEntries.push(
                <Menu.MenuGroup
                    label={plugin.name}
                    key={`vc-menu-${plugin.name}`}
                >
                    {Object.entries(plugin.toolbarActions).map(([text, action]) => {
                        const key = `vc-menu-${plugin.name}-${text}`;

                        return (
                            <Menu.MenuItem
                                id={key}
                                key={key}
                                label={text}
                                action={action}
                            />
                        );
                    })}
                </Menu.MenuGroup>
            );
        }
    }

    return (
        <Menu.Menu
            navId="vencord-menu"
            onClose={onClose}
        >
            <Menu.MenuItem
                id="vc-menu-notifications"
                label="Open Notification Log"
                action={openNotificationLogModal}
            />
            <Menu.MenuItem
                id="vc-menu-quickcss"
                label="Open QuickCSS"
                action={() =>
                    IS_WEB
                        ? require("@components/Monaco").launchMonacoEditor()
                        : VencordNative.ipc.invoke(IpcEvents.OPEN_MONACO_EDITOR)
                }
            />
            {...pluginEntries}
        </Menu.Menu>
    );
}

function VencordPopoutIcon() {
    return (
        <img
            width={24}
            height={24}
            src="https://vencord.dev/assets/favicon.png"
            alt="Vencord Menu"
        />
    );
}

function VencordPopoutButton() {
    const [show, setShow] = useState(false);

    return (
        <Popout
            position="bottom"
            align="right"
            animation={Popout.Animation.NONE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            renderPopout={() => VencordPopout(() => setShow(false))}
        >
            {(_, { isShown }) => (
                <HeaderBarIcon
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "Vencord Menu"}
                    icon={VencordPopoutIcon}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

function ToolbarFragmentWrapper({ children }: { children: ReactNode[]; }) {
    children.splice(children.length - 1, 0, <VencordPopoutButton />);

    return <>{children}</>;
}

export default definePlugin({
    name: "VencordToolbarMenu",
    description: "Adds a button next to the inbox button in the channel header that houses Vencord quick actions",
    authors: [Devs.Ven],
    enabledByDefault: true,

    patches: [
        {
            find: ".mobileToolbar",
            replacement: {
                match: /(?<=toolbar:function.{0,100}\()\i.Fragment,/,
                replace: "$self.ToolbarFragmentWrapper,"
            }
        }
    ],

    ToolbarFragmentWrapper: ErrorBoundary.wrap(ToolbarFragmentWrapper, {
        fallback: () => <p style={{ color: "red" }}>Failed to render :(</p>
    })
});
