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

import "./VoiceChannelSection.css";

import { classNameFactory } from "@api/Styles";
import { LazyComponent } from "@utils/lazyReact";
import { findByCode, findByCodeLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { Button, Forms, GuildStore, PermissionStore, Toasts, Tooltip, UserStore } from "@webpack/common";
import type { Channel, User } from "discord-types/general";
import { PropsWithChildren, SVGProps } from "react";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const ChannelActions = findByPropsLazy("selectChannel", "selectVoiceChannel");
const UserPopoutSection = findByCodeLazy(".lastSection", "children:");
const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");


const CONNECT = 1n << 20n;

interface VoiceChannelFieldProps {
    channel: Channel;
    showHeader: boolean;
    joinDisabled: boolean;
}

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}
const icon = "M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00204H3C2.45 8.00204 2 8.45304 2 9.00204V15.002C2 15.552 2.45 16.002 3 16.002H6L10.293 20.71C10.579 20.996 11.009 21.082 11.383 20.927C11.757 20.772 12 20.407 12 20.002V4.00204C12 3.59904 11.757 3.23204 11.383 3.07904ZM14 5.00195V7.00195C16.757 7.00195 19 9.24595 19 12.002C19 14.759 16.757 17.002 14 17.002V19.002C17.86 19.002 21 15.863 21 12.002C21 8.14295 17.86 5.00195 14 5.00195ZM14 9.00195C15.654 9.00195 17 10.349 17 12.002C17 13.657 15.654 15.002 14 15.002V13.002C14.551 13.002 15 12.553 15 12.002C15 11.451 14.551 11.002 14 11.002V9.00195Z"; // M11.383 3.07904C11.009 2.92504 10.579 3.01004

const cl = classNameFactory("vc-uvs-");

interface BaseIconProps extends SVGProps<SVGSVGElement> {
    viewBox?: string;
    className?: string;
    height?: string | number;
    width?: string | number;
}
function SvgIcon({ height = 24, width = 24, className, path, children, viewBox = "0 0 24 24", ...svgProps }: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={cl(className, "vc-icon")}
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            <path fill="currentColor" d={path} />
        </svg>
    );
}

function makeRenderMoreUsers(users: User[], count = 5) {
    return function renderMoreUsers(_label: string, _count: number) {
        return (
            <Tooltip text={users.slice(count - 1).map(u => u.username).join(", ")} >
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{users.length - count + 1}
                    </div>
                )}
            </Tooltip >
        );
    };
}

export const VoiceChannelSection = ({ channel, showHeader, joinDisabled }: VoiceChannelFieldProps) => {
    const users = (Object.values(VoiceStateStore.getVoiceStatesForChannel(channel.id)) as VoiceState[]).map(vs => UserStore.getUser(vs.userId));

    const guild = GuildStore.getGuild(channel.guild_id);

    const channelPath = guild ? `/channels/${guild.id}/${channel.id}` : `/channels/@me/${channel.id}`;

    return (<UserPopoutSection>
        {showHeader && <Forms.FormTitle className={cl("header")}>
            In a voice channel
            <div>
                <UserSummaryItem
                    users={users}
                    guildId={channel.guild_id}
                    renderIcon={false}
                    max={3}
                    size={20}
                    renderMoreUsers={makeRenderMoreUsers(users, 3)}
                />
            </div>
        </Forms.FormTitle>}
        <div className="vc-uvs-container">
            <div className={cl("channelinfo")}>
                <img className={cl("guild-image")} src={guild.getIconURL(128, false)} alt="Serve Icon" width={48} />
                <div className={cl("guild-name")}>
                    <h3>{guild.name}</h3>
                    <div>{channel.name}</div>
                </div>
            </div>
            <div className={cl("buttons")}>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    size={Button.Sizes.SMALL}

                    onClick={() => {
                        if (!PermissionStore.can(CONNECT, channel) && guild)
                            Vencord.Webpack.Common.NavigationRouter.transitionToGuild(channel.guild_id);
                        else
                            Vencord.Webpack.Common.NavigationRouter.transitionTo(channelPath);
                    }}
                >View Channel</Button>
                <Tooltip text={<div>{joinDisabled ? "Already in this channel" : "Join this channel"}</div>}>
                    {({ onMouseEnter, onMouseLeave }) => <Button
                        className={cl("join")}
                        color={Button.Colors.TRANSPARENT}
                        size={Button.Sizes.SMALL}
                        disabled={joinDisabled}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}

                        onClick={() => {
                            if (PermissionStore.can(CONNECT, channel))
                                ChannelActions.selectVoiceChannel(channel.id);
                            else
                                Toasts.show({
                                    message: "Insufficient permissions to enter the channel.",
                                    id: "user-voice-show-insufficient-permissions",
                                    type: Toasts.Type.FAILURE,
                                    options: {
                                        position: Toasts.Position.BOTTOM,
                                    }
                                });
                        }}
                    >
                        <SvgIcon className="speaker" width="20" height="20" path={icon} />
                    </Button>}
                </Tooltip>
            </div>
        </div>
    </UserPopoutSection>);
};
