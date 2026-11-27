/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, PlainSettings, SettingsStore } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { OrderedList } from "@components/List";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { ActivityType } from "@vencord/discord-types/enums";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, Menu, React, UserStore } from "@webpack/common";

import { RPCSettings } from "./RpcSettings";

const useProfileThemeStyle = findByCodeLazy("profileThemeStyle:", "--profile-gradient-primary-color");
const ActivityView = findComponentByCodeLazy(".party?(0", "USER_PROFILE_ACTIVITY");

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

async function getApplicationAsset(appID: string, key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(appID, [key]))[0];
}

export const enum TimestampMode {
    NONE,
    NOW,
    TIME,
    CUSTOM,
}

export interface ActivityConfig {
    appID?: string;
    appName?: string;
    details?: string;
    detailsURL?: string;
    state?: string;
    stateURL?: string;
    type?: ActivityType;
    streamLink?: string;
    timestampMode?: TimestampMode;
    startTime?: number;
    endTime?: number;
    imageBig?: string;
    imageBigURL?: string;
    imageBigTooltip?: string;
    imageSmall?: string;
    imageSmallURL?: string;
    imageSmallTooltip?: string;
    buttonOneText?: string;
    buttonOneURL?: string;
    buttonTwoText?: string;
    buttonTwoURL?: string;
    partySize?: number;
    partyMaxSize?: number;
}

export interface RpcProfile extends ActivityConfig {
    id: string;
    label: string;
}

export const settings = definePluginSettings({
    enablePresence: {
        type: OptionType.BOOLEAN,
        description: "Whether to show the presence",
        default: true,
        onChange: enabled => {
            if (isPluginEnabled("CustomRPC")) {
                setRpc(!enabled);
            }
        }
    },
    config: {
        type: OptionType.COMPONENT,
        component: RPCSettings
    },
}).withPrivateSettings<{
    profiles?: RpcProfile[];
    selectedProfileId?: string;
}>();

function migrateProfiles() {
    const legacy = PlainSettings.plugins.CustomRPC;
    if (!legacy || legacy.profiles) {
        return;
    }

    const keys = [
        "appID", "appName", "details", "detailsURL",
        "state", "stateURL", "type", "streamLink",
        "timestampMode", "startTime", "endTime", "imageBig",
        "imageBigURL", "imageBigTooltip", "imageSmall", "imageSmallURL",
        "imageSmallTooltip", "buttonOneText", "buttonOneURL", "buttonTwoText",
        "buttonTwoURL", "partySize", "partyMaxSize",
    ] as const;
    const config: ActivityConfig = {};
    for (const key of keys) {
        if (key in legacy) {
            Object.assign(config, { [key]: legacy[key] });
            delete legacy[key];
        }
    }

    if (Object.keys(config).length) {
        legacy.profiles = [{ ...config, id: "default", label: config.appName || "Default" }];
        SettingsStore.markAsChanged();
    }
}

migrateProfiles();

export function selectedProfile() {
    const { profiles, selectedProfileId } = settings.plain;
    return profiles?.find(profile => profile.id === selectedProfileId) ?? profiles?.[0];
}

export function selectProfile(id: string | undefined) {
    settings.store.selectedProfileId = id;
    if (isPluginEnabled("CustomRPC")) {
        setRpc();
    }
}

