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

import { Settings } from "@api/settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, Forms } from "@webpack/common";

// START yoinked from lastfm.tsx
const assetManager = mapMangledModuleLazy(
    "getAssetImage: size must === [number, number] for Twitch",
    {
        getAsset: filters.byCode("apply("),
    }
);

async function getApplicationAsset(key: string): Promise<string> {
    return (await assetManager.getAsset(Settings.plugins.customRPC.appID, [key, undefined]))[0];
}
// END

async function setRpc() {
    const activity = {
        application_id: Settings.plugins.customRPC.appID ?? "0",
        name: Settings.plugins.customRPC.appName ?? "Discord",
        state: Settings.plugins.customRPC.state,
        details: Settings.plugins.customRPC.details,
        type: 0,
        flags: 1 << 0,
    };

    if (Settings.plugins.customRPC.startTime) {
        // @ts-ignore silence.
        activity.timestamps = {
            start: Settings.plugins.customRPC.startTime === 0 ? null : Settings.plugins.customRPC.startTime,
        };
        if (Settings.plugins.customRPC.endTime) { // @ts-ignore SHUT UP
            activity.timestamps.end = Settings.plugins.customRPC.endTime;
        }
    }

    if (Settings.plugins.customRPC.buttonOneText) {
        // @ts-ignore
        activity.buttons = [
            Settings.plugins.customRPC.buttonOneText,
            Settings.plugins.customRPC.buttonTwoText
        ].filter(x => x !== undefined && x !== "");

        // @ts-ignore
        activity.metadata = {
            button_urls: [
                Settings.plugins.customRPC.buttonOneURL,
                Settings.plugins.customRPC.buttonTwoURL
            ].filter(x => x !== undefined && x !== "")
        };
    }

    if (Settings.plugins.customRPC.imageBig) {
        // @ts-ignore
        activity.assets = {
            large_image: await getApplicationAsset(Settings.plugins.customRPC.imageBig),
            large_text: Settings.plugins.customRPC.imageBigTooltip
        };
        if (Settings.plugins.customRPC.imageSmall) {
            // @ts-ignore
            activity.assets.small_image =await getApplicationAsset(Settings.plugins.customRPC.imageSmall);
            // @ts-ignore
            activity.assets.small_text = Settings.plugins.customRPC.imageSmallTooltip;
        }
    }

    console.debug("Before:", activity);

    for (const k of Object.keys(activity)) { // I'll make this not shit eventually.
        const v = activity[k];
        console.debug(`${k}: ${v}`);
        if (["", null, undefined, [], {}].includes(v)) {
            delete activity[k];
            console.debug("Deleted ", k);
        }
    }

    console.debug("After:", activity);

    FluxDispatcher.dispatch(
        {
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: activity
        }
    );
}

export default definePlugin({
    name: "customRPC",
    description: "Allows you to set a custom rich presence.",
    authors: [Devs.captain],
    start: function () {
        setRpc();
    },
    options: {
        appID: {
            type: OptionType.STRING,
            description: "The ID of the application for the rich presence.",
            onChange: setRpc,
        },
        appName: {
            type: OptionType.STRING,
            description: "The name of the presence.",
            onChange: setRpc,
        },
        details: {
            type: OptionType.STRING,
            description: "Line 1 of rich presence.",
            onChange: setRpc
        },
        state: {
            type: OptionType.STRING,
            description: "Line 2 of rich presence.",
            onChange: setRpc
        },
        startTime: {
            type: OptionType.NUMBER,
            description: "Unix Timestamp for beginning of activity.",
            onChange: setRpc
        },
        endTime: {
            type: OptionType.NUMBER,
            description: "Unix Timestamp for end of activity.",
            onChange: setRpc
        },
        imageBig: {
            type: OptionType.STRING,
            description: "Sets the big image to the specified image.",
            onChange: setRpc
        },
        imageBigTooltip: {
            type: OptionType.STRING,
            description: "Sets the tooltip text for the big image.",
            onChange: setRpc
        },
        imageSmall: {
            type: OptionType.STRING,
            description: "Sets the small image to the specified image.",
            onChange: setRpc
        },
        imageSmallTooltip: {
            type: OptionType.STRING,
            description: "Sets the tooltip text for the small image.",
            onChange: setRpc
        },
        buttonOneText: {
            type: OptionType.STRING,
            description: "The text for the first button",
            onChange: setRpc
        },
        buttonOneURL: {
            type: OptionType.STRING,
            description: "The URL for the first button",
            onChange: setRpc
        },
        buttonTwoText: {
            type: OptionType.STRING,
            description: "The text for the second button",
            onChange: setRpc
        },
        buttonTwoURL: {
            type: OptionType.STRING,
            description: "The URL for the second button",
            onChange: setRpc
        }
    },
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h1">NOTE:</Forms.FormTitle>
            <Forms.FormText>
                You will need to <Link href="https://discord.com/developers/applications">create an application</Link> and
                get its ID to use this plugin.
            </Forms.FormText>
        </>
    )
});
