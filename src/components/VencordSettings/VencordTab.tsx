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

import "./headerCard.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { gitRemote } from "@shared/vencordUserAgent";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { closeAllModals } from "@utils/modal";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { Button, Card, FluxDispatcher, Forms, GuildStore, NavigationRouter, React, Select, Switch } from "@webpack/common";

import { boykisserIcon, Flex, FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "..";
import { openNotificationSettingsModal } from "./NotificationSettings";
import { QuickAction, QuickActionContainer } from "./quickActions";
import { SettingsTab, wrapTab } from "./shared";

const cl = classNameFactory("vc-settings-");

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1258290490961559633.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1258484151670018220.gif";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];


function VencordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(VencordNative.settings.getSettingsDir, {
        fallbackValue: "Loading..."
    });
    const settings = useSettings();

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    const isWindows = navigator.platform.toLowerCase().startsWith("win");
    const isMac = navigator.platform.toLowerCase().startsWith("mac");
    const needsVibrancySettings = IS_DISCORD_DESKTOP && isMac;

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        note: string;
    }> =
        [
            {
                key: "useQuickCss",
                title: "Enable Custom CSS",
                note: "Loads your Custom CSS"
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "Enable React Developer Tools",
                note: "Requires a full restart"
            },
            !IS_WEB && (!IS_DISCORD_DESKTOP || !isWindows ? {
                key: "frameless",
                title: "Disable the window frame",
                note: "Requires a full restart"
            } : {
                key: "winNativeTitleBar",
                title: "Use Windows' native title bar instead of Discord's custom one",
                note: "Requires a full restart"
            }),
            !IS_WEB && {
                key: "transparent",
                title: "Enable window transparency",
                note: "You need a theme that supports transparency or this will do nothing. WILL STOP THE WINDOW FROM BEING RESIZABLE!! Requires a full restart"
            },
            !IS_WEB && isWindows && {
                key: "winCtrlQ",
                title: "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)",
                note: "Requires a full restart"
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: "Disable minimum window size",
                note: "Requires a full restart"
            },
        ];

    return (
        <SettingsTab title="Nexulien Settings">
            <HeaderCard image={donateImage} />
            <QuickActionContainer title="Quick Actions">
                <QuickAction
                    Icon={LogIcon}
                    text="Notification Log"
                    action={openNotificationLogModal}
                />
                <QuickAction
                    Icon={PaintbrushIcon}
                    text="Edit QuickCSS"
                    action={() => VencordNative.quickCss.openEditor()}
                />
                {!IS_WEB && (
                    <QuickAction
                        Icon={RestartIcon}
                        text="Relaunch Discord"
                        action={relaunch}
                    />
                )}
                {!IS_WEB && (
                    <QuickAction
                        Icon={FolderIcon}
                        text="Settings Folder"
                        action={() => showItemInFolder(settingsDir)}
                    />
                )}
                <QuickAction
                    Icon={GithubIcon}
                    text="View Source Code"
                    action={() => VencordNative.native.openExternal("https://github.com/" + gitRemote)}
                />
                <QuickAction
                    Icon={boykisserIcon}
                    text="i will give this button a purpose someday"
                    action={function () {
                        console.warn("you silly goober");
                    }}
                />
            </QuickActionContainer>

            <Forms.FormDivider />

            <Forms.FormSection className={Margins.top16} title="Settings" tag="h5">
                <Forms.FormText className={Margins.bottom20} style={{ color: "var(--text-muted)" }}>
                    Hint: You can change the position of this settings section in the
                    {" "}<Button
                        look={Button.Looks.BLANK}
                        style={{ color: "var(--text-link)", display: "inline-block" }}
                        onClick={() => openPluginModal(Vencord.Plugins.plugins.Settings)}
                    >
                        settings of the Settings plugin
                    </Button>!
                </Forms.FormText>

                {Switches.map(s => s && (
                    <Switch
                        key={s.key}
                        value={settings[s.key]}
                        onChange={v => settings[s.key] = v}
                        note={s.note}
                    >
                        {s.title}
                    </Switch>
                ))}
            </Forms.FormSection>


            {needsVibrancySettings && <>
                <Forms.FormTitle tag="h5">Window vibrancy style (requires restart)</Forms.FormTitle>
                <Select
                    className={Margins.bottom20}
                    placeholder="Window vibrancy style"
                    options={[
                        // Sorted from most opaque to most transparent
                        {
                            label: "No vibrancy", value: undefined
                        },
                        {
                            label: "Under Page (window tinting)",
                            value: "under-page"
                        },
                        {
                            label: "Content",
                            value: "content"
                        },
                        {
                            label: "Window",
                            value: "window"
                        },
                        {
                            label: "Selection",
                            value: "selection"
                        },
                        {
                            label: "Titlebar",
                            value: "titlebar"
                        },
                        {
                            label: "Header",
                            value: "header"
                        },
                        {
                            label: "Sidebar",
                            value: "sidebar"
                        },
                        {
                            label: "Tooltip",
                            value: "tooltip"
                        },
                        {
                            label: "Menu",
                            value: "menu"
                        },
                        {
                            label: "Popover",
                            value: "popover"
                        },
                        {
                            label: "Fullscreen UI (transparent but slightly muted)",
                            value: "fullscreen-ui"
                        },
                        {
                            label: "HUD (Most transparent)",
                            value: "hud"
                        },
                    ]}
                    select={v => settings.macosVibrancyStyle = v}
                    isSelected={v => settings.macosVibrancyStyle === v}
                    serialize={identity} />
            </>}

            <Forms.FormSection className={Margins.top16} title="Nexulien Notifications" tag="h5">
                <Flex>
                    <Button onClick={openNotificationSettingsModal}>
                        Notification Settings
                    </Button>
                    <Button onClick={openNotificationLogModal}>
                        View Notification Log
                    </Button>
                </Flex>
            </Forms.FormSection>
        </SettingsTab>
    );
}

interface HeaderCardProps {
    image: string;
}

function HeaderCard({ image }: HeaderCardProps) {
    return (
        <Card className={cl("card", "header")}>
            <div>
                <span className={cl("urbanistTitle")}>NEXULIEN</span>
                <span>...the best (worst) discord client mod.</span>
                <span>Nexulien doesn't need donations! Please go support <a href="https://github.com/sponsors/Vendicated" target="_blank">Vendicated</a> instead!</span>
                <div className={cl("buttonRow")}>
                    <button
                        onClick={() => window.open("https://github.com/Nexulien")}
                    >Contribute</button>
                    <button
                        onClick={async () => {
                            if (!GuildStore.getGuild("1297010632591278090")) {
                                const inviteAccepted = await openInviteModal("VS2wePpjnt");
                                if (inviteAccepted) {
                                    closeAllModals();
                                    FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
                                }
                            } else {
                                FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
                                NavigationRouter.transitionToGuild("1297010632591278090");
                            }
                        }}
                    >Join our Server</button>
                </div>
            </div>
            <img
                role="presentation"
                src="https://raw.githubusercontent.com/Nexulien/assets/refs/heads/main/zoidcord-smallest.png"
                alt=""
                height={192}
                draggable="false"
                style={{
                    marginLeft: "auto"
                }}
                className={cl("mascot")}
            />
        </Card>
    );
}

export default wrapTab(VencordSettings, "Nexulien Settings");