async function createActivity(profile: RpcProfile): Promise<Activity | undefined> {
    if (!profile.appName) {
        return;
    }

    const {
        appID,
        appName,
        details,
        detailsURL,
        state,
        stateURL,
        type,
        streamLink,
        startTime,
        endTime,
        imageBig,
        imageBigURL,
        imageBigTooltip,
        imageSmall,
        imageSmallURL,
        imageSmallTooltip,
        buttonOneText,
        buttonOneURL,
        buttonTwoText,
        buttonTwoURL,
        partyMaxSize,
        partySize,
        timestampMode
    } = profile;

    const applicationId = appID || "0";
    const activity: Activity = {
        application_id: applicationId,
        name: appName,
        state,
        details,
        type: type ?? ActivityType.PLAYING,
        flags: 1 << 0,
    };

    if (type === ActivityType.STREAMING) activity.url = streamLink;

    switch (timestampMode) {
        case TimestampMode.NOW:
            activity.timestamps = {
                start: Date.now()
            };
            break;
        case TimestampMode.TIME:
            activity.timestamps = {
                start: Date.now() - (new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds()) * 1000
            };
            break;
        case TimestampMode.CUSTOM:
            if (startTime || endTime) {
                activity.timestamps = {};
                if (startTime) activity.timestamps.start = startTime;
                if (endTime) activity.timestamps.end = endTime;
            }
            break;
        case TimestampMode.NONE:
        default:
            break;
    }

    if (detailsURL) {
        activity.details_url = detailsURL;
    }

    if (stateURL) {
        activity.state_url = stateURL;
    }

    if (buttonOneText) {
        activity.buttons = [
            buttonOneText,
            buttonTwoText
        ].filter(isTruthy);

        activity.metadata = {
            button_urls: [
                buttonOneURL,
                buttonTwoURL
            ].filter(isTruthy)
        };
    }

    if (imageBig) {
        activity.assets = {
            large_image: await getApplicationAsset(applicationId, imageBig),
            large_text: imageBigTooltip || undefined,
            large_url: imageBigURL || undefined
        };
    }

    if (imageSmall) {
        activity.assets = {
            ...activity.assets,
            small_image: await getApplicationAsset(applicationId, imageSmall),
            small_text: imageSmallTooltip || undefined,
            small_url: imageSmallURL || undefined
        };
    }

    if (partyMaxSize && partySize) {
        activity.party = {
            size: [partySize, partyMaxSize]
        };
    }

    for (const k in activity) {
        if (k === "type") continue;
        const v = activity[k];
        if (!v || v.length === 0)
            delete activity[k];
    }

    return activity;
}

let revision = 0;

export async function setRpc(disable = !settings.store.enablePresence) {
    const currentRevision = ++revision;
    const profile = selectedProfile();
    let activity: Activity | undefined;
    if (!disable && profile) {
        try {
            activity = await createActivity(profile);
        } catch (error) {
            new Logger("CustomRPC").error(`Failed to publish profile "${profile.label}"`, error);
        }
    }

    if (currentRevision === revision) {
        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            socketId: "CustomRPC",
            activity: activity ?? null
        });
    }
}

export function ActivityPreview({ profile }: { profile: RpcProfile; }) {
    const [activity] = useAwaiter(() => createActivity(profile), { fallbackValue: undefined, deps: [profile] });
    const { profileThemeStyle } = useProfileThemeStyle({});
    const user = UserStore.getCurrentUser();

    if (!activity) {
        return null;
    }

    return (
        <div style={{ width: "284px", maxWidth: "100%", ...profileThemeStyle, borderRadius: 8, background: "var(--background-mod-muted)" }}>
            <ActivityView activity={activity} user={user} currentUser={user} />
        </div>
    );
}

