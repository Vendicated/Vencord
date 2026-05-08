/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JSX } from "react";

import { getQuestifySettings, useQuestifySettings } from "../settings/access";
import { autoCompleteQuestTaskTypes, defaultAllowChangingDangerousSettings, defaultAutoCompleteQuestsSimultaneously, defaultAutoCompleteQuestTypes, defaultCompleteVideoQuestsQuicker, defaultMakeMobileVideoQuestsDesktopCompatible, defaultResumeInterruptedQuests, isDesktopCompatible } from "../settings/def";
import { QuestTaskType } from "../utils/types";
import { Alerts, q } from "../utils/ui";
import { ManaButton, type ManaSelectOption, SettingsCard, SettingsDescription, SettingsHeader, SettingsNotice, SettingsParagraph, SettingsSelect, SettingsSubheader, SettingsSubtleSwitch } from "./shared";

type QuestDisableSettingKey =
    | "disableAccountPanelPromo"
    | "disableAccountPanelQuestProgress"
    | "disableFriendsListPromo"
    | "disableMembersListPromo"
    | "disableOrbsAndQuestsBadges"
    | "disableRelocationNotices"
    | "disableSponsoredBanner";

type QuestModifySettingKey =
    | "autoCompleteQuestsSimultaneously"
    | "resumeInterruptedQuests"
    | "completeVideoQuestsQuicker"
    | "makeMobileVideoQuestsDesktopCompatible";

interface QuestDisableOption {
    key: QuestDisableSettingKey;
    label: string;
}

const disableFeatureOptions = [
    {
        key: "disableSponsoredBanner",
        label: "Sponsored Banner",
    },
    {
        key: "disableRelocationNotices",
        label: "Relocation Notices",
    },
    {
        key: "disableFriendsListPromo",
        label: "Friends List Promo",
    },
    {
        key: "disableMembersListPromo",
        label: "Members List Promo",
    },
    {
        key: "disableAccountPanelPromo",
        label: "Account Panel Promo",
    },
    {
        key: "disableAccountPanelQuestProgress",
        label: "Account Panel Progress",
    },
    {
        key: "disableOrbsAndQuestsBadges",
        label: "Quest & Orbs Badges",
    },
] as const satisfies readonly QuestDisableOption[];

const disableManaOptions: ManaSelectOption[] = disableFeatureOptions.map(({ key, label }) => ({
    id: key,
    label,
    value: key,
}));

const autoCompleteQuestTypeLabels = {
    [QuestTaskType.WATCH_VIDEO]: "Watch Video",
    [QuestTaskType.WATCH_VIDEO_ON_MOBILE]: "Watch Video on Mobile",
    [QuestTaskType.ACHIEVEMENT_IN_ACTIVITY]: "Achievement in Activity",
    [QuestTaskType.PLAY_ACTIVITY]: "Play Activity",
    [QuestTaskType.PLAY_ON_DESKTOP]: "Play on Desktop",
    [QuestTaskType.PLAY_ON_PLAYSTATION]: "Play on PlayStation",
    [QuestTaskType.PLAY_ON_XBOX]: "Play on Xbox",
} as const satisfies Record<typeof autoCompleteQuestTaskTypes[number], string>;

const autoCompleteQuestTypeOptions = autoCompleteQuestTaskTypes.map(questType => ({
    label: autoCompleteQuestTypeLabels[questType],
    value: questType,
})) satisfies { label: string; value: QuestTaskType; }[];

const autoCompleteQuestTypeManaOptions: ManaSelectOption[] = autoCompleteQuestTypeOptions.map(({ label, value }) => ({
    id: String(value),
    label,
    value: String(value),
    disabled: !isDesktopCompatible(value),
}));

