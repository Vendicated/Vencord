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

import "./style.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { migratePluginSettings, Settings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Menu, Popout, useRef, useState } from "@webpack/common";
import type { ReactNode } from "react";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

function VencordPopout(onClose: () => void) {
    const { useQuickCss } = useSettings(["useQuickCss"]);

    const pluginEntries = [] as ReactNode[];

    for (const plugin of Object.values(Vencord.Plugins.plugins)) {
        if (plugin.toolboxActions && Vencord.Plugins.isPluginEnabled(plugin.name)) {
            pluginEntries.push(
                <Menu.MenuGroup
                    label={plugin.name}
                    key={`vc-toolbox-${plugin.name}`}
                >
                    {Object.entries(plugin.toolboxActions).map(([text, action]) => {
                        const key = `vc-toolbox-${plugin.name}-${text}`;

                        if (plugin.name === "Demonstration") {
                            const [demonstrationToggled, setToggled] = useState(false);

                            return (
                                <Menu.MenuCheckboxItem
                                    id="vc-toolbox-demonstration-toggle"
                                    key={key}
                                    checked={!!demonstrationToggled}
                                    label={text}
                                    action={
                                        () => {
                                            action();
                                            setToggled(!demonstrationToggled);
                                        }
                                    }
                                />
                            );
                        }

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
        <svg viewBox="0 0 930 930" width={25} height={25} className="vc-toolbox-icon">
            <path fill="currentColor" d={"M836 465.5C836 670.121 670.121 836 465.5 836C260.879 836 95 670.121 95 465.5C95 260.879 260.879 95 465.5 95C670.121 95 836 260.879 836 465.5ZM242.322 465.5C242.322 588.758 342.242 688.678 465.5 688.678C588.758 688.678 688.678 588.758 688.678 465.5C688.678 342.242 588.758 242.322 465.5 242.322C342.242 242.322 242.322 342.242 242.322 465.5Z"} />
            <path fill="currentColor" d={"M584.219 465.898C584.219 531.245 531.245 584.219 465.898 584.219C440.35 584.219 416.693 576.122 397.353 562.354L260.937 644.321C451.4 528.542 329.698 492.311 204.538 566.663L348.433 480.202C347.868 475.513 347.577 470.74 347.577 465.898C347.577 400.552 400.552 347.577 465.898 347.577C491.108 347.577 514.477 355.462 533.673 368.899L627.819 312.331C610.898 294.399 591.056 279.324 569.045 267.796C534.72 249.819 496.306 241.088 457.582 242.462C418.858 243.837 381.16 255.27 348.196 275.637C315.232 296.003 288.138 324.6 269.581 358.616C262.856 370.943 257.336 383.828 253.065 397.091C240.595 435.815 209.386 470.244 168.712 470.997C128.037 471.751 93.7099 439.084 101.005 399.061C108.06 360.359 121.262 322.87 140.254 288.06C171.06 231.591 216.039 184.116 270.763 150.306C325.486 116.495 388.07 97.5155 452.356 95.2335C516.641 92.9515 580.413 107.446 637.397 137.29C694.38 167.134 742.612 211.301 777.345 265.444C812.079 319.586 832.118 381.839 835.491 446.076C838.863 510.313 825.452 574.322 796.579 631.804C778.78 667.239 755.483 699.439 727.687 727.279C698.944 756.068 652.543 746.455 629.998 712.591C607.453 678.727 617.982 633.466 642.711 601.164C651.181 590.1 658.628 578.224 664.932 565.676C682.324 531.051 690.402 492.494 688.371 453.799C687.303 433.462 683.462 413.454 677.02 394.312L583.246 450.657C583.889 455.647 584.219 460.734 584.219 465.898ZM260.937 644.321C258.599 645.742 256.214 647.175 253.783 648.619L260.937 644.321Z"} />
            <path fill="currentColor" d="M470.711 406.73C493.342 393.132 522.712 400.455 536.311 423.086C549.909 445.718 542.587 475.088 519.955 488.687L253.783 648.619L204.538 566.663L470.711 406.73Z" />
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
                // TODO: (?:\.button) is for stable compat and should be removed soon:tm:
                match: /focusSectionProps:"HELP".{0,20},className:(\i(?:\.button)?)\}\),/,
                replace: "$& $self.renderVencordPopoutButton($1),"
            }
        }
    ],

    renderVencordPopoutButton: (buttonClass: string) => (
        <ErrorBoundary noop>
            <VencordPopoutButton buttonClass={buttonClass} />
        </ErrorBoundary>
    )
});