export default definePlugin({
    name: "CustomRPC",
    description: "Add a fully customisable Rich Presence (Game status) to your Discord profile",
    tags: ["Activity", "Customisation"],
    authors: [Devs.captain, Devs.AutumnVN, Devs.nin0dev, Devs.c0nnorgg],
    dependencies: ["UserSettingsAPI"],
    requiresRestart: false,
    settings,

    toolboxActions() {
        const { enablePresence, profiles = [] } = settings.use(["enablePresence", "profiles", "selectedProfileId"]);
        const selected = selectedProfile();

        return (
            <Menu.MenuGroup>
                <Menu.MenuCheckboxItem
                    id="custom-rpc-toggle-toolbox"
                    label="Show Custom RPC"
                    checked={enablePresence}
                    action={() => {
                        settings.store.enablePresence = !enablePresence;
                        setRpc();
                    }}
                />
                {profiles.length > 0 && (
                    <Menu.MenuItem id="custom-rpc-profiles" label="RPC profile">
                        {profiles.map(profile => (
                            <Menu.MenuRadioItem
                                group="custom-rpc-profiles"
                                key={profile.id}
                                id={`custom-rpc-profile-${profile.id}`}
                                label={profile.label || "Unnamed profile"}
                                checked={profile.id === selected?.id}
                                action={() => selectProfile(profile.id)}
                            />
                        ))}
                    </Menu.MenuItem>
                )}
            </Menu.MenuGroup>
        );
    },

    start: setRpc,
    stop: () => setRpc(true),

    flux: {
        START_SESSION() {
            FluxDispatcher.wait(() => setRpc());
        }
    },

    patches: [
        {
            // Discord hides buttons on your own Rich Presence for some reason. This patch disables that behaviour
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            replacement: {
                match: /.getId\(\)===\i.id/,
                replace: "$& && false"
            }
        }
    ],

    settingsAboutComponent: () => {
        const { enablePresence } = settings.use(["enablePresence"]);
        const gameActivityEnabled = ShowCurrentGame.useSetting();

        return (
            <Flex flexDirection="column" gap=".5em">
                {!enablePresence && (
                    <Card variant="warning">
                        <Flex flexDirection="column" gap=".5em" alignItems="flex-start">
                            <Heading tag="h4" weight="bold">Custom RPC disabled</Heading>
                            <Paragraph>The "Enable Presence" setting is disabled, so your presence won't show. If this was unintentional, enable it below.</Paragraph>
                            <Button
                                variant="overlayPrimary"
                                onClick={() => settings.store.enablePresence = true}
                            >
                                Enable Presence
                            </Button>
                        </Flex>
                    </Card>
                )}
                {!gameActivityEnabled && (
                    <Card variant="danger">
                        <Flex flexDirection="column" gap=".5em" alignItems="flex-start">
                            <Heading tag="h4" weight="bold">Activity Sharing disabled</Heading>
                            <Paragraph>Activity Sharing isn't enabled, so people won't be able to see your custom rich presence!</Paragraph>

                            <Button
                                variant="overlayPrimary"
                                onClick={() => ShowCurrentGame.updateSetting(true)}
                            >
                                Enable Activity Sharing
                            </Button>
                        </Flex>
                    </Card>
                )}

                <Flex flexDirection="column" gap=".5em">
                    <Card>
                        <Heading>Images</Heading>
                        <Paragraph>To use an image link, you need to upload it to imgur first:</Paragraph>
                        <OrderedList>
                            <li>Go to <Link href="https://imgur.com/upload">Imgur</Link> and upload your image.</li>
                            <li>Once uploaded, right-click the image and click "Copy image address".</li>
                            <li>Use the copied link as your image link.</li>
                        </OrderedList>
                        <Paragraph>To use application assets:</Paragraph>
                        <OrderedList>
                            <li>Go to the <Link href="https://discord.com/developers/applications">Discord Developer Portal</Link> to create an application and
                                get the application ID.
                            </li>
                            <li>Navigate to the "Rich Presence" tab and upload your images.</li>
                        </OrderedList>
                    </Card>
                    <Card variant="warning">
                        <Heading>Warning</Heading>
                        <Paragraph>
                            You can't see your own buttons on your profile, but everyone else can see them fine.
                        </Paragraph>
                        <Paragraph>
                            Some weird unicode text ("fonts" 𝖑𝖎𝖐𝖊 𝖙𝖍𝖎𝖘) may cause the rich presence to not show up, try using normal letters instead.
                        </Paragraph>
                    </Card>
                </Flex>
            </Flex>
        );
    }
});
