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

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import DonateButton from "@components/DonateButton";
import { openContributorModal } from "@components/PluginSettings/ContributorModal";
import { openPluginModal } from "@components/PluginSettings/PluginModal";
import { getLanguage } from "@languages/Language";
import { gitRemote } from "@shared/vencordUserAgent";
import { DONOR_ROLE_ID, VENCORD_GUILD_ID } from "@utils/constants";
import { Margins } from "@utils/margins";
import { identity, isPluginDev } from "@utils/misc";
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

const langData = getLanguage("components");

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1039992459209490513.png";

const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const COZY_CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1026533070955872337.png";

const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070166481895484.png?size=2048";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function VencordSettings() {
    const l = langData.VencordSettings.VencordTab;
    const [settingsDir, , settingsDirPending] = useAwaiter(VencordNative.settings.getSettingsDir, {
        fallbackValue: l.loading
    });
    const settings = useSettings();

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    const isWindows = navigator.platform.toLowerCase().startsWith("win");
    const isMac = navigator.platform.toLowerCase().startsWith("mac");
    const needsVibrancySettings = IS_DISCORD_DESKTOP && isMac;

    const user = UserStore.getCurrentUser();

    const switchesData = l.Switches;

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        note: string;
    }> =
        [
            {
                key: "useQuickCss",
                title: switchesData.useQuickCssTitle,
                note: switchesData.useQuickCssNote
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: switchesData.enableReactDevtoolsTitle,
                note: switchesData.enableReactDevtoolsNote
            },
            !IS_WEB && (!IS_DISCORD_DESKTOP || !isWindows ? {
                key: "frameless",
                title: switchesData.framelessTitle,
                note: switchesData.framelessNote
            } : {
                key: "winNativeTitleBar",
                title: switchesData.winNativeTitleBarTitle,
                note: switchesData.winNativeTitleBarNote
            }),
            !IS_WEB && {
                key: "transparent",
                title: switchesData.transparentTitle,
                note: switchesData.transparentNote
            },
            !IS_WEB && isWindows && {
                key: "winCtrlQ",
                title: switchesData.winCtrlQTitle,
                note: switchesData.winCtrlQNote
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: switchesData.disableMinSizeTitle,
                note: switchesData.disableMinSizeNote
            },
        ];

    return (
        <SettingsTab title={l.title}>
            {isDonor(user?.id)
                ? (
                    <SpecialCard
                        title={l.isDonorTrue.title}
                        subtitle={l.isDonorTrue.subtitle}
                        description={l.isDonorTrue.description}
                        cardImage={VENNIE_DONATOR_IMAGE}
                        backgroundImage={DONOR_BACKGROUND_IMAGE}
                        backgroundColor="#ED87A9"
                    >
                        <DonateButtonComponent />
                    </SpecialCard>
                )
                : (
                    <SpecialCard
                        title={l.isDonorFalse.title}
                        description={l.isDonorFalse.description}
                        cardImage={donateImage}
                        backgroundImage={DONOR_BACKGROUND_IMAGE}
                        backgroundColor="#c3a3ce"
                    >
                        <DonateButtonComponent />
                    </SpecialCard>
                )
            }
            {isPluginDev(user?.id) && (
                <SpecialCard
                    title={l.isPluginDev.title}
                    subtitle={l.isPluginDev.subtitle}
                    description={l.isPluginDev.description}
                    cardImage={COZY_CONTRIB_IMAGE}
                    backgroundImage={CONTRIB_BACKGROUND_IMAGE}
                    backgroundColor="#EDCC87"
                    buttonTitle={l.isPluginDev.buttonTitle}
                    buttonOnClick={() => openContributorModal(user)}
                />
            )}

            <Forms.FormSection title={l.QuickActionCard.title}>
                <QuickActionCard>
                    <QuickAction
                        Icon={LogIcon}
                        text={l.QuickActionCard.notificationLog}
                        action={openNotificationLogModal}
                    />
                    <QuickAction
                        Icon={PaintbrushIcon}
                        text={l.QuickActionCard.editQuickCSS}
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                    {!IS_WEB && (
                        <QuickAction
                            Icon={RestartIcon}
                            text={l.QuickActionCard.relaunchDS}
                            action={relaunch}
                        />
                    )}
                    {!IS_WEB && (
                        <QuickAction
                            Icon={FolderIcon}
                            text={l.QuickActionCard.settingsFolder}
                            action={() => showItemInFolder(settingsDir)}
                        />
                    )}
                    <QuickAction
                        Icon={GithubIcon}
                        text={l.QuickActionCard.sourceCode}
                        action={() => VencordNative.native.openExternal("https://github.com/" + gitRemote)}
                    />
                </QuickActionCard>
            </Forms.FormSection>

            <Forms.FormDivider />

            <Forms.FormSection className={Margins.top16} title={l.SettingsPosition.title} tag="h5">
                <Forms.FormText className={Margins.bottom20} style={{ color: "var(--text-muted)" }}>
                    {l.SettingsPosition.description}
                    {" "}<Button
                        look={Button.Looks.BLANK}
                        style={{ color: "var(--text-link)", display: "inline-block" }}
                        onClick={() => openPluginModal(Vencord.Plugins.plugins.Settings)}
                    >
                        {l.SettingsPosition.link}
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
                <Forms.FormTitle tag="h5">{l.VibrancyStyle.title}</Forms.FormTitle>
                <Select
                    className={Margins.bottom20}
                    placeholder="Window vibrancy style"
                    options={[
                        // Sorted from most opaque to most transparent
                        {
                            label: l.VibrancyStyle.valueNull, value: undefined
                        },
                        {
                            label: l.VibrancyStyle.underPage,
                            value: "under-page"
                        },
                        {
                            label: l.VibrancyStyle.content,
                            value: "content"
                        },
                        {
                            label: l.VibrancyStyle.window,
                            value: "window"
                        },
                        {
                            label: l.VibrancyStyle.selection,
                            value: "selection"
                        },
                        {
                            label: l.VibrancyStyle.titlebar,
                            value: "titlebar"
                        },
                        {
                            label: l.VibrancyStyle.header,
                            value: "header"
                        },
                        {
                            label: l.VibrancyStyle.sidebar,
                            value: "sidebar"
                        },
                        {
                            label: l.VibrancyStyle.tooltip,
                            value: "tooltip"
                        },
                        {
                            label: l.VibrancyStyle.menu,
                            value: "menu"
                        },
                        {
                            label: l.VibrancyStyle.popover,
                            value: "popover"
                        },
                        {
                            label: l.VibrancyStyle.fullscreenUI,
                            value: "fullscreen-ui"
                        },
                        {
                            label: l.VibrancyStyle.hud,
                            value: "hud"
                        },
                    ]}
                    select={v => settings.macosVibrancyStyle = v}
                    isSelected={v => settings.macosVibrancyStyle === v}
                    serialize={identity} />
            </>}

            <Forms.FormSection className={Margins.top16} title={l.Notifications.title} tag="h5">
                <Flex>
                    <Button onClick={openNotificationSettingsModal}>
                        {l.Notifications.notificationSettings}
                    </Button>
                    <Button onClick={openNotificationLogModal}>
                        {l.Notifications.notificationSettings}
                    </Button>
                </Flex>
            </Forms.FormSection>
        </SettingsTab>
    );
}

function DonateButtonComponent() {
    return (
        <DonateButton
            look={Button.Looks.FILLED}
            color={Button.Colors.WHITE}
            style={{ marginTop: "1em" }}
        />
    );
}

function isDonor(userId: string): boolean {
    const donorBadges = BadgeAPI.getDonorBadges(userId);
    return GuildMemberStore.getMember(VENCORD_GUILD_ID, userId)?.roles.includes(DONOR_ROLE_ID) || !!donorBadges;
}

export default wrapTab(VencordSettings, langData.VencordSettings.VencordTab.title);
