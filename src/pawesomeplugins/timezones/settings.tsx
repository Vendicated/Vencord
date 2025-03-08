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

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { IPluginOptionComponentProps, OptionType } from "@utils/types";
import { Text } from "@webpack/common";

import { Snowflake } from "./api";

/** A mapping of each user id to the override, being either a timezone or "disabled" */
export type TimezoneOverrides = Record<Snowflake, string | null>;

/* A mapping of each authorized user id to the JWT token returned by the API. */
export type TimezoneDBTokens = Record<Snowflake, string>;

const settings = definePluginSettings({
    enableApi: {
        type: OptionType.BOOLEAN,
        description: "Fetch user timezones from TimezoneDB when a local override does not exist",
        default: true,
    },
    tokens: {
        type: OptionType.COMPONENT,
        description: "Authorization with TimezoneDB",
        component: props => <AuthorizeTimezoneDBSetting {...props} />,
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
    timezoneOverrides: {
        type: OptionType.COMPONENT,
        description: "Local overrides for users' timezones",
        component: props => <TimezoneOverridesSetting {...props} />,
    },
});

export default settings;

export function SettingsComponent(): JSX.Element {
    return <>
        <Text variant="text-md/normal" className={classes(Margins.top16, Margins.bottom20)}>
            This plugin supports setting your own timezone publicly for others to
            display via the <Link href="https://github.com/rushiimachine/timezonedb">TimezoneDB</Link> API.
            You can set a local override for other users if they haven't publicized their own timezone.
        </Text>
    </>;
}

function TimezoneOverridesSetting(props: IPluginOptionComponentProps): JSX.Element {
    return <></>;
}

function AuthorizeTimezoneDBSetting(props: IPluginOptionComponentProps): JSX.Element {
    return <></>;
}
