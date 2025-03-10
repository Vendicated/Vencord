/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./headerCard.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { gitRemote } from "@shared/vencordUserAgent";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { identity, isPluginDev } from "@utils/misc";
import { closeAllModals } from "@utils/modal";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { Button, Card, FluxDispatcher, Forms, GuildStore, NavigationRouter, React, Select, Switch, UserStore } from "@webpack/common";

import { boykisserIcon, Flex, FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "..";
import { openNotificationSettingsModal } from "./NotificationSettings";
import { QuickAction, QuickActionContainer } from "./quickActions";
import { SettingsTab, wrapTab } from "./shared";
import { SpecialCard } from "./SpecialCard";

const cl = classNameFactory("nx-settings-");

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1258290490961559633.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1258484151670018220.gif";

const CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1337858798664024156.png";

const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1337878381517078649.png?size=2048";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function VencordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(VencordNative.settings.getSettingsDir, {
        fallbackValue: "Loading..."
    });
    const settings = useSettings();

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    const user = UserStore.getCurrentUser();

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
            {
                key: "nxHeartbeats",
                title: "Send Nexulien API Heartbeats",
                note: "Sends heartbeats to our API for statistics, and also gives you a neat badge! Disable this to remove yourself from the statistics. It might take 1 to 2 days for your badge to be removed."
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
            {isPluginDev(user?.id) && (
                <SpecialCard
                    title="Thank you for contributing!"
                    description="Since you've contributed to Nexulien, you now have a cool new badge!"
                    cardImage={CONTRIB_IMAGE}
                    backgroundImage={CONTRIB_BACKGROUND_IMAGE}
                    backgroundGradient="linear-gradient(to left, #00ff99, #7700ee)"
                />
            )}
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
                <span className={cl("logo-container")}>
                    <svg width="250" height="50" viewBox="0 0 250 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={cl("logo")}>
                        <path d="M15.3596 13.8152C26.3784 13.8152 30.7191 22.2959 30.7191 28.246V48.6269H22.7055V28.4512C22.7055 23.5953 19.2329 21.4068 15.3596 21.4068C11.4863 21.4068 8.01369 23.5953 8.01369 28.4512V48.6269H0V28.246C0 22.2959 4.34075 13.8152 15.3596 13.8152Z" fill="var(--header-primary)" />
                        <path d="M45.9806 26.7414H62.7426C61.3402 23.3901 58.3351 21.4752 54.3282 21.4752C50.3882 21.4752 47.383 23.3901 45.9806 26.7414ZM54.3282 41.7193C57.6673 41.7193 60.2717 40.4198 61.8745 38.0261H70.6227C68.419 44.9337 62.4755 49.2424 54.395 49.2424C44.044 49.2424 37.0988 42.1296 37.0988 31.5288C37.0988 20.9964 44.044 13.952 54.395 13.952C64.746 13.952 71.6244 20.9964 71.6244 31.5288C71.6244 32.4863 71.5577 33.3754 71.4909 34.2645H45.3796C46.2478 38.9836 49.5868 41.7193 54.3282 41.7193Z" fill="var(--header-primary)" />
                        <path d="M85.0411 31.5288L74.0223 14.4308H83.238L89.7825 24.5528L96.3271 14.4308H105.543L94.524 31.5288L105.543 48.6269H96.3271L89.7825 38.5048L83.238 48.6269H74.0223L85.0411 31.5288Z" fill="var(--header-primary)" />
                        <path d="M126.591 49.2424C115.572 49.2424 111.232 40.7618 111.232 34.8116V14.4308H119.245V34.6065C119.245 39.3939 122.718 41.6509 126.591 41.6509C130.465 41.6509 133.937 39.3939 133.937 34.6065V14.4308H141.951V34.8116C141.951 40.7618 137.61 49.2424 126.591 49.2424Z" fill="var(--header-primary)" />
                        <path d="M148.939 48.6269V0.752313H156.953V48.6269H148.939Z" fill="var(--header-primary)" />
                        <path d="M163.877 4.51389C163.877 2.05176 165.814 0 168.285 0C170.756 0 172.692 2.05176 172.692 4.51389C172.692 7.11279 170.756 9.09617 168.285 9.09617C165.814 9.09617 163.877 7.11279 163.877 4.51389ZM164.278 48.6269V14.4308H172.292V48.6269H164.278Z" fill="var(--header-primary)" />
                        <path d="M187.238 26.7414H204C202.597 23.3901 199.592 21.4752 195.585 21.4752C191.645 21.4752 188.64 23.3901 187.238 26.7414ZM195.585 41.7193C198.924 41.7193 201.529 40.4198 203.131 38.0261H211.88C209.676 44.9337 203.732 49.2424 195.652 49.2424C185.301 49.2424 178.356 42.1296 178.356 31.5288C178.356 20.9964 185.301 13.952 195.652 13.952C206.003 13.952 212.881 20.9964 212.881 31.5288C212.881 32.4863 212.815 33.3754 212.748 34.2645H186.637C187.505 38.9836 190.844 41.7193 195.585 41.7193Z" fill="var(--header-primary)" />
                        <path d="M234.64 13.8152C245.659 13.8152 250 22.2959 250 28.246V48.6269H241.986V28.4512C241.986 23.5953 238.514 21.4068 234.64 21.4068C230.767 21.4068 227.295 23.5953 227.295 28.4512V48.6269H219.281V28.246C219.281 22.2959 223.622 13.8152 234.64 13.8152Z" fill="var(--header-primary)" />
                    </svg>
                </span>
                <span>...the best (worst) discord client mod.</span>
                <span>Nexulien doesn't need donations! Please go support <a href="https://github.com/sponsors/Vendicated" target="_blank" rel="noreferrer">Vendicated</a> instead!</span>
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
                src="https://raw.githubusercontent.com/Nexulien/assets/refs/heads/main/low_res_lyra_menu.png"
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
