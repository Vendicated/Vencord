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

import { definePluginSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { User } from "discord-types/general";
import { Tooltip } from "webpack/common";

const Section: React.ComponentType<any> = findByCodeLazy("().lastSection");
const UserProfileStore = findStoreLazy("UserProfileStore");
const ThemeStore = findStoreLazy("ThemeStore");
const platforms: { get(type: string): ConnectionPlatform; } = findByPropsLazy("isSupported", "getByUrl");
const getTheme: (user: User, displayProfile: any) => any = findByCodeLazy(",\"--profile-gradient-primary-color\"");

const settings = definePluginSettings({
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
});

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

function profilePopoutComponent(e: any) {
    return component(e.user.id, getTheme(e.user, e.displayProfile).profileTheme);
}

function profilePanelComponent(e: any) {
    return component(e.channel.recipients[0], ThemeStore.theme);
}

function component(userId: string, theme: string) {
    const profile = UserProfileStore.getUserProfile(userId);
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

function CompactConnectionComponent({ connection, theme }: { connection: Connection, theme: string; }) {
    const platform = platforms.get(connection.type);
    const url = platform.getPlatformUserUrl?.(connection);

    return (
        <Tooltip text={connection.name + (!connection.verified ? " (unverified)" : "") + (!url ? " (copy)" : "")} key={connection.id}>
            {({ onMouseLeave, onMouseEnter }) =>
                <a
                    href={url ?? "javascript:void(0)"}
                    target="_blank"
                    style={{
                        backgroundImage: "url(" + (theme === "light" ? platform.icon.lightSVG : platform.icon.darkSVG) + ")",
                        marginTop: settings.store.iconSpacing,
                        marginRight: settings.store.iconSpacing,
                        width: settings.store.iconSize,
                        height: settings.store.iconSize
                    }}
                    className="vc-user-connection"
                    onClick={() => !url && navigator.clipboard.writeText(connection.name)}
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter} />
            }
        </Tooltip>
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
                match: /,hideNote:\i\|\|\i}\)/,
                replace: "$&,$self.profilePopoutComponent(arguments[0])"
            }
        },
        {
            find: "\"Profile Panel: user cannot be undefined\"",
            replacement: {
                match: /hideNote:!1}\)/,
                replace: "$&,$self.profilePanelComponent(arguments[0])"
            }
        }
    ],
    settings,
    profilePopoutComponent,
    profilePanelComponent
});
