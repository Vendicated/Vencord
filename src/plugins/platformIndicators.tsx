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

import { Settings } from "../api/settings";
import ErrorBoundary from "../components/ErrorBoundary";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { Forms, PresenceStore, React, Tooltip } from "../webpack/common";

const DesktopIcon = props => (
    <svg onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave} height="18" width="18" viewBox="0 0 24 24" fill={props.color}><path d="M4 2.5c-1.103 0-2 .897-2 2v11c0 1.104.897 2 2 2h7v2H7v2h10v-2h-4v-2h7c1.103 0 2-.896 2-2v-11c0-1.103-.897-2-2-2H4Zm16 2v9H4v-9h16Z" /></svg>
);

const WebIcon = props => (
    <svg onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave} height="18" width="18" viewBox="0 0 24 24" fill={props.color}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93Zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39Z" /></svg>
);

const MobileIcon = props => (
    <svg onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave} height="18" width="18" viewBox="0 0 24 24" fill={props.color}><path d="M15.5 1h-8A2.5 2.5 0 0 0 5 3.5v17A2.5 2.5 0 0 0 7.5 23h8a2.5 2.5 0 0 0 2.5-2.5v-17A2.5 2.5 0 0 0 15.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z" /></svg>
);

const ConsoleIcon = props => (
    <svg onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave} width="18" height="18" viewBox="0 0 50 50" fill={props.color}><path d="M14.8 2.7 9 3.1V47h3.3c1.7 0 6.2.3 10 .7l6.7.6V2l-4.2.2c-2.4.1-6.9.3-10 .5zm1.8 6.4c1 1.7-1.3 3.6-2.7 2.2C12.7 10.1 13.5 8 15 8c.5 0 1.2.5 1.6 1.1zM16 33c0 6-.4 10-1 10s-1-4-1-10 .4-10 1-10 1 4 1 10zm15-8v23.3l3.8-.7c2-.3 4.7-.6 6-.6H43V3h-2.2c-1.3 0-4-.3-6-.6L31 1.7V25z" /></svg>
);

const PlatformIcon = ({ platform, status }) => {

    // Thanks copilot for this pile of shit
    const color = status === "online" ? "#43b581" : status === "idle" ? "#faa61a" : status === "dnd" ? "#f04747" : "#747f8d";

    const tooltip = platform === "desktop" ? "Desktop" : platform === "web" ? "Web" : platform === "mobile" ? "Mobile" : "Embedded";

    const Icon = platform === "desktop" ? DesktopIcon : platform === "web" ? WebIcon : platform === "mobile" ? MobileIcon : ConsoleIcon;

    return <Tooltip text={tooltip} >
        {({ onMouseEnter, onMouseLeave }) => (
            <Icon
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                color={color} />
        )}
    </Tooltip >;
};

const PlatfromIndicator = ({ user }) => {

    if (!user || user?.bot) return null;

    const statuses = PresenceStore.getState()?.clientStatuses;
    if (!statuses) return null;

    let status: any = null;
    Object.entries(statuses).forEach(s => {
        if (s[0] === user?.id) {
            status = s[1];
            return;
        }
    });

    if (!status) return null;

    const icons: Array<JSX.Element> = [];
    Object.entries(status).forEach(s => {
        icons.push(<PlatformIcon platform={s[0]} status={s[1]} />);
    });

    return <ErrorBoundary noop>
        <div className="platformIndicators" style={{ display: "flex", alignItems: "center", marginLeft: "4px" }}> {icons} </div>
    </ErrorBoundary>;
};

export default definePlugin({
    name: "PlatformIndicators",
    description: "Adds indicators for the platforms users are using",
    authors: [Devs.kemo],

    patches: [
        {
            // Server member list decorators
            find: "this.renderPremium()",
            replacement: {
                match: /this.renderPremium\(\).*?\]/,
                replace: "$&.concat(Vencord.Plugins.plugins.PlatformIndicators.renderPlatformIndicators(this.props))"
            }
        },
        {
            // Dm list decorators
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(subText:(.{1,3})\..+?decorators:)(.+?:null)/,
                replace: "$1[$3].concat(Vencord.Plugins.plugins.PlatformIndicators.renderPlatformIndicators($2.props))"
            }
        },
        {
            // User badges
            find: "Messages.PROFILE_USER_BADGES",
            predicate: () => Settings.plugins.PlatformIndicators.showAsBadges,
            replacement: {
                match: /(Messages\.PROFILE_USER_BADGES,role:"group",children:)(.+?\.key\)\}\)\))/,
                replace: "$1[Vencord.Plugins.plugins.PlatformIndicators.renderPlatformIndicators(e)].concat($2)"
            }
        }
    ],

    renderPlatformIndicators: (props: any) => <PlatfromIndicator user={props.user} />,

    options: {
        showAsBadges: {
            description: "Show platform icons in user badges",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        }
    }
});
