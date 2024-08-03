/*
* Vencord, a Discord client mod
* Copyright (c) 2024 Vendicated and contributors
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { CheckedTextInput } from "@components/CheckedTextInput";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { Card, Forms, PresenceStore, React, Select, SnowflakeUtils, Switch, UserStore } from "@webpack/common";

import { Activity, ActivityType, AppIdSetting, makeEmptyAppId } from ".";

interface SettingsProps {
    appIds: AppIdSetting[];
    update: () => void;
    save: () => void;
}

interface RpcApp {
    id: string;
    name: string;
    icon: string;
    flags: number;
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
            <Forms.FormTitle tag="h3" style={{ marginTop: "7px" }}>Available variables</Forms.FormTitle>
            <Forms.FormText>
                In all fields, you can put in variables that'll automatically be replaced by their content:
                <pre style={{ fontFamily: "monospace" }}>
                    :name:, :details:, :state:
                    <br />
                    :large_image:, :large_text:, :small_image:, :small_text:
                </pre>
            </Forms.FormText>
        </>
    );
}

export function ReplaceSettings({ appIds, update, save }: SettingsProps) {
    async function onChange(val: string | boolean, index: number, key: string) {
        if (index === appIds.length - 1)
            appIds.push(makeEmptyAppId());

        appIds[index][key] = val;

        if (val && key === "appId") {
            appIds[index].appName = "Unknown";
        }

        if (appIds[index].appId === "" && index !== appIds.length - 1)
            appIds.splice(index, 1);

        save();
        update();
    }

    return (
        <>
            {
                appIds.map((setting, i) =>
                    <Card style={{ padding: "1em" }}>
                        {
                            setting.appId ?
                                <Switch
                                    value={setting.enabled}
                                    onChange={value => {
                                        onChange(value, i, "enabled");
                                    }}
                                    className={Margins.bottom8}
                                    hideBorder={true}
                                >
                                    Edit the app
                                </Switch> : <Forms.FormTitle tag="h3">Add new application</Forms.FormTitle>
                        }
                        <Forms.FormTitle className={Margins.top8}>Application ID</Forms.FormTitle>
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
                            setting.appId && <>
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
                                        onChange(value, i, "activityType");
                                    }}
                                    className={Margins.top8}
                                    isSelected={value => setting.newActivityType === value}
                                    serialize={identity}
                                />
                            </>
                        }
                    </Card>
                )
            }
        </>
    );
}
