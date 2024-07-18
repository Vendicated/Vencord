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

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findExportedComponentLazy } from "@webpack";
import { Menu, Popout, useState } from "@webpack/common";
import type { ReactNode } from "react";

function toggle(name: string, onClose: () => void) {
    Settings.plugins.TextModifiers[name] = !Settings.plugins.TextModifiers[name];
    onClose();
}
function isEnabled(name: string) {
    return Settings.plugins.TextModifiers[name];
}


const HeaderBarIcon = findExportedComponentLazy("Icon", "Divider");


function utilityDockPopout(onClose: () => void) {


    return (
        <Menu.Menu
            navId="utilityDock"
            onClose={onClose}
        >
            <Menu.MenuCheckboxItem
                id="utilityDock-quickcss-toggle"
                checked={Settings.useQuickCss}
                label={"QuickCSS"}
                action={() => {
                    Settings.useQuickCss = !Settings.useQuickCss;
                    onClose();
                }}
            />
            <Menu.MenuItem
                id="utilityDock-quickcss"
                label="Edit QuickCSS"
                action={() => VencordNative.quickCss.openEditor()}
            />
        </Menu.Menu>

    );
}

function utilityDockIcon(isShown: boolean) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={24} height={24}>
            <path fill="currentColor" d={isShown ?

                "M20 8H17V6C17 4.9 16.1 4 15 4H9C7.9 4 7 4.9 7 6V8H4C2.9 8 2 8.9 2 10V20H22V10C22 8.9 21.1 8 20 8M9 6H15V8H9V6M20 18H4V15H6V16H8V15H16V16H18V15H20V18M18 13V12H16V13H8V12H6V13H4V10H20V13H18Z"
                :
                "M18 16H16V15H8V16H6V15H2V20H22V15H18V16M20 8H17V6C17 4.9 16.1 4 15 4H9C7.9 4 7 4.9 7 6V8H4C2.9 8 2 8.9 2 10V14H6V12H8V14H16V12H18V14H22V10C22 8.9 21.1 8 20 8M15 8H9V6H15V8Z"} />
        </svg>
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
            renderPopout={() => utilityDockPopout(() => setShow(false))}
        >
            {(_, { isShown }) => (
                <HeaderBarIcon
                    className="vc-toolbox-btn"
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "Utility Dock"}
                    icon={() => utilityDockIcon(isShown)}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

function utilityDock({ children }: { children: ReactNode[]; }) {
    children.splice(
        children.length - 1, 0,
        <ErrorBoundary noop={true}>
            <VencordPopoutButton />
        </ErrorBoundary>
    );

    return <>{children}</>;
}

export default definePlugin({
    name: "utilityDock",
    description: "Adds a button on your titlebar with multiple useful features",
    authors: [Devs.Samwich],

    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(?<=toolbar:function.{0,100}\()\i.Fragment,/,
                replace: "$self.utilityDock,"
            }
        }
    ],

    utilityDock: ErrorBoundary.wrap(utilityDock, {
        fallback: () => <p style={{ color: "red" }}>Failed to render :(</p>
    })
});

export function TextPlugin({ pluginName, onClose }) {
    return (
        <Menu.MenuCheckboxItem
            id={`vc-toolbox-${pluginName}-toggle`}
            checked={Settings.plugins[pluginName].enabled}
            label={pluginName}
            action={() => {
                Settings.plugins[pluginName].isEnabled = !Settings.plugins[pluginName].isEnabled;
                onClose();
            }}
        />
    );
}

