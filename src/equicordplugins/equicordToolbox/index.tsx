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

import "./styles.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { isPluginEnabled, plugins } from "@api/PluginManager";
import { migratePluginSettings, Settings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Menu, Popout, useRef, useState } from "@webpack/common";
import type { PropsWithChildren, ReactNode } from "react";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

function VencordPopout(onClose: () => void) {
    const { useQuickCss } = useSettings(["useQuickCss"]);

    const pluginEntries = [] as ReactNode[];

    for (const plugin of Object.values(plugins)) {
        if (plugin.toolboxActions && isPluginEnabled(plugin.name)) {
            pluginEntries.push(
                <Menu.MenuGroup
                    label={plugin.name}
                    key={`vc-toolbox-${plugin.name}`}
                >
                    {Object.entries(plugin.toolboxActions).map(([text, action]) => {
                        const key = `vc-toolbox-${plugin.name}-${text}`;

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
            navId="vc-toolbox"
            onClose={onClose}
        >
            <Menu.MenuItem
                id="vc-toolbox-notifications"
                label="Open Notification Log"
                action={openNotificationLogModal}
            />
            <Menu.MenuCheckboxItem
                id="vc-toolbox-quickcss-toggle"
                checked={useQuickCss}
                label={"Enable QuickCSS"}
                action={() => {
                    Settings.useQuickCss = !useQuickCss;
                }}
            />
            <Menu.MenuItem
                id="vc-toolbox-quickcss"
                label="Open QuickCSS"
                action={() => VencordNative.quickCss.openEditor()}
            />
            {...pluginEntries}
        </Menu.Menu>
    );
}

function VencordPopoutIcon() {
    return (
        <svg viewBox="0 0 443 443" width={20} height={20} className="vc-toolbox-icon">
            <path fill="currentColor" d="M221.5.6C99.2.6,0,99.7,0,222.1s99.2,221.5,221.5,221.5,221.5-99.2,221.5-221.5S343.8.6,221.5.6ZM221.5,363.3c-78.3,0-141.8-63.5-141.8-141.8s63.5-141.8,141.8-141.8,141.8,63.5,141.8,141.8-63.5,141.8-141.8,141.8Z" />
            <path fill="currentColor" d="M438.3,175C421,90.1,354.7,23.1,269.9,5.1,145-21.3,33.1,57.6,6.2,169.5c-3.4,14.1,4.6,28.5,18.4,33.1l2.7.9c24.7,8.2,51.8-4.7,60.4-29.3,19.4-55.6,72.5-95.4,134.9-95,44.3.3,84.1,21.2,109.9,53.7l-63.3,29.5c-7.9-7-17.5-12.5-28.5-15.7-35.6-10.3-73.8,7.7-88.5,41.7-17.2,39.8,3.3,85.4,43.9,99.4,37.9,13,79.7-6.9,93.5-44.5,2.6-7.2,4.1-14.5,4.4-21.8l66-30.8c1.8,8.2,2.9,16.6,3.2,25.2,1.2,34-9.6,65.5-28.5,90.5-17.8,23.6-10.5,57.4,15.7,71.1l1.3.7c10.4,5.5,23.3,3.4,31.4-5.2,46.8-49.9,70.8-121.4,55.2-198Z" />
            <path fill="currentColor" transform="translate(319.7 -16.5) rotate(65)" d="M172.8,152.7h0c17.7,0,32,14.3,32,32v148h-64v-148c0-17.7,14.3-32,32-32Z" />
        </svg>
    );
}

function VencordPopoutButton({ buttonClass }: { buttonClass: string; }) {
    const buttonRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <Popout
            position="bottom"
            align="center"
            spacing={0}
            animation={Popout.Animation.NONE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            targetElementRef={buttonRef}
            renderPopout={() => VencordPopout(() => setShow(false))}
        >
            {(_, { isShown }) => (
                <HeaderBarIcon
                    ref={buttonRef}
                    className={`vc-toolbox-btn ${buttonClass}`}
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "Equicord Toolbox"}
                    icon={() => VencordPopoutIcon()}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

migratePluginSettings("EquicordToolbox", "VencordToolbox");
export default definePlugin({
    name: "EquicordToolbox",
    description: "Adds a button next to the inbox button in the channel header that houses Equicord quick actions",
    authors: [Devs.Ven, Devs.AutumnVN],

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=trailing:.{0,50})\i\.Fragment,\{(?=.+?className:(\i))/,
                replace: "$self.TrailingWrapper,{className:$1,"
            }
        }
    ],

    TrailingWrapper({ children, className }: PropsWithChildren<{ className: string; }>) {
        return (
            <>
                {children}
                <ErrorBoundary noop>
                    <VencordPopoutButton buttonClass={className} />
                </ErrorBoundary>
            </>
        );
    },
});
