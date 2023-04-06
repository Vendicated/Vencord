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

import { definePluginSettings } from "@api/settings";
import { Link } from "@components/Link";
import { Devs, SUPPORT_CHANNEL_ID } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import { useAwaiter } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findByCodeLazy, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import {
    FluxDispatcher,
    Forms,
    GuildStore,
    React,
    SelectedChannelStore,
    SelectedGuildStore,
    UserStore
} from "@webpack/common";

import gitHash from "~git-hash";

const ActivityComponent = findByCodeLazy("onOpenGameProfile");
const ActivityClassName = findByPropsLazy("activity", "buttonColor");
const Colors = findByPropsLazy("profileColors");

// START yoinked from lastfm.tsx
const assetManager = mapMangledModuleLazy(
    "getAssetImage: size must === [number, number] for Twitch",
    {
        getAsset: filters.byCode("apply("),
    }
);

async function getApplicationAsset(key: string): Promise<string> {
    return (await assetManager.getAsset(settings.store.appID, [key, undefined]))[0];
}

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    flags: number;
}

enum ActivityType {
    PLAYING = 0,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}
// END

const strOpt = (description: string) => ({
    type: OptionType.STRING,
    description,
    onChange: setRpc,
    restartNeeded: true
}) as const;

const numOpt = (description: string) => ({
    type: OptionType.NUMBER,
    description,
    onChange: setRpc,
    restartNeeded: true
}) as const;

const choice = (label: string, value: any, _default?: boolean) => ({
    label,
    value,
    default: _default
}) as const;

const choiceOpt = <T,>(description: string, options: T) => ({
    type: OptionType.SELECT,
    description,
    onChange: setRpc,
    options,
    restartNeeded: true
}) as const;

const boolOpt = (description: string, defaultValue: boolean = false) => ({
    type: OptionType.BOOLEAN,
    description,
    default: defaultValue,
}) as const;


const settings = definePluginSettings({
    appID: strOpt("The ID of the application for the rich presence."),
    appName: strOpt("The name of the presence."),
    details: strOpt("Line 1 of rich presence."),
    state: strOpt("Line 2 of rich presence."),
    type: choiceOpt("Type of presence", [
        choice("Playing", ActivityType.PLAYING, true),
        choice("Listening", ActivityType.LISTENING),
        choice("Watching", ActivityType.WATCHING),
        choice("Competing", ActivityType.COMPETING)
    ]),
    startTime: numOpt("Unix Timestamp for beginning of activity."),
    endTime: numOpt("Unix Timestamp for end of activity."),
    imageBig: strOpt("Sets the big image to the specified image."),
    imageBigTooltip: strOpt("Sets the tooltip text for the big image."),
    imageSmall: strOpt("Sets the small image to the specified image."),
    imageSmallTooltip: strOpt("Sets the tooltip text for the small image."),
    buttonOneText: strOpt("The text for the first button"),
    buttonOneURL: strOpt("The URL for the first button"),
    buttonTwoText: strOpt("The text for the second button"),
    buttonTwoURL: strOpt("The URL for the second button"),
    devMode: boolOpt("Enables developer mode for the rich presence. Probably shouldn't use this.")
});

async function createActivity(): Promise<Activity | undefined> {
    const {
        appID,
        appName,
        details,
        state,
        type,
        startTime,
        endTime,
        imageBig,
        imageBigTooltip,
        imageSmall,
        imageSmallTooltip,
        buttonOneText,
        buttonOneURL,
        buttonTwoText,
        buttonTwoURL
    } = settings.store;

    if (!appName) return;

    const activity: Activity = {
        application_id: appID || "0",
        name: appName,
        state,
        details,
        type,
        flags: 1 << 0,
    };

    if (startTime) {
        activity.timestamps = {
            start: startTime,
        };
        if (endTime) {
            activity.timestamps.end = endTime;
        }
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
            large_image: await getApplicationAsset(imageBig)
        };
        if (imageBigTooltip) activity.assets.large_text = imageBigTooltip;
    }

    if (imageSmall) {
        activity.assets = {
            ...activity.assets,
            small_image: await getApplicationAsset(imageSmall)
        };
        if (imageSmallTooltip) activity.assets.small_text = imageSmallTooltip;
    }


    for (const k in activity) {
        if (k === "type") continue; // without type, the presence is considered invalid.
        const v = activity[k];
        if (!v || v.length === 0)
            delete activity[k];
    }

    return activity;
}

async function setRpc(disable?: boolean) {
    const activity: Activity | undefined = await createActivity();

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: !disable ? activity : null,
        socketId: "CustomRPC",
    });
}

const plugin = definePlugin({
    name: "CustomRPC",
    description: "Allows you to set a custom rich presence.",
    authors: [Devs.captain],
    start: setRpc,
    stop: () => setRpc(true),
    settings,
    debug: { // for console debugging
        createActivity,
        setRpc,
        getApplicationAsset
    },

    commands: [{
        name: "customrpc-debug",
        description: "Sends debug information to the channel (settings, output of createActivity, etc).",
        predicate: ctx => ctx.channel.id === SUPPORT_CHANNEL_ID,
        async execute(args, ctx) {
            let activity: any = { ...await createActivity() };
            if (!activity) activity = { application_id: "0" };
            // remove the application_id, as it's not needed.
            delete activity.application_id;
            const minifiedActivity = JSON.stringify(activity);

            // we want to censor the appID, so we don't leak it.
            // while technically the appID is not a secret, it's still something
            // users might want to keep private.
            const settings = { ...plugin.settings.store };
            // check if appId matches the id regex
            if (settings.appID && settings.appID.match(/^[0-9]{15,20}$/)) {
                settings.appID = "[CENSORED]";
            } else {
                // doesn't match the regex?
                settings.appID += " [DOES NOT MATCH REGEX]";
            }
            const minifiedSettings = JSON.stringify(settings);

            const output = `__**Settings**__: \`\`\`json\n${minifiedSettings}\n\`\`\`\n__**Activity**__: \`\`\`json\n${minifiedActivity}\n\`\`\`\nGit Hash: \`${gitHash}\``;
            return {
                content: output
            };
        },
    },
    {
        name: "customrpc-import",
        description: "Imports a custom RPC from a JSON string for debugging purposes.",
        predicate: ctx => plugin.settings.store.devMode,
        async execute(args, ctx) {
            const json = args.join(" ");
            const parsedSettings = JSON.parse(json);
            // iterate over the settings and set them (except for devMode and appID)
            for (const [k, v] of Object.entries(parsedSettings)) {
                if (k === "devMode" || k === "appID") continue;
                plugin.settings.store[k] = v;
            }
        }
    }],
    settingsAboutComponent: () => {
        const activity = useAwaiter(createActivity);
        return (
            <>
                <Forms.FormTitle tag="h2">NOTE:</Forms.FormTitle>
                <Forms.FormText>
                    If you're unsure of how to use this plugin, or have any issues, <Link href="https://captain8771.github.io/docs/customrpc">The Docs</Link> might help you.
                </Forms.FormText>
                <Forms.FormDivider />
                <div style={{ width: "284px" }} className={Colors.profileColors}>
                    {activity[0] && <ActivityComponent activity={activity[0]} className={ActivityClassName.activity} channelId={SelectedChannelStore.getChannelId()}
                        guild={GuildStore.getGuild(SelectedGuildStore.getLastSelectedGuildId())}
                        application={{ id: settings.store.appID }}
                        user={UserStore.getCurrentUser()} />}
                </div>
            </>
        );
    }
});

export default plugin;
