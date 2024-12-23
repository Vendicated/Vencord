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

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, PermissionsBits, PermissionStore, Tooltip } from "@webpack/common";
import type { Channel, Role } from "discord-types/general";

import HiddenChannelLockScreen from "./components/HiddenChannelLockScreen";

const ChannelListClasses = findByPropsLazy("modeMuted", "modeSelected", "unread", "icon");

const enum ShowMode {
    LockIcon,
    HiddenIconWithMutedStyle
}

const CONNECT = 1n << 20n;

export const settings = definePluginSettings({
    hideUnreads: {
        description: "Hide Unreads",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    showMode: {
        description: "The mode used to display hidden channels.",
        type: OptionType.SELECT,
        options: [
            { label: "Plain style with Lock Icon instead", value: ShowMode.LockIcon, default: true },
            { label: "Muted style with hidden eye icon on the right", value: ShowMode.HiddenIconWithMutedStyle },
        ],
        restartNeeded: true
    },
    defaultAllowedUsersAndRolesDropdownState: {
        description: "Whether the allowed users and roles dropdown on hidden channels should be open by default",
        type: OptionType.BOOLEAN,
        default: true
    }
});

function isUncategorized(objChannel: { channel: Channel; comparator: number; }) {
    return objChannel.channel.id === "null" && objChannel.channel.name === "Uncategorized" && objChannel.comparator === -1;
}

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Show channels that you do not have access to view.",
    authors: [Devs.BigDuck, Devs.AverageReactEnjoyer, Devs.D3SOX, Devs.Ven, Devs.Nuckyz, Devs.Nickyux, Devs.dzshn],
    settings,

    patches: [
        {
            // RenderLevel defines if a channel is hidden, collapsed in category, visible, etc
            find: '"placeholder-channel-id"',
            replacement: [
                // Remove the special logic for channels we don't have access to
                {
                    match: /if\(!\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL.+?{if\(this\.id===\i\).+?threadIds:\[\]}}/,
                    replace: ""
                },
                // Do not check for unreads when selecting the render level if the channel is hidden
                {
                    match: /(?<=&&)(?=!\i\.\i\.hasUnread\(this\.record\.id\))/,
                    replace: "$self.isHiddenChannel(this.record)||"
                },
                // Make channels we dont have access to be the same level as normal ones
                {
                    match: /(activeJoinedRelevantThreads:.{0,50}VIEW_CHANNEL.+?renderLevel:(.+?),threadIds.+?renderLevel:).+?(?=,threadIds)/g,
                    replace: (_, rest, defaultRenderLevel) => `${rest}${defaultRenderLevel}`
                },
                // Remove permission checking for getRenderLevel function
                {
                    match: /(getRenderLevel\(\i\){.+?return)!\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL,this\.record\)\|\|/,
                    replace: (_, rest) => `${rest} `
                }
            ]
        },
        {
            find: "VoiceChannel, transitionTo: Channel does not have a guildId",
            replacement: [
                {
                    // Do not show confirmation to join a voice channel when already connected to another if clicking on a hidden voice channel
                    match: /(?<=getIgnoredUsersForVoiceChannel\((\i)\.id\);return\()/,
                    replace: (_, channel) => `!$self.isHiddenChannel(${channel})&&`
                },
                {
                    // Prevent Discord from trying to connect to hidden voice channels
                    match: /(?=&&\i\.\i\.selectVoiceChannel\((\i)\.id\))/,
                    replace: (_, channel) => `&&!$self.isHiddenChannel(${channel})`
                },
                {
                    // Make Discord show inside the channel if clicking on a hidden or locked channel
                    match: /!__OVERLAY__&&\((?<=selectVoiceChannel\((\i)\.id\).+?)/,
                    replace: (m, channel) => `${m}$self.isHiddenChannel(${channel},true)||`
                }
            ]
        },
        // Prevent Discord from trying to connect to hidden stage channels
        {
            find: ".AUDIENCE),{isSubscriptionGated",
            replacement: {
                match: /!(\i)\.isRoleSubscriptionTemplatePreviewChannel\(\)/,
                replace: (m, channel) => `${m}&&!$self.isHiddenChannel(${channel})`
            }
        },
        {
            find: 'tutorialId:"instant-invite"',
            replacement: [
                // Render null instead of the buttons if the channel is hidden
                ...[
                    "renderEditButton",
                    "renderInviteButton",
                ].map(func => ({
                    match: new RegExp(`(?<=${func}\\(\\){)`, "g"), // Global because Discord has multiple declarations of the same functions
                    replace: "if($self.isHiddenChannel(this.props.channel))return null;"
                }))
            ]
        },
        {
            find: "VoiceChannel.renderPopout: There must always be something to render",
            all: true,
            // Render null instead of the buttons if the channel is hidden
            replacement: {
                match: /(?<="renderOpenChatButton",\(\)=>{)/,
                replace: "if($self.isHiddenChannel(this.props.channel))return null;"
            }
        },
        {
            find: "#{intl::CHANNEL_TOOLTIP_DIRECTORY}",
            predicate: () => settings.store.showMode === ShowMode.LockIcon,
            replacement: {
                // Lock Icon
                match: /(?=switch\((\i)\.type\).{0,30}\.GUILD_ANNOUNCEMENT.{0,70}\(0,\i\.\i\))/,
                replace: (_, channel) => `if($self.isHiddenChannel(${channel}))return $self.LockIcon;`
            }
        },
        {
            find: "UNREAD_IMPORTANT:",
            predicate: () => settings.store.showMode === ShowMode.HiddenIconWithMutedStyle,
            replacement: [
                // Make the channel appear as muted if it's hidden
                {
                    match: /{channel:(\i),name:\i,muted:(\i).+?;/,
                    replace: (m, channel, muted) => `${m}${muted}=$self.isHiddenChannel(${channel})?true:${muted};`
                },
                // Add the hidden eye icon if the channel is hidden
                {
                    match: /\.name,{.{0,140}\.children.+?:null(?<=,channel:(\i).+?)/,
                    replace: (m, channel) => `${m},$self.isHiddenChannel(${channel})?$self.HiddenChannelIcon():null`
                },
                // Make voice channels also appear as muted if they are muted
                {
                    match: /(?<=\.wrapper:\i\.notInteractive,)(.+?)if\((\i)\)return (\i\.MUTED);/,
                    replace: (_, otherClasses, isMuted, mutedClassExpression) => `${isMuted}?${mutedClassExpression}:"",${otherClasses}if(${isMuted})return "";`
                }
            ]
        },
        {
            find: "UNREAD_IMPORTANT:",
            replacement: [
                {
                    // Make muted channels also appear as unread if hide unreads is false, using the HiddenIconWithMutedStyle and the channel is hidden
                    predicate: () => settings.store.hideUnreads === false && settings.store.showMode === ShowMode.HiddenIconWithMutedStyle,
                    match: /\.LOCKED;if\((?<={channel:(\i).+?)/,
                    replace: (m, channel) => `${m}!$self.isHiddenChannel(${channel})&&`
                },
                {
                    // Hide unreads
                    predicate: () => settings.store.hideUnreads === true,
                    match: /{channel:(\i),name:\i,.+?unread:(\i).+?;/,
                    replace: (m, channel, unread) => `${m}${unread}=$self.isHiddenChannel(${channel})?false:${unread};`
                }
            ]
        },
        {
            // Hide the new version of unreads box for hidden channels
            find: '="ChannelListUnreadsStore",',
            replacement: {
                match: /(?<=\.id\)\))(?=&&\(0,\i\.\i\)\((\i)\))/,
                replace: (_, channel) => `&&!$self.isHiddenChannel(${channel})`
            }
        },
        {
            // Make the old version of unreads box not visible for hidden channels
            find: "renderBottomUnread(){",
            replacement: {
                match: /(?<=!0\))(?=&&\(0,\i\.\i\)\((\i\.record)\))/,
                replace: "&&!$self.isHiddenChannel($1)"
            }
        },
        {
            // Make the state of the old version of unreads box not include hidden channels
            find: "ignoreRecents:!0",
            replacement: {
                match: /(?<=\.id\)\))(?=&&\(0,\i\.\i\)\((\i)\))/,
                replace: "&&!$self.isHiddenChannel($1)"
            }
        },
        // Only render the channel header and buttons that work when transitioning to a hidden channel
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: [
                {
                    match: /(?<="renderHeaderToolbar",\(\)=>{.+?case \i\.\i\.GUILD_TEXT:)(?=.+?(\i\.push.{0,50}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: (_, pushNotificationButtonExpression, channel, isLurking) => `if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButtonExpression};break;}`
                },
                {
                    match: /(?<="renderHeaderToolbar",\(\)=>{.+?case \i\.\i\.GUILD_MEDIA:)(?=.+?(\i\.push.{0,40}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: (_, pushNotificationButtonExpression, channel, isLurking) => `if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButtonExpression};break;}`
                },
                {
                    match: /"renderMobileToolbar",\(\)=>{.+?case \i\.\i\.GUILD_DIRECTORY:(?<=let{channel:(\i).+?)/,
                    replace: (m, channel) => `${m}if($self.isHiddenChannel(${channel}))break;`
                },
                {
                    match: /(?<="renderHeaderBar",\(\)=>{.+?hideSearch:(\i)\.isDirectory\(\))/,
                    replace: (_, channel) => `||$self.isHiddenChannel(${channel})`
                },
                {
                    match: /(?<=renderSidebar\(\){)/,
                    replace: "if($self.isHiddenChannel(this.props.channel))return null;"
                },
                {
                    match: /(?<=renderChat\(\){)/,
                    replace: "if($self.isHiddenChannel(this.props.channel))return $self.HiddenChannelLockScreen(this.props.channel);"
                }
            ]
        },
        // Avoid trying to fetch messages from hidden channels
        {
            find: '"MessageManager"',
            replacement: {
                match: /"Skipping fetch because channelId is a static route"\);return}(?=.+?getChannel\((\i)\))/,
                replace: (m, channelId) => `${m}if($self.isHiddenChannel({channelId:${channelId}}))return;`
            }
        },
        // Patch keybind handlers so you can't accidentally jump to hidden channels
        {
            find: '"alt+shift+down"',
            replacement: {
                match: /(?<=getChannel\(\i\);return null!=(\i))(?=.{0,200}?>0\)&&\(0,\i\.\i\)\(\i\))/,
                replace: (_, channel) => `&&!$self.isHiddenChannel(${channel})`
            }
        },
        // Patch keybind handlers so you can't accidentally jump to hidden channels
        {
            find: ".APPLICATION_STORE&&null!=",
            replacement: {
                match: /getState\(\)\.channelId.+?(?=\.map\(\i=>\i\.id)/,
                replace: "$&.filter(e=>!$self.isHiddenChannel(e))"
            }
        },
        {
            find: "#{intl::ROLE_REQUIRED_SINGLE_USER_MESSAGE}",
            replacement: [
                {
                    // Change the role permission check to CONNECT if the channel is locked
                    match: /ADMINISTRATOR\)\|\|(?<=context:(\i)}.+?)(?=(.+?)VIEW_CHANNEL)/,
                    replace: (m, channel, permCheck) => `${m}!Vencord.Webpack.Common.PermissionStore.can(${CONNECT}n,${channel})?${permCheck}CONNECT):`
                },
                {
                    // Change the permissionOverwrite check to CONNECT if the channel is locked
                    match: /permissionOverwrites\[.+?\i=(?<=context:(\i)}.+?)(?=(.+?)VIEW_CHANNEL)/,
                    replace: (m, channel, permCheck) => `${m}!Vencord.Webpack.Common.PermissionStore.can(${CONNECT}n,${channel})?${permCheck}CONNECT):`
                },
                {
                    // Include the @everyone role in the allowed roles list for Hidden Channels
                    match: /sortBy.{0,30}?\.filter\(\i=>(?<=channel:(\i).+?)/,
                    replace: (m, channel) => `${m}$self.isHiddenChannel(${channel})?true:`
                },
                {
                    // If the @everyone role has the required permissions, make the array only contain it
                    match: /forceRoles:.+?.value\(\)(?<=channel:(\i).+?)/,
                    replace: (m, channel) => `${m}.reduce(...$self.makeAllowedRolesReduce(${channel}.guild_id))`
                },
                {
                    // Patch the header to only return allowed users and roles if it's a hidden channel or locked channel (Like when it's used on the HiddenChannelLockScreen)
                    match: /MANAGE_ROLES.{0,90}?return(?=\(.+?(\(0,\i\.jsxs\)\("div",{className:\i\.members.+?guildId:(\i)\.guild_id.+?roleColor.+?\]}\)))/,
                    replace: (m, component, channel) => {
                        // Export the channel for the users allowed component patch
                        component = component.replace(canonicalizeMatch(/(?<=users:\i)/), `,shcChannel:${channel}`);
                        // Always render the component for multiple allowed users
                        component = component.replace(canonicalizeMatch(/1!==\i\.length/), "true");

                        return `${m} $self.isHiddenChannel(${channel},true)?${component}:`;
                    }
                }
            ]
        },
        {
            find: '})},"overflow"))',
            replacement: [
                {
                    // Create a variable for the channel prop
                    match: /users:\i,maxUsers:\i.+?}=(\i).*?;/,
                    replace: (m, props) => `${m}let{shcChannel}=${props};`
                },
                {
                    // Make Discord always render the plus button if the component is used inside the HiddenChannelLockScreen
                    match: /\i>0(?=&&.{0,60}renderPopout)/,
                    replace: m => `($self.isHiddenChannel(typeof shcChannel!=="undefined"?shcChannel:void 0,true)?true:${m})`
                },
                {
                    // Prevent Discord from overwriting the last children with the plus button if the overflow amount is <= 0 and the component is used inside the HiddenChannelLockScreen
                    match: /(?<=\.value\(\),(\i)=.+?length-)1(?=\]=.{0,60}renderPopout)/,
                    replace: (_, amount) => `($self.isHiddenChannel(typeof shcChannel!=="undefined"?shcChannel:void 0,true)&&${amount}<=0?0:1)`
                },
                {
                    // Show only the plus text without overflowed children amount if the overflow amount is <= 0 and the component is used inside the HiddenChannelLockScreen
                    match: /(?<="\+",)(\i)\+1/,
                    replace: (m, amount) => `$self.isHiddenChannel(typeof shcChannel!=="undefined"?shcChannel:void 0,true)&&${amount}<=0?"":${m}`
                }
            ]
        },
        {
            find: "#{intl::CHANNEL_CALL_CURRENT_SPEAKER}",
            replacement: [
                {
                    // Remove the divider and the open chat button for the HiddenChannelLockScreen
                    match: /"more-options-popout"\)\),(?<=channel:(\i).+?inCall:(\i).+?)/,
                    replace: (m, channel, inCall) => `${m}${inCall}||!$self.isHiddenChannel(${channel},true)&&`
                },
                {
                    // Remove invite users button for the HiddenChannelLockScreen
                    match: /"popup".{0,100}?if\((?<=channel:(\i).+?inCall:(\i).+?)/,
                    replace: (m, channel, inCall) => `${m}(${inCall}||!$self.isHiddenChannel(${channel},true))&&`
                },
            ]
        },
        {
            find: "#{intl::EMBEDDED_ACTIVITIES_DEVELOPER_ACTIVITY_SHELF_FETCH_ERROR}",
            replacement: [
                {
                    // Render our HiddenChannelLockScreen component instead of the main voice channel component
                    match: /renderContent\(\i\){.+?this\.renderVoiceChannelEffects.+?children:/,
                    replace: "$&!this.props.inCall&&$self.isHiddenChannel(this.props.channel,true)?$self.HiddenChannelLockScreen(this.props.channel):"
                },
                {
                    // Disable gradients for the HiddenChannelLockScreen of voice channels
                    match: /renderContent\(\i\){.+?disableGradients:/,
                    replace: "$&!this.props.inCall&&$self.isHiddenChannel(this.props.channel,true)||"
                },
                {
                    // Disable useless components for the HiddenChannelLockScreen of voice channels
                    match: /(?:{|,)render(?!Header|ExternalHeader).{0,30}?:/g,
                    replace: "$&!this.props.inCall&&$self.isHiddenChannel(this.props.channel,true)?()=>null:"
                },
                {
                    // Disable bad CSS class which mess up hidden voice channels styling
                    match: /callContainer,(?<=\i\.callContainer,)/,
                    replace: '$&!this.props.inCall&&$self.isHiddenChannel(this.props.channel,true)?"":'
                }
            ]
        },
        {
            find: '"HasBeenInStageChannel"',
            replacement: [
                {
                    // Render our HiddenChannelLockScreen component instead of the main stage channel component
                    match: /"124px".+?children:(?<=let \i,{channel:(\i).+?)(?=.{0,20}?}\)}function)/,
                    replace: (m, channel) => `${m}$self.isHiddenChannel(${channel})?$self.HiddenChannelLockScreen(${channel}):`
                },
                {
                    // Disable useless components for the HiddenChannelLockScreen of stage channels
                    match: /render(?:BottomLeft|BottomCenter|BottomRight|ChatToasts):\(\)=>(?<=let \i,{channel:(\i).+?)/g,
                    replace: (m, channel) => `${m}$self.isHiddenChannel(${channel})?null:`
                },
                {
                    // Disable gradients for the HiddenChannelLockScreen of stage channels
                    match: /"124px".+?disableGradients:(?<=let \i,{channel:(\i).+?)/,
                    replace: (m, channel) => `${m}$self.isHiddenChannel(${channel})||`
                },
                {
                    // Disable strange styles applied to the header for the HiddenChannelLockScreen of stage channels
                    match: /"124px".+?style:(?<=let \i,{channel:(\i).+?)/,
                    replace: (m, channel) => `${m}$self.isHiddenChannel(${channel})?void 0:`
                }
            ]
        },
        {
            find: "#{intl::STAGE_FULL_MODERATOR_TITLE}",
            replacement: [
                {
                    // Remove the divider and amount of users in stage channel components for the HiddenChannelLockScreen
                    match: /\(0,\i\.jsx\)\(\i\.\i\.Divider.+?}\)]}\)(?=.+?:(\i)\.guild_id)/,
                    replace: (m, channel) => `$self.isHiddenChannel(${channel})?null:(${m})`
                },
                {
                    // Remove the open chat button for the HiddenChannelLockScreen
                    match: /"recents".+?&&(?=\(.+?channelId:(\i)\.id,showRequestToSpeakSidebar)/,
                    replace: (m, channel) => `${m}!$self.isHiddenChannel(${channel})&&`
                }
            ]
        },
        {
            // Make the chat input bar channel list contain hidden channels
            find: ",queryStaticRouteChannels(",
            replacement: [
                {
                    // Make the getChannels call to GuildChannelStore return hidden channels
                    match: /(?<=queryChannels\(\i\){.+?getChannels\(\i)(?=\))/,
                    replace: ",true"
                },
                {
                    // Avoid filtering out hidden channels from the channel list
                    match: /(?<=queryChannels\(\i\){.+?\)\((\i)\.type\))(?=&&!\i\.\i\.can\()/,
                    replace: "&&!$self.isHiddenChannel($1)"
                }
            ]
        },
        {
            find: "\"^/guild-stages/(\\\\d+)(?:/)?(\\\\d+)?\"",
            replacement: {
                // Make mentions of hidden channels work
                match: /\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL,\i\)/,
                replace: "true"
            },
        },
        {
            find: 'className:"channelMention",children',
            replacement: {
                // Show inside voice channel instead of trying to join them when clicking on a channel mention
                match: /(?<=getChannel\(\i\);if\(null!=(\i))(?=.{0,100}?selectVoiceChannel)/,
                replace: (_, channel) => `&&!$self.isHiddenChannel(${channel})`
            }
        },
        {
            find: '"GuildChannelStore"',
            replacement: [
                {
                    // Make GuildChannelStore contain hidden channels
                    match: /isChannelGated\(.+?\)(?=&&)/,
                    replace: m => `${m}&&false`
                },
                {
                    // Filter hidden channels from GuildChannelStore.getChannels unless told otherwise
                    match: /(?<=getChannels\(\i)(\){.*?)return (.+?)}/,
                    replace: (_, rest, channels) => `,shouldIncludeHidden${rest}return $self.resolveGuildChannels(${channels},shouldIncludeHidden??arguments[0]==="@favorites");}`
                }
            ]
        },
        {
            find: "#{intl::FORM_LABEL_MUTED}",
            replacement: {
                // Make GuildChannelStore.getChannels return hidden channels
                match: /(?<=getChannels\(\i)(?=\))/,
                replace: ",true"
            }
        },
        {
            find: '="NowPlayingViewStore",',
            replacement: {
                // Make active now voice states on hidden channels
                match: /(getVoiceStateForUser.{0,150}?)&&\i\.\i\.canWithPartialContext.{0,20}VIEW_CHANNEL.+?}\)(?=\?)/,
                replace: "$1"
            }
        }
    ],

    isHiddenChannel(channel: Channel & { channelId?: string; }, checkConnect = false) {
        try {
            if (!channel) return false;

            if (channel.channelId) channel = ChannelStore.getChannel(channel.channelId);
            if (!channel || channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()) return false;

            return !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) || checkConnect && !PermissionStore.can(PermissionsBits.CONNECT, channel);
        } catch (e) {
            console.error("[ViewHiddenChannels#isHiddenChannel]: ", e);
            return false;
        }
    },

    resolveGuildChannels(channels: Record<string | number, Array<{ channel: Channel; comparator: number; }> | string | number>, shouldIncludeHidden: boolean) {
        if (shouldIncludeHidden) return channels;

        const res = {};
        for (const [key, maybeObjChannels] of Object.entries(channels)) {
            if (!Array.isArray(maybeObjChannels)) {
                res[key] = maybeObjChannels;
                continue;
            }

            res[key] ??= [];

            for (const objChannel of maybeObjChannels) {
                if (isUncategorized(objChannel) || objChannel.channel.id === null || !this.isHiddenChannel(objChannel.channel)) res[key].push(objChannel);
            }
        }

        return res;
    },

    makeAllowedRolesReduce(guildId: string) {
        return [
            (prev: Array<Role>, _: Role, index: number, originalArray: Array<Role>) => {
                if (index !== 0) return prev;

                const everyoneRole = originalArray.find(role => role.id === guildId);

                if (everyoneRole) return [everyoneRole];
                return originalArray;
            },
            [] as Array<Role>
        ];
    },

    HiddenChannelLockScreen: (channel: any) => <HiddenChannelLockScreen channel={channel} />,

    LockIcon: ErrorBoundary.wrap(() => (
        <svg
            className={ChannelListClasses.icon}
            height="18"
            width="20"
            viewBox="0 0 24 24"
            aria-hidden={true}
            role="img"
        >
            <path className="shc-evenodd-fill-current-color" d="M17 11V7C17 4.243 14.756 2 12 2C9.242 2 7 4.243 7 7V11C5.897 11 5 11.896 5 13V20C5 21.103 5.897 22 7 22H17C18.103 22 19 21.103 19 20V13C19 11.896 18.103 11 17 11ZM12 18C11.172 18 10.5 17.328 10.5 16.5C10.5 15.672 11.172 15 12 15C12.828 15 13.5 15.672 13.5 16.5C13.5 17.328 12.828 18 12 18ZM15 11H9V7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V11Z" />
        </svg>
    ), { noop: true }),

    HiddenChannelIcon: ErrorBoundary.wrap(() => (
        <Tooltip text="Hidden Channel">
            {({ onMouseLeave, onMouseEnter }) => (
                <svg
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter}
                    className={ChannelListClasses.icon + " " + "shc-hidden-channel-icon"}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden={true}
                    role="img"
                >
                    <path className="shc-evenodd-fill-current-color" d="m19.8 22.6-4.2-4.15q-.875.275-1.762.413Q12.95 19 12 19q-3.775 0-6.725-2.087Q2.325 14.825 1 11.5q.525-1.325 1.325-2.463Q3.125 7.9 4.15 7L1.4 4.2l1.4-1.4 18.4 18.4ZM12 16q.275 0 .512-.025.238-.025.513-.1l-5.4-5.4q-.075.275-.1.513-.025.237-.025.512 0 1.875 1.312 3.188Q10.125 16 12 16Zm7.3.45-3.175-3.15q.175-.425.275-.862.1-.438.1-.938 0-1.875-1.312-3.188Q13.875 7 12 7q-.5 0-.938.1-.437.1-.862.3L7.65 4.85q1.025-.425 2.1-.638Q10.825 4 12 4q3.775 0 6.725 2.087Q21.675 8.175 23 11.5q-.575 1.475-1.512 2.738Q20.55 15.5 19.3 16.45Zm-4.625-4.6-3-3q.7-.125 1.288.112.587.238 1.012.688.425.45.613 1.038.187.587.087 1.162Z" />
                </svg>
            )}
        </Tooltip>
    ), { noop: true })
});
