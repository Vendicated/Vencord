/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Card } from "@components/Card";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { FormSwitch } from "@components/FormSwitch";
import { Heading, HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Activity } from "@vencord/discord-types";
import { ActivityFlags, ActivityType } from "@vencord/discord-types/enums";
import { PresenceStore, React, Select, SnowflakeUtils, TextInput, UserStore } from "@webpack/common";

import { AppIdSetting, makeEmptyAppId } from ".";

interface SettingsProps {
    appIds: AppIdSetting[];
    update: () => void;
    save: () => void;
}

function isValidSnowflake(v: string) {
    const regex = /^\d{17,20}$/;
    return regex.test(v) && !Number.isNaN(SnowflakeUtils.extractTimestamp(v));
}

export function ReplaceTutorial() {
    const activities: Activity[] = PresenceStore.getActivities(UserStore.getCurrentUser().id);
    return (
        <>
            <HeadingSecondary>IDs of currently running activities</HeadingSecondary>
            {
                activities.length === 0
                    ? <Paragraph>No running activities</Paragraph>
                    : activities.map(activity => {
                        const isSpotify = (activity.flags & (ActivityFlags.SYNC | ActivityFlags.PLAY)) === (ActivityFlags.SYNC | ActivityFlags.PLAY);
                        return !isSpotify
                            ? <Paragraph>{activity.name}: {activity.application_id}</Paragraph>
                            : null;
                    })
            }
            <HeadingSecondary className={Margins.top8}>Available variables</HeadingSecondary>
            <Paragraph>
                In all fields (except stream URL), you can put in variables that'll automatically be replaced by their original content:
                <pre style={{ fontFamily: "monospace" }}>
                    :name:, :details:, :state:
                    <br />
                    :large_image:, :large_text:, :small_image:, :small_text:
                </pre>
            </Paragraph>
            <HeadingSecondary className={Margins.top8}>More details</HeadingSecondary>
            <Paragraph>
                Leave a field empty to leave it as is.
                <br />
                Set a field to "null" to hide it on the presence.
                <br />
                You may need to reload Discord for changes to apply.
            </Paragraph>
        </>
    );
}

export function ReplaceSettings({ appIds, update, save }: SettingsProps) {
    async function onChange(val: string | boolean, index: number, key: string) {
        if (index === appIds.length - 1)
            appIds.push(makeEmptyAppId());

        appIds[index][key] = val;

        save();
        update();
    }

    return (
        <>
            {
                appIds.map((setting, i) =>
                    <Card style={{ padding: "1em", opacity: !setting.enabled ? "60%" : "" }} key={i}>
                        {
                            isValidSnowflake(setting.appId) ?
                                <FormSwitch
                                    title="Apply edits to app"
                                    value={setting.enabled}
                                    onChange={value => {
                                        onChange(value, i, "enabled");
                                    }}
                                    className={Margins.bottom8}
                                    hideBorder={true}
                                /> : <HeadingSecondary>Add new application</HeadingSecondary>
                        }
                        <Heading className={`${Margins.top8} ${Margins.bottom8}`}>Application ID</Heading>
                        <CheckedTextInput
                            value={setting.appId}
                            onChange={async v => {
                                onChange(v, i, "appId");
                            }}
                            validate={v =>
                                !v || isValidSnowflake(v) || "Invalid application ID"
                            }
                        />
                        {
                            isValidSnowflake(setting.appId) && <>
                                <Heading className={Margins.top8}>New activity type</Heading>
                                <Select
                                    options={[
                                        { label: "Playing", value: ActivityType.PLAYING },
                                        { label: "Watching", value: ActivityType.WATCHING },
                                        { label: "Listening", value: ActivityType.LISTENING },
                                        { label: "Competing", value: ActivityType.COMPETING },
                                        { label: "Streaming", value: ActivityType.STREAMING }
                                    ]}
                                    select={value => {
                                        onChange(value, i, "newActivityType");
                                    }}
                                    className={Margins.top8}
                                    isSelected={value => setting.newActivityType === value}
                                    serialize={identity}
                                />
                                {
                                    setting.newActivityType === ActivityType.STREAMING &&
                                    <>
                                        <Heading className={`${Margins.top8} ${Margins.bottom8}`}>Stream URL (must be YouTube or Twitch)</Heading>
                                        <CheckedTextInput
                                            value={setting.newStreamUrl}
                                            onChange={async v => {
                                                onChange(v, i, "newStreamUrl");
                                            }}
                                            validate={v => {
                                                return /https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(v) || "Invalid stream URL";
                                            }}
                                        />

                                    </>
                                }
                                {
                                    setting.newActivityType !== ActivityType.STREAMING &&
                                    <>
                                        <Heading className={Margins.top8}>New name {setting.newActivityType === ActivityType.PLAYING && "(first line)"}</Heading>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newName}
                                            onChange={async v => {
                                                onChange(v, i, "newName");
                                            }}
                                        />
                                    </>
                                }
                                <Heading className={Margins.top8}>New details {setting.newActivityType === ActivityType.PLAYING ? "(second line)" : "(first line)"}</Heading>
                                <TextInput
                                    className={Margins.top8}
                                    value={setting.newDetails}
                                    onChange={async v => {
                                        onChange(v, i, "newDetails");
                                    }}
                                />
                                <Heading className={Margins.top8}>New state {setting.newActivityType === ActivityType.PLAYING ? "(third line)" : "(second line)"}</Heading>
                                <TextInput
                                    className={Margins.top8}
                                    value={setting.newState}
                                    onChange={async v => {
                                        onChange(v, i, "newState");
                                    }}
                                />
                                {
                                    !setting.disableAssets &&
                                    <>
                                        <Paragraph style={{ fontSize: "1.05rem", fontWeight: "500" }} className={Margins.top8}>Large image</Paragraph>
                                        <Heading className={Margins.top8}>Text {setting.newActivityType !== ActivityType.PLAYING && "(also third line)"}</Heading>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newLargeImageText}
                                            onChange={async v => {
                                                onChange(v, i, "newLargeImageText");
                                            }}
                                        />
                                        <Heading className={Margins.top8}>URL</Heading>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newLargeImageUrl}
                                            onChange={async v => {
                                                onChange(v, i, "newLargeImageUrl");
                                            }}
                                        />
                                        <Paragraph style={{ fontSize: "1.05rem", fontWeight: "500" }} className={Margins.top8}>Small image</Paragraph>
                                        <Heading className={Margins.top8}>Text</Heading>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newSmallImageText}
                                            onChange={async v => {
                                                onChange(v, i, "newSmallImageText");
                                            }}
                                        />
                                        <Heading className={Margins.top8}>URL</Heading>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newSmallImageUrl}
                                            onChange={async v => {
                                                onChange(v, i, "newSmallImageUrl");
                                            }}
                                        />
                                    </>
                                }
                                <FormSwitch
                                    title="Hide assets (large & small images)"
                                    value={setting.disableAssets}
                                    onChange={value => {
                                        onChange(value, i, "disableAssets");
                                    }}
                                    className={Margins.top8}
                                    hideBorder={true}
                                />
                                <FormSwitch
                                    title="Hide timestamps"
                                    value={setting.disableTimestamps}
                                    onChange={value => {
                                        onChange(value, i, "disableTimestamps");
                                    }}
                                    className={Margins.top8}
                                    hideBorder={true} />
                            </>
                        }
                    </Card >
                )
            }
        </>
    );
}
