/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./VencordTab.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { plugins } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "@components/Icons";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { openContributorModal, openPluginModal, SettingsTab, wrapTab } from "@components/settings";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SpecialCard } from "@components/settings/SpecialCard";
import { gitRemote } from "@shared/vencordUserAgent";
import { DONOR_ROLE_ID, GUILD_ID, IS_MAC, IS_WINDOWS, VC_DONOR_ROLE_ID, VC_GUILD_ID } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { identity, isAnyPluginDev } from "@utils/misc";
import { relaunch } from "@utils/native";
import { GuildMemberStore, React, Select, UserStore } from "@webpack/common";
import BadgeAPI from "plugins/_api/badges";

import { DonateButtonComponent } from "./DonateButton";
import { openNotificationSettingsModal } from "./NotificationSettings";

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://equicord.org/assets/favicon.png";

const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const COZY_CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1026533070955872337.png";

const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070166481895484.png?size=2048";

const cl = classNameFactory("vc-vencord-tab-");

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function EquicordSettings() {
    const settings = useSettings();

    const donateImage = React.useMemo(
        () => (Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE),
        [],
    );

    const needsVibrancySettings = IS_DISCORD_DESKTOP && IS_MAC;

    const user = UserStore?.getCurrentUser();

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        description?: string;
        restartRequired?: boolean;
        warning: { enabled: boolean; message?: string; };
    }
    > = [
            {
                key: "useQuickCss",
                title: "Enable Custom CSS",
                description: "Load custom CSS from the QuickCSS editor. This allows you to customize Discord's appearance with your own styles.",
                restartRequired: true,
                warning: { enabled: false },
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "Enable React Developer Tools",
                description: "Enable the React Developer Tools extension for debugging Discord's React components. Useful for plugin development.",
                restartRequired: true,
                warning: { enabled: false },
            },
            !IS_WEB &&
            (!IS_DISCORD_DESKTOP || !IS_WINDOWS
                ? {
                    key: "frameless",
                    title: "Disable the Window Frame",
                    description: "Remove the native window frame for a cleaner look. You can still move the window by dragging the title bar area.",
                    restartRequired: true,
                    warning: { enabled: false },
                }
                : {
                    key: "winNativeTitleBar",
                    title: "Use Windows' native title bar instead of Discord's custom one",
                    description: "Replace Discord's custom title bar with the standard Windows title bar. This may improve compatibility with some window management tools.",
                    restartRequired: true,
                    warning: { enabled: false },
                }),
            !IS_WEB && {
                key: "transparent",
                title: "Enable Window Transparency",
                description: "Make the Discord window transparent. A theme that supports transparency is required or this will do nothing.",
                restartRequired: true,
                warning: {
                    enabled: true,
                    message: IS_WINDOWS
                        ? "This will stop the window from being resizable and prevents you from snapping the window to screen edges."
                        : "This will stop the window from being resizable.",
                },
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: "Disable Minimum Window Size",
                description: "Allow the Discord window to be resized smaller than its default minimum size. Useful for tiling window managers or small screens.",
                restartRequired: true,
                warning: { enabled: false },
            },
            !IS_WEB &&
            IS_WINDOWS && {
                key: "winCtrlQ",
                title: "Register Ctrl+Q as shortcut to close Discord",
                description: "Add Ctrl+Q as a keyboard shortcut to close Discord. This provides an alternative to Alt+F4 for quickly closing the application.",
                restartRequired: true,
                warning: { enabled: false },
            },
        ];

    return (
        <SettingsTab>
            {(isEquicordDonor(user?.id) || isVencordDonor(user?.id)) ? (
                <SpecialCard
                    title="Donations"
                    subtitle="Thank you for donating!"
                    description={
                        isEquicordDonor(user?.id) && isVencordDonor(user?.id)
                            ? "All Vencord users can see your Vencord donor badge, and Equicord users can see your Equicord donor badge. To change your Vencord donor badge, contact @vending.machine. For your Equicord donor badge, make a ticket in Equicord's server."
                            : isVencordDonor(user?.id)
                                ? "All Vencord users can see your badge! You can manage your perks by messaging @vending.machine."
                                : "All Equicord users can see your badge! You can manage your perks by making a ticket in Equicord's server."
                    }
                    cardImage={VENNIE_DONATOR_IMAGE}
                    backgroundImage={DONOR_BACKGROUND_IMAGE}
                    backgroundColor="#ED87A9"
                >
                    <DonateButtonComponent donated={true} />
                </SpecialCard>
            ) : (
                <SpecialCard
                    title="Support the Project"
                    description="Please consider supporting the development of Equicord by donating!"
                    cardImage={donateImage}
                    backgroundImage={DONOR_BACKGROUND_IMAGE}
                    backgroundColor="#c3a3ce"
                >
                    <DonateButtonComponent />
                </SpecialCard>
            )}
            {isAnyPluginDev(user?.id) && (
                <SpecialCard
                    title="Contributions"
                    subtitle="Thank you for contributing!"
                    description="Since you've contributed to Equicord you now have a cool new badge!"
                    cardImage={COZY_CONTRIB_IMAGE}
                    backgroundImage={CONTRIB_BACKGROUND_IMAGE}
                    backgroundColor="#EDCC87"
                >
                    <Button
                        variant="none"
                        size="medium"
                        type="button"
                        onClick={() => openContributorModal(user)}
                        className="vc-contrib-button"
                    >
                        <GithubIcon aria-hidden fill={"#000000"} className={"vc-contrib-github"} />
                        See what you've contributed to
                    </Button>
                </SpecialCard>
            )}

            <Heading className={Margins.top16}>Quick Actions</Heading>
            <Paragraph className={Margins.bottom16}>
                Common actions you might want to perform. These shortcuts give you quick access to frequently used features without navigating through menus.
            </Paragraph>

            <QuickActionCard>
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
                        text="Open Settings Folder"
                        action={() => VencordNative.settings.openFolder()}
                    />
                )}
                <QuickAction
                    Icon={GithubIcon}
                    text="View Source Code"
                    action={() =>
                        VencordNative.native.openExternal(
                            "https://github.com/" + gitRemote,
                        )
                    }
                />
            </QuickActionCard>

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Client Settings</Heading>
            <Paragraph className={Margins.bottom16}>
                Configure how Equicord behaves and integrates with Discord. These settings affect the Discord client's appearance and behavior.
            </Paragraph>
            <Notice.Info className={Margins.bottom20} style={{ width: "100%" }}>
                You can customize where this settings section appears in Discord's settings menu by configuring the{" "}
                <a
                    role="button"
                    onClick={() => openPluginModal(plugins.Settings)}
                    style={{ cursor: "pointer", color: "var(--text-link)" }}
                >
                    Settings Plugin
                </a>.
            </Notice.Info>

            {Switches.filter((s): s is Exclude<typeof s, false> => !!s).map(
                s => (
                    <FormSwitch
                        key={s.key}
                        value={settings[s.key]}
                        onChange={v => (settings[s.key] = v)}
                        title={s.title}
                        description={
                            s.warning.enabled ? (
                                <>
                                    {s.description}
                                    <Notice.Warning className={Margins.top8} style={{ width: "100%" }}>
                                        {s.warning.message}
                                    </Notice.Warning>
                                </>
                            ) : (
                                s.description
                            )
                        }
                        hideBorder
                    />
                ),
            )}

            {needsVibrancySettings && (
                <>
                    <Divider className={Margins.top20} />

                    <Heading className={Margins.top20}>Window Vibrancy</Heading>
                    <Paragraph className={Margins.bottom16}>
                        Customize the macOS window vibrancy effect. This controls the blur and transparency style of the Discord window. Changes require a restart to take effect.
                    </Paragraph>
                    <Select
                        className={Margins.bottom20}
                        placeholder="Window vibrancy style"
                        options={[
                            // Sorted from most opaque to most transparent
                            {
                                label: "No vibrancy",
                                value: undefined,
                            },
                            {
                                label: "Under Page (window tinting)",
                                value: "under-page",
                            },
                            {
                                label: "Content",
                                value: "content",
                            },
                            {
                                label: "Window",
                                value: "window",
                            },
                            {
                                label: "Selection",
                                value: "selection",
                            },
                            {
                                label: "Titlebar",
                                value: "titlebar",
                            },
                            {
                                label: "Header",
                                value: "header",
                            },
                            {
                                label: "Sidebar",
                                value: "sidebar",
                            },
                            {
                                label: "Tooltip",
                                value: "tooltip",
                            },
                            {
                                label: "Menu",
                                value: "menu",
                            },
                            {
                                label: "Popover",
                                value: "popover",
                            },
                            {
                                label: "Fullscreen UI (transparent but slightly muted)",
                                value: "fullscreen-ui",
                            },
                            {
                                label: "HUD (Most transparent)",
                                value: "hud",
                            },
                        ]}
                        select={v => (settings.macosVibrancyStyle = v)}
                        isSelected={v => settings.macosVibrancyStyle === v}
                        serialize={identity}
                    />
                </>
            )}

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Notifications</Heading>
            <Paragraph className={Margins.bottom16}>
                Configure how Equicord handles notifications. You can customize when and how you receive alerts, or view a history of past notifications.
            </Paragraph>

            <Flex gap="16px">
                <Button onClick={openNotificationSettingsModal}>
                    Notification Settings
                </Button>
                <Button variant="secondary" onClick={openNotificationLogModal}>
                    View Notification Log
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(EquicordSettings, "Equicord Settings");

export function isEquicordDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getEquicordDonorBadges(userId);
    return GuildMemberStore.getMember(GUILD_ID, userId)?.roles.includes(DONOR_ROLE_ID) || !!donorBadges;
}

export function isVencordDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getDonorBadges(userId);
    return GuildMemberStore.getMember(VC_GUILD_ID, userId)?.roles.includes(VC_DONOR_ROLE_ID) || !!donorBadges;
}
