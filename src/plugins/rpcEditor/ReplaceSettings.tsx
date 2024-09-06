/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CheckedTextInput } from "@components/CheckedTextInput";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Card, Forms, PresenceStore, React, Select, SnowflakeUtils, Switch, TextInput, UserStore } from "@webpack/common";

import { Activity, ActivityType, AppIdSetting, makeEmptyAppId } from ".";

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
            <Forms.FormTitle tag="h3">IDs of currently running activities</Forms.FormTitle>
            {
                activities.length === 0 ? <Forms.FormText>No running activities</Forms.FormText> : activities.map(activity => { return activity.flags !== 48 ? <Forms.FormText>{activity.name}: {activity.application_id}</Forms.FormText> : null; /* hide spotify */ })
            }
            <Forms.FormTitle tag="h3" className={Margins.top8}>Available variables</Forms.FormTitle>
            <Forms.FormText>
                In all fields (except stream URL), you can put in variables that'll automatically be replaced by their original content:
                <pre style={{ fontFamily: "monospace" }}>
                    :name:, :details:, :state:
                    <br />
                    :large_image:, :large_text:, :small_image:, :small_text:
                </pre>
            </Forms.FormText>
            <Forms.FormTitle tag="h3" className={Margins.top8}>More details</Forms.FormTitle>
            <Forms.FormText>
                Leave a field empty to leave it as is.
                <br />
                Set a field to "null" to hide it on the presence.
                <br />
                You may need to reload Discord for changes to apply.
            </Forms.FormText>
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
                    <Card style={{ padding: "1em", opacity: !setting.enabled ? "60%" : "" }}>
                        {
                            isValidSnowflake(setting.appId) ?
                                <Switch
                                    value={setting.enabled}
                                    onChange={value => {
                                        onChange(value, i, "enabled");
                                    }}
                                    className={Margins.bottom8}
                                    hideBorder={true}
                                >
                                    Apply edits to app
                                </Switch> : <Forms.FormTitle tag="h3">Add new application</Forms.FormTitle>
                        }
                        <Forms.FormTitle className={`${Margins.top8} ${Margins.bottom8}`}>Application ID</Forms.FormTitle>
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
                                <Forms.FormTitle className={Margins.top8}>New activity type</Forms.FormTitle>
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
                                        <Forms.FormTitle className={`${Margins.top8} ${Margins.bottom8}`}>Stream URL (must be YouTube or Twitch)</Forms.FormTitle>
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
                                        <Forms.FormTitle className={Margins.top8}>New name {setting.newActivityType === ActivityType.PLAYING && "(first line)"}</Forms.FormTitle>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newName}
                                            onChange={async v => {
                                                onChange(v, i, "newName");
                                            }}
                                        />
                                    </>
                                }
                                <Forms.FormTitle className={Margins.top8}>New details {setting.newActivityType === ActivityType.PLAYING ? "(second line)" : "(first line)"}</Forms.FormTitle>
                                <TextInput
                                    className={Margins.top8}
                                    value={setting.newDetails}
                                    onChange={async v => {
                                        onChange(v, i, "newDetails");
                                    }}
                                />
                                <Forms.FormTitle className={Margins.top8}>New state {setting.newActivityType === ActivityType.PLAYING ? "(third line)" : "(second line)"}</Forms.FormTitle>
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
                                        <Forms.FormText style={{ fontSize: "1.05rem", fontWeight: "500" }} className={Margins.top8}>Large image</Forms.FormText>
                                        <Forms.FormTitle className={Margins.top8}>Text {setting.newActivityType !== ActivityType.PLAYING && "(also third line)"}</Forms.FormTitle>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newLargeImageText}
                                            onChange={async v => {
                                                onChange(v, i, "newLargeImageText");
                                            }}
                                        />
                                        <Forms.FormTitle className={Margins.top8}>URL</Forms.FormTitle>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newLargeImageUrl}
                                            onChange={async v => {
                                                onChange(v, i, "newLargeImageUrl");
                                            }}
                                        />
                                        <Forms.FormText style={{ fontSize: "1.05rem", fontWeight: "500" }} className={Margins.top8}>Small image</Forms.FormText>
                                        <Forms.FormTitle className={Margins.top8}>Text</Forms.FormTitle>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newSmallImageText}
                                            onChange={async v => {
                                                onChange(v, i, "newSmallImageText");
                                            }}
                                        />
                                        <Forms.FormTitle className={Margins.top8}>URL</Forms.FormTitle>
                                        <TextInput
                                            className={Margins.top8}
                                            value={setting.newSmallImageUrl}
                                            onChange={async v => {
                                                onChange(v, i, "newSmallImageUrl");
                                            }}
                                        />
                                    </>
                                }
                                <Switch
                                    value={setting.disableAssets}
                                    onChange={value => {
                                        onChange(value, i, "disableAssets");
                                    }}
                                    className={Margins.top8}
                                    hideBorder={true}
                                    style={{ marginBottom: "0" }}
                                >
                                    Hide assets (large & small images)
                                </Switch>
                                <Switch
                                    value={setting.disableTimestamps}
                                    onChange={value => {
                                        onChange(value, i, "disableTimestamps");
                                    }}
                                    className={Margins.top8}
                                    hideBorder={true}
                                    style={{ marginBottom: "0" }}
                                >
                                    Hide timestamps
                                </Switch>
                            </>
                        }
                    </Card>
                )
            }
        </>
    );
}
