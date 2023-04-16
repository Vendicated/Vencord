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

import "./styles.css";

import { Settings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Tooltip } from "webpack/common/components";

let Section: React.ComponentType<any>;
const UserProfileStore = findStoreLazy("UserProfileStore");
const styles: Record<string, string> = findByPropsLazy("title");
let platforms: { get(type: string): ConnectionPlatform; };

interface Connection {
    type: string;
    id: string;
    name: string;
    verified: boolean;
}

interface ConnectionPlatform {
    getPlatformUserUrl(connection: Connection): string;
    icon: { lightSVG: string, darkSVG: string; };
}

function CompactConnectionComponent({ connection, theme }: { connection: Connection, theme: string; }) {
    const platform = platforms.get(connection.type);
    const url = platform.getPlatformUserUrl && platform.getPlatformUserUrl(connection);
    const settings = Settings.plugins.QuickConnections;

    return (
        <Tooltip text={connection.name + (!connection.verified ? " (unverified)" : "") + (!url ? " (copy)" : "")} key={connection.id}>
            {({ onMouseLeave, onMouseEnter }) =>
                <a
                    href={url ?? "javascript:void(0)"}
                    target="_blank"
                    style={{
                        backgroundImage: "url(" + (theme === "light" ? platform.icon.lightSVG : platform.icon.darkSVG) + ")",
                        marginTop: settings.iconSpacing,
                        marginRight: settings.iconSpacing,
                        width: settings.iconSize,
                        height: settings.iconSize
                    }}
                    className="vc-user-connection"
                    onClick={() => !url && navigator.clipboard.writeText(connection.name)}
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter} />
            }
        </Tooltip>
    );
}

function component(id: string, theme: string) {
    const profile = UserProfileStore.getUserProfile(id);
    if (!profile)
        return null;

    const connections: Connection[] = profile.connectedAccounts;

    return (
        <ErrorBoundary>
            {connections && connections.length !== 0 &&
                <Section>
                    {connections.map(connection => <CompactConnectionComponent connection={connection} theme={theme} />)}
                </Section>
            }
        </ErrorBoundary>
    );
}

export default definePlugin({
    name: "QuickConnections",
    description: "Show connected accounts in user popouts",
    authors: [Devs.TheKodeToad],
    patches: [
        {
            find: ".Messages.BOT_PROFILE_SLASH_COMMANDS",
            replacement: {
                match: /,hideNote:\i\|\|\i}\)(?<=(\i)=\i\.user,.+?)(?<=(\i)=\(0,\i\.\i\)\(\i,\i\)\.profileTheme.+?)/,
                replace: "$&,$self.component($1.id,$2)"
            }
        },
        {
            find: "\"lastSection\",",
            replacement: {
                match: /function (\i)\(e\)/,
                replace: "$self.Section=$1;$&"
            }
        },
        {
            find: "name:\"Twitch\"",
            replacement: {
                match: /const (\i)={get:/,
                replace: "const $1=$self.platforms={get:"
            }
        }
    ],
    options: {
        iconSize: {
            type: OptionType.NUMBER,
            description: "Icon size",
            default: 32
        },
        iconSpacing: {
            type: OptionType.NUMBER,
            description: "Icon spacing",
            default: 6
        }
    },
    component,

    // capture objects
    set Section(value: any) {
        Section = value;
    },
    set platforms(value: any) {
        platforms = value;
    }
});
