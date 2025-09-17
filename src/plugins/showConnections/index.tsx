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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { CopyIcon, LinkIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { ConnectedAccount, User } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Tooltip, UserProfileStore } from "@webpack/common";
import OpenInAppPlugin from "plugins/openInApp";

import { VerifiedIcon } from "./VerifiedIcon";

const useLegacyPlatformType: (platform: string) => string = findByCodeLazy(".TWITTER_LEGACY:");
const platforms: { get(type: string): ConnectionPlatform; } = findByPropsLazy("isSupported", "getByUrl");
const getProfileThemeProps = findByCodeLazy(".getPreviewThemeColors", "primaryColor:");

const enum Spacing {
    COMPACT,
    COZY,
    ROOMY
}
const getSpacingPx = (spacing: Spacing | undefined) => (spacing ?? Spacing.COMPACT) * 2 + 4;

const settings = definePluginSettings({
    iconSize: {
        type: OptionType.NUMBER,
        description: "Icon size (px)",
        default: 32
    },
    iconSpacing: {
        type: OptionType.SELECT,
        description: "Icon margin",
        default: Spacing.COZY,
        options: [
            { label: "Compact", value: Spacing.COMPACT },
            { label: "Cozy", value: Spacing.COZY }, // US Spelling :/
            { label: "Roomy", value: Spacing.ROOMY }
        ]
    }
});

interface ConnectionPlatform {
    getPlatformUserUrl(connection: ConnectedAccount): string;
    icon: { lightSVG: string, darkSVG: string; };
}

const profilePopoutComponent = ErrorBoundary.wrap(
    (props: { user: User; displayProfile?: any; }) => (
        <ConnectionsComponent
            {...props}
            id={props.user.id}
            theme={getProfileThemeProps(props).theme}
        />
    ),
    { noop: true }
);

function ConnectionsComponent({ id, theme }: { id: string, theme: string; }) {
    const profile = UserProfileStore.getUserProfile(id);
    if (!profile)
        return null;

    const connections = profile.connectedAccounts;
    if (!connections?.length)
        return null;

    return (
        <Flex style={{
            gap: getSpacingPx(settings.store.iconSpacing),
            flexWrap: "wrap"
        }}>
            {connections.map(connection => <CompactConnectionComponent connection={connection} theme={theme} key={connection.id} />)}
        </Flex>
    );
}

function CompactConnectionComponent({ connection, theme }: { connection: ConnectedAccount, theme: string; }) {
    const platform = platforms.get(useLegacyPlatformType(connection.type));
    const url = platform.getPlatformUserUrl?.(connection);

    const img = (
        <img
            aria-label={connection.name}
            src={theme === "light" ? platform.icon.lightSVG : platform.icon.darkSVG}
            style={{
                width: settings.store.iconSize,
                height: settings.store.iconSize
            }}
        />
    );

    const TooltipIcon = url ? LinkIcon : CopyIcon;

    return (
        <Tooltip
            text={
                <span className="vc-sc-tooltip">
                    <span className="vc-sc-connection-name">{connection.name}</span>
                    {connection.verified && <VerifiedIcon />}
                    <TooltipIcon height={16} width={16} className="vc-sc-tooltip-icon" />
                </span>
            }
            key={connection.id}
        >
            {tooltipProps =>
                url
                    ? <a
                        {...tooltipProps}
                        className="vc-user-connection"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => {
                            if (Vencord.Plugins.isPluginEnabled("OpenInApp")) {
                                // handleLink will .preventDefault() if applicable
                                OpenInAppPlugin.handleLink(e.currentTarget, e);
                            }
                        }}
                    >
                        {img}
                    </a>
                    : <button
                        {...tooltipProps}
                        className="vc-user-connection"
                        onClick={() => copyWithToast(connection.name)}
                    >
                        {img}
                    </button>

            }
        </Tooltip>
    );
}

export default definePlugin({
    name: "ShowConnections",
    description: "Show connected accounts in user popouts",
    authors: [Devs.TheKodeToad],
    settings,

    patches: [
        {
            find: ".hasAvatarForGuild(null==",
            replacement: {
                match: /currentUser:\i,guild:\i}\)(?<=user:(\i),bio:null==(\i)\?.+?)/,
                replace: "$&,$self.profilePopoutComponent({ user: $1, displayProfile: $2 })"
            }
        }
    ],

    profilePopoutComponent,
});
