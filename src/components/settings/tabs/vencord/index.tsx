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
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "@components/index";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SpecialCard } from "@components/settings/SpecialCard";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { openContributorModal } from "@components/settings/tabs/plugins/ContributorModal";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { gitRemote } from "@shared/vencordUserAgent";
import { IS_MAC, IS_WINDOWS } from "@utils/constants";
import { Margins } from "@utils/margins";
import { isPluginDev } from "@utils/misc";
import { relaunch } from "@utils/native";
import { t, Translate } from "@utils/translation";
import { Alerts, Forms, React, useMemo, UserStore } from "@webpack/common";

import { DonateButtonComponent, isDonor } from "./DonateButton";
import { VibrancySettings } from "./MacVibrancySettings";
import { NotificationSection } from "./NotificationSettings";

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1039992459209490513.png";
const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const COZY_CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1026533070955872337.png";
const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070166481895484.png?size=2048";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function Switches() {
    const settings = useSettings(["useQuickCss", "enableReactDevtools", "frameless", "winNativeTitleBar", "transparent", "winCtrlQ", "disableMinSize"]);

    const Switches = [
        {
            key: "useQuickCss",
            title: t("vencord.settings.useQuickCss.title"),
            note: t("vencord.settings.useQuickCss.note")
        },
        !IS_WEB && {
            key: "enableReactDevtools",
            title: t("vencord.settings.enableReactDevtools.title"),
            restartRequired: true
        },
        !IS_WEB && (!IS_DISCORD_DESKTOP || !IS_WINDOWS ? {
            key: "frameless",
            title: t("vencord.settings.frameless.title"),
            restartRequired: true
        } : {
            key: "winNativeTitleBar",
            title: t("vencord.settings.winNativeTitleBar.title"),
            restartRequired: true
        }),
        !IS_WEB && {
            key: "transparent",
            title: t("vencord.settings.transparent.title"),
            note: t("vencord.settings.transparent.note")
        },
        !IS_WEB && IS_WINDOWS && {
            key: "winCtrlQ",
            title: t("vencord.settings.winCtrlQ.title"),
            restartRequired: true
        },
        IS_DISCORD_DESKTOP && {
            key: "disableMinSize",
            title: t("vencord.settings.disableMinSize.title"),
            restartRequired: true
        },
    ] satisfies Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        description?: string;
        restartRequired?: boolean;
    }>;

    return Switches.map(setting => {
        if (!setting) {
            return null;
        }

        const { key, title, description, restartRequired } = setting;

        return (
            <FormSwitch
                key={key}
                title={title}
                description={description}
                value={settings[key]}
                onChange={v => {
                    settings[key] = v;

                    if (restartRequired) {
                        Alerts.show({
                            title: "Restart Required",
                            body: "A restart is required to apply this change",
                            confirmText: "Restart now",
                            cancelText: "Later!",
                            onConfirm: relaunch
                        });
                    }
                }}
            />
        );
    });
}

function VencordSettings() {
    const donateImage = useMemo(() =>
        Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE,
        []
    );

    const needsVibrancySettings = IS_DISCORD_DESKTOP && IS_MAC;

    const user = UserStore?.getCurrentUser();

    return (
        <SettingsTab title={t("vencord.tabs.settings")}>
            {isDonor(user?.id)
                ? (
                    <SpecialCard
                        title={t("vencord.donorCard.donated.title")}
                        subtitle={t("vencord.donorCard.donated.subtitle")}
                        description={t("vencord.donorCard.donated.description")}
                        cardImage={VENNIE_DONATOR_IMAGE}
                        backgroundImage={DONOR_BACKGROUND_IMAGE}
                        backgroundColor="#ED87A9"
                    >
                        <DonateButtonComponent />
                    </SpecialCard>
                )
                : (
                    <SpecialCard
                        title={t("vencord.donorCard.notDonated.title")}
                        description={t("vencord.donorCard.notDonated.description")}
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
                    title={t("vencord.contributorCard.title")}
                    subtitle={t("vencord.contributorCard.subtitle")}
                    description={t("vencord.contributorCard.description")}
                    cardImage={COZY_CONTRIB_IMAGE}
                    backgroundImage={CONTRIB_BACKGROUND_IMAGE}
                    backgroundColor="#EDCC87"
                    buttonTitle={t("vencord.contributorCard.contributionsButton")}
                    buttonOnClick={() => openContributorModal(user)}
                />
            )}

            <section>
                <Forms.FormTitle tag="h5">{t("vencord.quickActions.title")}</Forms.FormTitle>
                <QuickActionCard>
                    <QuickAction
                        Icon={LogIcon}
                        text={t("vencord.quickActions.notificationLog")}
                        action={openNotificationLogModal}
                    />
                    <QuickAction
                        Icon={PaintbrushIcon}
                        text={t("vencord.quickActions.editQuickCSS")}
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                    {!IS_WEB && (
                        <>
                            <QuickAction
                                Icon={RestartIcon}
                                text={t("vencord.quickActions.relaunchDiscord")}
                                action={relaunch}
                            />
                            <QuickAction
                                Icon={FolderIcon}
                                text={t("vencord.quickActions.openSettings")}
                                action={() => VencordNative.settings.openFolder()}
                            />
                        </>
                    )}
                    <QuickAction
                        Icon={GithubIcon}
                        text={t("vencord.quickActions.viewSource")}
                        action={() => VencordNative.native.openExternal("https://github.com/" + gitRemote)}
                    />
                </QuickActionCard>
            </section>

            <Divider />

            <section className={Margins.top16}>
                <Forms.FormTitle tag="h5">{t("vencord.settings.title")}</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom20} style={{ color: "var(--text-muted)" }}>
                    <Translate i18nKey="vencord.settings.hint">
                        Hint: You can change the position of this settings section in the
                        <a onClick={() => openPluginModal(Vencord.Plugins.plugins.Settings)}>
                            settings of the Settings plugin
                        </a>!
                    </Translate>
                </Forms.FormText>

                <Switches />
            </section>

            {needsVibrancySettings && <VibrancySettings />}

            <NotificationSection />
        </SettingsTab>
    );
}

export default wrapTab(VencordSettings, t("vencord.tabs.settings"));
