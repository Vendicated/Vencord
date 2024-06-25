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

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { IPluginOptionComponentProps, OptionType } from "@utils/types";
import { Text } from "@webpack/common";

import { Snowflake } from "./api";
import { TimezoneCache } from "./cache";

export type TimezoneOverwrites = Record<Snowflake, string | null>;

const DEFAULT_API = "https://timezonedb.catvibers.me/api";

const settings = definePluginSettings({
    enableApi: {
        type: OptionType.BOOLEAN,
        description: "Fetch user timezones from TimezoneDB when a local override does not exist",
        default: true,
    },
    apiUrl: {
        type: OptionType.STRING,
        description: "The TimezoneDB API instance to fetch from",
        default: DEFAULT_API,
        placeholder: DEFAULT_API,
        onChange(_: any) {
            DataStore.clear(TimezoneCache).catch(_ => _);
        }
    },
    displayInChat: {
        type: OptionType.BOOLEAN,
        description: "Show local timestamp of messages",
        default: true,
    },
    displayInProfile: {
        type: OptionType.BOOLEAN,
        description: "Show local time in user profiles",
        default: true,
    },
    timezoneOverwrites: {
        type: OptionType.COMPONENT,
        description: "Local overwrites for users' timezones",
        component: props => <>
            <TimezoneOverwritesSetting
                setValue={props.setValue}
                setError={props.setError}
                option={props.option} />
        </>,
    },
});

export default settings;

export function SettingsComponent(): JSX.Element {
    // const { apiUrl } = settings.use(["apiUrl"]);
    // const url = `${apiUrl}/../?client_mod=${encodeURIComponent(VENCORD_USER_AGENT)}`;

    // TODO: show button to authorize tzdb and manage public tz

    return <>
        <Text variant="text-md/normal">
            <br />
            This plugin supports setting your own Timezone publicly for others to
            fetch and display via <Link href="https://github.com/rushiimachine/timezonedb">TimezoneDB</Link>.
            You can override other users' timezones locally if they haven't set their own.
        </Text>
    </>;
}

function TimezoneOverwritesSetting(props: IPluginOptionComponentProps): JSX.Element {
    return <></>;
}
