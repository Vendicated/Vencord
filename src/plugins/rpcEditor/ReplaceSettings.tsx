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

const RPCUtils = findByPropsLazy("fetchApplicationsRPC", "getRemoteIconURL");

const cachedApps: any = {};
async function lookupApp(appId: string): Promise<RpcApp | null> {
    if (cachedApps[appId]) return cachedApps[appId];
    const socket: any = {};
    try {
        await RPCUtils.fetchApplicationsRPC(socket, appId);
        console.log(`Lookup finished for ${socket.application.name}`);
        cachedApps[appId] = socket.application;
        return socket.application;
    } catch {
        console.log(`Lookup failed for ${appId}`);
        return null;
    }
}

function isValidSnowflake(v: string) {
    const regex = /^\d{17,20}$/;
    return regex.test(v) && !Number.isNaN(SnowflakeUtils.extractTimestamp(v));
}

export function ReplaceTutorial() {
    const activities: Activity[] = PresenceStore.getActivities(UserStore.getCurrentUser().id);
    console.log(activities);
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
                    :large_image::large_text:, :small_image:, :small_text:
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
            const tempApp = await lookupApp(val.toString());
            appIds[index].appName = tempApp?.name || "Unknown";
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
                    <Card style={{ padding: "1em 1em 0" }}>
                        <Switch
                            value={setting.enabled}
                            onChange={value => {
                                onChange(value, i, "enabled");
                            }}
                            className={Margins.bottom16}
                            hideBorder={true}
                        >
                            Enable editing of {setting.appName}
                        </Switch>
                        <Forms.FormTitle>Application ID</Forms.FormTitle>
                        <CheckedTextInput
                            value={setting.appId}
                            onChange={async v => {
                                onChange(v, i, "appId");
                            }}
                            validate={v =>
                                !v || isValidSnowflake(v) || "Invalid application ID"
                            }
                        />
                        {setting.activityType === ActivityType.STREAMING &&
                            <>
                                <Forms.FormTitle>Stream URL</Forms.FormTitle>
                                <CheckedTextInput
                                    value={setting.streamUrl}
                                    onChange={async v => {
                                        onChange(v, i, "streamUrl");
                                    }}
                                    validate={st => !/https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(st) && "Only Twitch and Youtube URLs will work." || true}
                                />
                            </>}
                        <Forms.FormTitle>New activity type</Forms.FormTitle>
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
                            className={Margins.bottom16}
                            isSelected={value => setting.activityType === value}
                            serialize={identity}
                        />
                        <Switch
                            value={setting.swapNameAndDetails}
                            onChange={value => {
                                onChange(value, i, "swapNameAndDetails");
                            }}
                            className={Margins.bottom16}
                            hideBorder={true}
                        >
                            Swap presence name and details
                        </Switch>
                    </Card>
                )
            }
        </>
    );
}