interface SettingsAllowDangerousButtonProps {
    allowed: boolean;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

function SettingsAllowDangerousButton({
    allowed,
    disabled,
    onClick,
}: SettingsAllowDangerousButtonProps): JSX.Element {
    return (
        <div className={q("settings-button", "allow-dangerous-button")}>
            <ManaButton
                text={allowed
                    ? "Reset and disallow changing dangerous settings..."
                    : "Allow changing dangerous settings..."}
                variant={allowed ? "critical-secondary" : "critical-primary"}
                fullWidth={true}
                disabled={disabled}
                onClick={onClick}
                size="sm"
            />
        </div>
    );
}

export function QuestFeaturesSetting(): JSX.Element {
    const questFeatures = useQuestifySettings([
        "disableQuestsEverything",
        "disableSponsoredBanner",
        "disableRelocationNotices",
        "disableFriendsListPromo",
        "disableMembersListPromo",
        "disableAccountPanelPromo",
        "disableAccountPanelQuestProgress",
        "disableOrbsAndQuestsBadges",
        "resumeInterruptedQuests",
        "allowChangingDangerousSettings",
        "makeMobileVideoQuestsDesktopCompatible",
        "autoCompleteQuestsSimultaneously",
        "autoCompleteQuestTypes",
        "completeVideoQuestsQuicker",
    ]);

    const selectedDisableValues = disableFeatureOptions
        .filter(({ key }) => questFeatures[key])
        .map(({ key }) => key);

    const selectedAutoCompleteQuestTypeValues = autoCompleteQuestTypeOptions
        .filter(({ value }) => isDesktopCompatible(value) && questFeatures.autoCompleteQuestTypes[value] === true)
        .map(({ value }) => String(value));

    function updateDisableValue(value: string | string[] | null) {
        const selectedKeys = new Set(Array.isArray(value) ? value : value ? [value] : []);

        for (const { key } of disableFeatureOptions) {
            getQuestifySettings()[key] = selectedKeys.has(key);
        }
    }

    function confirmDangerousSettingChange(body: string, onConfirm: () => void) {
        Alerts.show({
            title: "Are you sure?",
            body,
            confirmText: "Continue",
            confirmVariant: "critical-primary",
            cancelText: "Cancel",
            onConfirm,
        });
    }

    function updateAutoCompleteQuestTypes(value: string | string[] | null) {
        const selectedValues = new Set(Array.isArray(value) ? value : value ? [value] : []);
        const nextAutoCompleteQuestTypes = { ...defaultAutoCompleteQuestTypes };

        for (const { value: questType } of autoCompleteQuestTypeOptions) {
            const nextValue = selectedValues.has(String(questType))
                && isDesktopCompatible(questType);

            nextAutoCompleteQuestTypes[questType] = nextValue;
        }

        getQuestifySettings().autoCompleteQuestTypes = nextAutoCompleteQuestTypes;
    }

    function updateDisableEverything(checked: boolean) {
        function setDisableEverything() {
            getQuestifySettings().disableQuestsEverything = checked;
        }

        if (checked) {
            confirmDangerousSettingChange(
                "This will completely disable Quest functionality.",
                () => {
                    resetDangerousSettings();
                    setDisableEverything();
                }
            );
        } else {
            setDisableEverything();
        }
    }

    function resetDangerousSettings() {
        const settings = getQuestifySettings();

        settings.allowChangingDangerousSettings = defaultAllowChangingDangerousSettings;
        settings.autoCompleteQuestsSimultaneously = defaultAutoCompleteQuestsSimultaneously;
        settings.completeVideoQuestsQuicker = defaultCompleteVideoQuestsQuicker;
        settings.makeMobileVideoQuestsDesktopCompatible = defaultMakeMobileVideoQuestsDesktopCompatible;
        settings.resumeInterruptedQuests = defaultResumeInterruptedQuests;
        settings.autoCompleteQuestTypes = { ...defaultAutoCompleteQuestTypes };
    }

    function updateDangerousAccess(checked: boolean) {
        function setDangerousAccess() {
            getQuestifySettings().allowChangingDangerousSettings = checked;
        }

        if (checked) {
            confirmDangerousSettingChange(
                "This will allow changing dangerous settings.",
                setDangerousAccess
            );
        } else {
            resetDangerousSettings();
            setDangerousAccess();
        }
    }

    function updateModifyValue(key: QuestModifySettingKey, checked: boolean) {
        getQuestifySettings()[key] = checked;
    }

    return (
        <SettingsCard>
            <SettingsHeader> Quest Features </SettingsHeader>
            <SettingsDescription> Modify how Quests behave to enhance or remove functionality. </SettingsDescription>
            <SettingsSubheader> Disable Features </SettingsSubheader>
            <SettingsSubtleSwitch
                checked={questFeatures.disableQuestsEverything}
                label="Completely disable Quest functionality:"
                onChange={updateDisableEverything}
                bottomSpacing="10"
                tooltip={{
                    position: "top",
                    text: "This will disable all plugin enhancements, hide the Quests page and Quest elements across Discord, and prevent Discord from fetching Quest data. This will not affect the shop as Orbs are too intrinsically tied to it as a secondary currency."
                }}
            />
            <SettingsSelect
                label="Disable specific features:"
                wrapTags={true}
                options={disableManaOptions}
                value={selectedDisableValues}
                closeOnSelect={false}
                maxOptionsVisible={7}
                selectionMode="multiple"
                disabled={questFeatures.disableQuestsEverything}
                onSelectionChange={updateDisableValue}
                tooltip={{
                    position: "top",
                    text: "Sponsored Banner is a paid-for Quest banner at the top of the Quests page."
                        + "\n\nRelocation Notices are indicators such as in the Discovery page about Quests moving to DMs."
                        + "\n\nFriends List Promo is a card that displays on the \"Active Now\" section of your Friends List while a user you share a server with is playing a game with an active Quest."
                        + "\n\nMembers List Promo is an icon that displays on members in a server's Members List while they are playing a game with an active Quest."
                        + "\n\nAccount Panel Promo is a paid-for Quest promotion that appears above your user account panel."
                        + "\n\nAccount Panel Progress is the active or completed Quest progress shown above your user account panel."
                        + "\n\nQuest & Orbs Badges are badges on user profiles for when someone has completed at least one Quest or bought the Orbs badge respectively."
                }}
            />
            <SettingsSubheader> Modify Features </SettingsSubheader>
            <SettingsNotice className={["notice-card-red", questFeatures.disableQuestsEverything ? "dimmed-settings-item" : undefined, questFeatures.allowChangingDangerousSettings ? undefined : "notice-card-solo", "no-bottom-margin"].filter(c => c !== undefined)}>
                <SettingsParagraph>
                    Discord has began issuing warnings to users of scripts or plugins that modify how Quests are completed, which is against their <a href="https://discord.com/safety/platform-manipulation-policy-explainer" target="_blank" rel="noreferrer">Terms of Service</a>.
                </SettingsParagraph>
                <br />
                <SettingsParagraph>
                    The warnings appear limited to threat of loss of access to Quests or their rewards, but Discord may escalate at any time.
                </SettingsParagraph>
                <br />
                <SettingsParagraph>
                    Due to the various methods Discord uses to track users, there's no way to realistically evade detection. If you proceed, understand that Discord likely will detect it at some point.
                </SettingsParagraph>
                <br />
                <SettingsParagraph>
                    Use the following toggle to access potentially dangerous settings at your own risk.
                </SettingsParagraph>
                <SettingsAllowDangerousButton
                    allowed={questFeatures.allowChangingDangerousSettings}
                    disabled={questFeatures.disableQuestsEverything}
                    onClick={() => updateDangerousAccess(!questFeatures.allowChangingDangerousSettings)}
                />
                {questFeatures.allowChangingDangerousSettings && <>
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.completeVideoQuestsQuicker}
                        label="Accelerate Video Quest auto-completion:"
                        onChange={checked => updateModifyValue("completeVideoQuestsQuicker", checked)}
                        topSpacing="10"
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: "Discord allows Video Quests to be completed once 24 seconds less than the duration of the video has passed since you enrolled into the Quest."
                                + "\n\nThis means that if a Video Quest is 24 seconds or less, or if you enroll in a Video Quest and return later to complete it, it can be completed immediately."
                                + "\n\nThis setting will only apply to auto-completing Video Quests and relies on the auto-complete setting below. Manually completing Video Quests will still require waiting the full duration and is not dependent on enrollment time."
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.makeMobileVideoQuestsDesktopCompatible}
                        label="Make some mobile-only Video Quests completable on desktop:"
                        onChange={checked => updateModifyValue("makeMobileVideoQuestsDesktopCompatible", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: "Some mobile-only Video Quests can be enrolled in on desktop, but still must be completed on mobile. This setting will allow those to be completed on desktop."
                                + "\n\nSome mobile-only Video Quests are only enrollable on mobile. For this setting to affect those, you must enroll in those Quests on your mobile device before returning to desktop and refreshing your Quests."
                                + "\n\nThis setting, when enabled independently, applies only to manually completing Video Quests. Auto-completing mobile Video Quests from desktop relies on the auto-complete setting below, and will implicitly enable this setting as well."
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.autoCompleteQuestsSimultaneously}
                        label="Auto-complete Quests simultaneously rather than sequentially:"
                        onChange={checked => updateModifyValue("autoCompleteQuestsSimultaneously", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: "By default, attempting to auto-complete multiple Quests will queue them to be completed in order."
                                + "\n\nThis setting will alternatively allow all auto-complete Quests to run at the same time."
                                + "\n\nThis setting will only apply to auto-completing Quests and relies on the auto-complete setting below."
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.resumeInterruptedQuests}
                        label="Resume interrupted auto-completions after a reload or restart:"
                        onChange={checked => updateModifyValue("resumeInterruptedQuests", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: "This setting will automatically resume any interrupted auto-completions caused by reloads or restarts, including requeuing Quests which had yet to start auto-completing but had been queued."
                        }}
                    />
                    <SettingsSelect
                        label="Auto-complete specific Quest types:"
                        labelClassName="margin-top-9"
                        wrapTags={true}
                        options={autoCompleteQuestTypeManaOptions}
                        value={selectedAutoCompleteQuestTypeValues}
                        closeOnSelect={false}
                        maxOptionsVisible={7}
                        selectionMode="multiple"
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        onSelectionChange={updateAutoCompleteQuestTypes}
                        tooltip={{
                            position: "top",
                            wider: true,
                            text: "Watch Video on Mobile Quests will only work on mobile Quests which are enrollable on desktop. If a Quest is locked to enrollment on mobile, you must first enroll in it on your mobile device before returning to desktop and refreshing your Quests."
                                + "\n\nAll video related Quests usually send a stack trace with the progress reports. This means Discord would know exactly which functions were called, and can therefore verify that their own functions initiated the progress. Questify erases this stack trace, but the absence of it will be just as telling as its presence."
                                + "\n\nPlay on Desktop, Play on PlayStation, Play on Xbox, and Play Activity Quests are only available on official desktop clients due to a limitation imposed by Discord. 3rd party clients such as web extensions, Vesktop, Equibop, and others, do not support auto-completing these Quest types."
                                + "\n\nAll game related Quests usually send a game fingerprint with the heartbeat reports. This means Discord can use data from tens of thousands of users to determine whether other users are likely using a real game or are emulating the executable. There is no reasonable method to spoof this value, so Questify leaves it blank, but the absence of it will be just as telling as poorly spoofing the value."
                                + "\n\nAchievement in Activity Quests can only be auto-completed by completing them immediately. This method may be patched at any time."
                                + "\n\nAuto-completing Quests is done by clicking their respective buttons on the Quests page. Quests will be auto-completed in the order they were queued, unless the simultaneous completion setting is enabled above."
                                + "\n\nAuto-completing Quests is the riskiest dangerous setting available. Enable it at your own risk."
                        }}
                    />
                </>}
            </SettingsNotice>
        </SettingsCard>
    );
}
