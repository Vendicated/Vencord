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
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Text, Tooltip, UserProfileStore } from "@webpack/common";
import { User } from "discord-types/general";

import { VerifiedIcon } from "./VerifiedIcon";

const Section = findComponentByCodeLazy(".lastSection", "children:");
const ThemeStore = findStoreLazy("ThemeStore");

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

const profilePopoutComponent = ErrorBoundary.wrap(
    (props: { user: User; displayProfile?: any; simplified?: boolean; }) => (
        <ConnectionsComponent
            {...props}
            id={props.user.id}
            theme={getProfileThemeProps(props).theme}
        />
    ),
    { noop: true }
);

const profilePanelComponent = ErrorBoundary.wrap(
    (props: { id: string; simplified?: boolean; }) => (
        <ConnectionsComponent
            {...props}
            theme={ThemeStore.theme}
        />
    ),
    { noop: true }
);

function ConnectionsComponent({ id, theme, simplified }: { id: string, theme: string, simplified?: boolean; }) {
    const profile = UserProfileStore.getUserProfile(id);
    if (!profile)
        return null;

    const connections: Connection[] = profile.connectedAccounts;
    if (!connections?.length)
        return null;

    const connectionsContainer = (
        <Flex style={{
            marginTop: !simplified ? "8px" : undefined,
            gap: getSpacingPx(settings.store.iconSpacing),
            flexWrap: "wrap"
        }}>
            {connections.map(connection => <CompactConnectionComponent connection={connection} theme={theme} />)}
        </Flex>
    );

    if (simplified)
        return connectionsContainer;

    return (
        <Section>
            <Text
                tag="h2"
                variant="eyebrow"
                style={{ color: "var(--header-primary)" }}
            >
                Connections
            </Text>
            {connectionsContainer}
        </Section>
    );
}

function CompactConnectionComponent({ connection, theme }: { connection: Connection, theme: string; }) {
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
                    <TooltipIcon height={16} width={16} />
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
                        onClick={e => {
                            if (Vencord.Plugins.isPluginEnabled("OpenInApp")) {
                                const OpenInApp = Vencord.Plugins.plugins.OpenInApp as any as typeof import("../openInApp").default;
                                // handleLink will .preventDefault() if applicable
                                OpenInApp.handleLink(e.currentTarget, e);
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
    patches: [
        {
            find: "{isUsingGuildBio:null!==(",
            replacement: {
                match: /,theme:\i\}\)(?=,.{0,150}setNote:)/,
                replace: "$&,$self.profilePopoutComponent({ user: arguments[0].user, displayProfile: arguments[0].displayProfile })"
            }
        },
        {
            find: ".PROFILE_PANEL,",
            replacement: {
                // createElement(Divider, {}), createElement(NoteComponent)
                match: /\(0,\i\.jsx\)\(\i\.\i,\{\}\).{0,100}setNote:(?=.+?channelId:(\i).id)/,
                replace: "$self.profilePanelComponent({ id: $1.recipients[0] }),$&"
            }
        },
        {
            find: /\.BITE_SIZE,onOpenProfile:\i,usernameIcon:/,
            replacement: {
                match: /currentUser:\i,guild:\i,onOpenProfile:.+?}\)(?=])(?<=user:(\i),bio:null==(\i)\?.+?)/,
                replace: "$&,$self.profilePopoutComponent({ user: $1, displayProfile: $2, simplified: true })"
            }
        }
    ],
    settings,
    profilePopoutComponent,
    profilePanelComponent
});
