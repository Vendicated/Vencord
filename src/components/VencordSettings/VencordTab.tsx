/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./VencordTab.css";

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import DonateButton, { InviteButton } from "@components/DonateButton";
import { openContributorModal } from "@components/PluginSettings/ContributorModal";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { gitRemote } from "@shared/vencordUserAgent";
import { DONOR_ROLE_ID, GUILD_ID, VC_DONOR_ROLE_ID, VC_GUILD_ID } from "@utils/constants";
import { Margins } from "@utils/margins";
import { identity, isEquicordPluginDev, isPluginDev } from "@utils/misc";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { Button, Forms, GuildMemberStore, React, Select, Switch, UserStore } from "@webpack/common";

import BadgeAPI from "../../plugins/_api/badges";
import { Flex, FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "..";
import { openNotificationSettingsModal } from "./NotificationSettings";
import { QuickAction, QuickActionCard } from "./quickActions";
import { SettingsTab, wrapTab } from "./shared";
import { SpecialCard } from "./SpecialCard";

const cl = classNameFactory("vc-settings-");

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://i.imgur.com/57ATLZu.png";

const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const COZY_CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1026533070955872337.png";

const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070166481895484.png?size=2048";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function EquicordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(VencordNative.settings.getSettingsDir, {
        fallbackValue: "Loading..."
    });
    const settings = useSettings();

    const discordInvite = "bFp57wxCkv";
    const vcDiscordInvite = "https://discord.gg/KGgvd6jPFu";
    const donateImage = React.useMemo(
        () => (Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE),
        [],
    );

    const isWindows = navigator.platform.toLowerCase().startsWith("win");
    const isMac = navigator.platform.toLowerCase().startsWith("mac");
    const needsVibrancySettings = IS_DISCORD_DESKTOP && isMac;

    const user = UserStore.getCurrentUser();

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        note: string;
        warning: { enabled: boolean; message?: string; };
    }
    > = [
            {
                key: "useQuickCss",
                title: "Enable Custom CSS",
                note: "Loads your Custom CSS",
                warning: { enabled: false },
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "Enable React Developer Tools",
                note: "Requires a full restart",
                warning: { enabled: false },
            },
            !IS_WEB &&
            (!IS_DISCORD_DESKTOP || !isWindows
                ? {
                    key: "frameless",
                    title: "Disable the window frame",
                    note: "Requires a full restart",
                    warning: { enabled: false },
                }
                : {
                    key: "winNativeTitleBar",
                    title:
                        "Use Windows' native title bar instead of Discord's custom one",
                    note: "Requires a full restart",
                    warning: { enabled: false },
                }),
            !IS_WEB && {
                key: "transparent",
                title: "Enable window transparency.",
                note: "You need a theme that supports transparency or this will do nothing. Requires a full restart!",
                warning: {
                    enabled: isWindows,
                    message: "Enabling this will prevent you from snapping this window.",
                },
            },
            !IS_WEB &&
            isWindows && {
                key: "winCtrlQ",
                title:
                    "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)",
                note: "Requires a full restart",
                warning: { enabled: false },
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: "Disable minimum window size",
                note: "Requires a full restart",
                warning: { enabled: false },
            },
        ];

    return (
        <SettingsTab title="Equicord Settings">
            {(isDonor(user?.id) || isVCDonor(user?.id)) ? (
                <SpecialCard
                    title="Donations"
                    subtitle="Thank you for donating!"
                    description={
                        isDonor(user?.id) && isVCDonor(user?.id)
                            ? "All Vencord users can see your Vencord donor badge, and Equicord users can see your Equicord donor badge. To change your Vencord donor badge, contact @vending.machine. For your Equicord donor badge, make a ticket in Equicord's server."
                            : isVCDonor(user?.id)
                                ? "All Vencord users can see your badge! You can change it at any time by messaging @vending.machine."
                                : "All Equicord users can see your badge! You can change it at any time by making a ticket in Equicord's server."
                    }
                    cardImage={VENNIE_DONATOR_IMAGE}
                    backgroundImage={DONOR_BACKGROUND_IMAGE}
                    backgroundColor="#ED87A9"
                >
                    <DonateButtonComponent />
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
            {isPluginDev(user?.id) || isEquicordPluginDev(user?.id) && (
                <SpecialCard
                    title="Contributions"
                    subtitle="Thank you for contributing!"
                    description="Since you've contributed to Equicord you now have a cool new badge!"
                    cardImage={COZY_CONTRIB_IMAGE}
                    backgroundImage={CONTRIB_BACKGROUND_IMAGE}
                    backgroundColor="#EDCC87"
                    buttonTitle="See what you've contributed to"
                    buttonOnClick={() => openContributorModal(user)}
                />
            )}
            <Forms.FormSection title="Quick Actions">
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
                            action={() => showItemInFolder(settingsDir)}
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
            </Forms.FormSection>

            <Forms.FormDivider />

            <Forms.FormSection className={Margins.top16} title="Settings" tag="h5">
                <Forms.FormText
                    className={Margins.bottom20}
                    style={{ color: "var(--text-muted)" }}
                >
                    Hint: You can change the position of this settings section in the{" "}
                    <Button
                        look={Button.Looks.BLANK}
                        style={{ color: "var(--text-link)", display: "inline-block" }}
                        onClick={() => openPluginModal(Vencord.Plugins.plugins.Settings)}
                    >
                        settings of the Settings plugin
                    </Button>
                    !
                </Forms.FormText>

                {Switches.map(
                    s =>
                        s && (
                            <Switch
                                key={s.key}
                                value={settings[s.key]}
                                onChange={v => (settings[s.key] = v)}
                                note={
                                    s.warning.enabled ? (
                                        <>
                                            {s.note}
                                            <div className="form-switch-warning">
                                                {s.warning.message}
                                            </div>
                                        </>
                                    ) : (
                                        s.note
                                    )
                                }
                            >
                                {s.title}
                            </Switch>
                        ),
                )}
            </Forms.FormSection>

            {needsVibrancySettings && (
                <>
                    <Forms.FormTitle tag="h5">
                        Window vibrancy style (requires restart)
                    </Forms.FormTitle>
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

            <Forms.FormSection
                className={Margins.top16}
                title="Equicord Notifications"
                tag="h5"
            >
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

function DonateButtonComponent() {
    return (
        <Flex>
            <DonateButton
                look={Button.Looks.FILLED}
                color={Button.Colors.TRANSPARENT}
                style={{ marginTop: "1em" }} />
            <InviteButton
                look={Button.Looks.FILLED}
                color={Button.Colors.TRANSPARENT}
                style={{ marginTop: "1em" }} />
        </Flex>
    );
}

function isVCDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getDonorBadges(userId);
    return GuildMemberStore.getMember(VC_GUILD_ID, userId)?.roles.includes(VC_DONOR_ROLE_ID) || !!donorBadges;
}

function isDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getDonorBadges(userId);
    return GuildMemberStore.getMember(GUILD_ID, userId)?.roles.includes(DONOR_ROLE_ID) || !!donorBadges;
}

export default wrapTab(EquicordSettings, "Equicord Settings");
