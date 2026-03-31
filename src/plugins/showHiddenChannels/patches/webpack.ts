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

import { CONNECT, ShowMode } from "@plugins/showHiddenChannels/core/constants";
import { settings } from "@plugins/showHiddenChannels/core/settings";
import type { Patch } from "@utils/types";

export const patches = [
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
                match: /(this\.record\)\?{renderLevel:(.+?),threadIds.+?renderLevel:).+?(?=,threadIds)/g,
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
                match: /(?<=getIgnoredUsersForVoiceChannel\((\i)\.id\)[^;]+?;return\()/,
                replace: (_, channel) => `!$self.isHiddenChannel(${channel})&&`
            },
            {
                // Prevent Discord from trying to connect to hidden voice channels
                match: /(?=\|\|\i\.\i\.selectVoiceChannel\((\i)\.id\))/,
                replace: (_, channel) => `||$self.isHiddenChannel(${channel})`
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
            match: /(\i)\.isRoleSubscriptionTemplatePreviewChannel\(\)/,
            replace: (m, channel) => `${m}||$self.isHiddenChannel(${channel})`
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
            match: /(?<=renderOpenChatButton(?:",|=)\(\)=>{)/,
            replace: "if($self.isHiddenChannel(this.props.channel))return null;"
        }
    },
    {
        find: 'g&&$.push((0,r.jsx)(A.Ay,{size:A.Ay.Sizes.SMALL},"stream"))',
        replacement: {
            match: /(?<=return\(0,(\i)\.jsx\)\((\i),{)disabled:(\i),\.\.\.(\i),isHovered:(\i)(?=}\)\})/,
            replace: (_match, _jsxNamespace, _iconComponent, disabled, props, isHovered) =>
                `disabled:${disabled},...${props},isHovered:${isHovered},isStreaming:(${props}.isStreaming||$self.shouldForceVoiceUserStreaming(${props}.user,${props}.guildId??${props}.channel?.guild_id)),application:(${props}.application??$self.getVoiceUserActivityApplication(${props}.user,${props}.guildId??${props}.channel?.guild_id)),hangStatusActivity:(${props}.hangStatusActivity??$self.getVoiceUserHangStatusActivity(${props}.user,${props}.guildId??${props}.channel?.guild_id)),showHangStatus:(${props}.showHangStatus||$self.shouldShowVoiceUserHangStatus(${props}.user,${props}.guildId??${props}.channel?.guild_id))`
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
                match: /Children\.count.+?;(?=return\(0,\i\.jsxs?\)\(\i\.\i,{focusTarget:)(?<={channel:(\i),name:\i,muted:(\i).+?;)/,
                replace: (m, channel, muted) => `${m}${muted}=$self.isHiddenChannel(${channel})?true:${muted};`
            },
            // Add the hidden eye icon if the channel is hidden
            {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: (m, channel) => `${m},$self.isHiddenChannel(${channel})?$self.HiddenChannelIcon():null`
            },
            // Make voice channels also appear as muted if they are muted
            {
                match: /(?<=\?\i\.\i:\i\.\i,)(.{0,150}?)if\((\i)(?:\)return |\?)(\i\.MUTED)/,
                replace: (_, otherClasses, isMuted, mutedClassExpression) => `${isMuted}?${mutedClassExpression}:"",${otherClasses}if(${isMuted})return ""`
            }
        ]
    },
    {
        find: "UNREAD_IMPORTANT:",
        replacement: [
            {
                // Make muted channels also appear as unread if hide unreads is false, using the HiddenIconWithMutedStyle and the channel is hidden
                predicate: () => settings.store.hideUnreads === false && settings.store.showMode === ShowMode.HiddenIconWithMutedStyle,
                match: /(?<=\.LOCKED;if\()(?<={channel:(\i).+?)/,
                replace: (_, channel) => `!$self.isHiddenChannel(${channel})&&`
            },
            {
                // Hide unreads
                predicate: () => settings.store.hideUnreads === true,
                match: /Children\.count.+?;(?=return\(0,\i\.jsxs?\)\(\i\.\i,{focusTarget:)(?<={channel:(\i),name:\i,.+?unread:(\i).+?)/,
                replace: (m, channel, unread) => `${m}${unread}=$self.isHiddenChannel(${channel})?false:${unread};`
            },
        ]
    },
    {
        // Hide the new version of unreads box for hidden channels
        find: '"ChannelListUnreadsStore"',
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
                match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_TEXT:(?=.+?(\i\.push.{0,50}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                replace: (m, pushNotificationButtonExpression, channel, isLurking) => `${m}if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButtonExpression};break;}`
            },
            {
                match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_MEDIA:(?=.+?(\i\.push.{0,40}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                replace: (m, pushNotificationButtonExpression, channel, isLurking) => `${m}if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButtonExpression};break;}`
            },
            {
                match: /renderMobileToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_DIRECTORY:(?<=let{channel:(\i).+?)/,
                replace: (m, channel) => `${m}if($self.isHiddenChannel(${channel}))break;`
            },
            {
                match: /(?<=renderHeaderBar(?:",|=)\(\)=>{.+?hideSearch:(\i)\.isDirectory\(\))/,
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
            match: /forceFetch:\i,isPreload:.+?}=\i;(?=.+?getChannel\((\i)\))/,
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
                match: /(forceRoles:.+?)(\i\.\i\(\i\.\i\.ADMINISTRATOR,\i\.\i\.VIEW_CHANNEL\))(?<=context:(\i)}.+?)/,
                replace: (_, rest, mergedPermissions, channel) => `${rest}$self.swapViewChannelWithConnectPermission(${mergedPermissions},${channel})`
            },
            {
                // Change the permissionOverwrite check to CONNECT if the channel is locked
                match: /permissionOverwrites\[.+?\i=(?<=context:(\i)}.+?)(?=(.+?)VIEW_CHANNEL)/,
                replace: (m, channel, permCheck) => `${m}!Vencord.Webpack.Common.PermissionStore.can(${CONNECT}n,${channel})?${permCheck}CONNECT):`
            },
            {
                // Include the @everyone role in the allowed roles list for Hidden Channels
                match: /getSortedRoles.+?\.filter\(\i=>(?=!)/,
                replace: m => `${m}$self.isHiddenChannel(arguments[0]?.channel)?true:`
            },
            {
                // If the @everyone role has the required permissions, make the array only contain it
                match: /forceRoles:.+?.value\(\)(?<=channel:(\i).+?)/,
                replace: (m, channel) => `${m}.reduce(...$self.makeAllowedRolesReduce(${channel}.guild_id))`
            },
            {
                // Patch the header to only return allowed users and roles if it's a hidden channel or locked channel (Like when it's used on the HiddenChannelLockScreen)
                match: /return\(0,\i\.jsxs?\)\(\i\.\i,{channelId:(\i)\.id(?=.+?(\(0,\i\.jsxs?\)\("div",{className:\i\.\i,children:\[.{0,100}\i\.length>0.+?\]}\)),)/,
                replace: (m, channel, allowedUsersAndRolesComponent) => `if($self.isHiddenChannel(${channel},true)){return${allowedUsersAndRolesComponent};}${m}`
            },
            {
                // Export the channel for the users allowed component patch
                match: /maxUsers:\d+?,users:\i(?<=channel:(\i).+?)/,
                replace: (m, channel) => `${m},shcChannel:${channel}`
            },
            {
                // Always render the component for multiple allowed users
                match: /1!==\i\.length(?=\|\|)/,
                replace: "true"
            }
        ]
    },
    {
        find: '="interactive-text-default",overflowCountClassName:',
        replacement: [
            {
                // Create a variable for the channel prop
                match: /let{users:\i,maxUsers:\i,/,
                replace: "let{shcChannel}=arguments[0];$&"
            },
            {
                // Make Discord always render the plus button if the component is used inside the HiddenChannelLockScreen
                match: /\i>0(?=&&!\i&&!\i)/,
                replace: m => `($self.isHiddenChannel(typeof shcChannel!=="undefined"?shcChannel:void 0,true)?true:${m})`
            },
            {
                // Show only the plus text without overflowed children amount
                // if the overflow amount is <= 0 and the component is used inside the HiddenChannelLockScreen
                match: /(?<=`\+\$\{)\i(?=\})/,
                replace: overflowTextAmount => "" +
                    `$self.isHiddenChannel(typeof shcChannel!=="undefined"?shcChannel:void 0,true)&&(${overflowTextAmount}-1)<=0?"":${overflowTextAmount}`
            }
        ]
    },
    {
        find: "#{intl::CHANNEL_CALL_CURRENT_SPEAKER}",
        replacement: [
            {
                // Remove the open chat button for the HiddenChannelLockScreen
                match: /(?<=&&)\i\.push\(.{0,120}"chat-spacer"/,
                replace: "(arguments[0]?.inCall||!$self.isHiddenChannel(arguments[0]?.channel,true))&&$&"
            }
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
                match: /(?=\i\|\|\i!==\i\.\i\.FULL_SCREEN.{0,100}?this\._callContainerRef)/,
                replace: '$&!this.props.inCall&&$self.isHiddenChannel(this.props.channel,true)?"":'
            }
        ]
    },
    {
        find: '"HasBeenInStageChannel"',
        replacement: [
            {
                // Render our HiddenChannelLockScreen component instead of the main stage channel component
                match: /screenMessage:(\i)\?.+?children:(?=!\1)(?<=let \i,{channel:(\i).+?)/,
                replace: (m, _isPopoutOpen, channel) => `${m}$self.isHiddenChannel(${channel})?$self.HiddenChannelLockScreen(${channel}):`
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
                match: /(?<=numRequestToSpeak:\i\}\)\}\):null,!\i&&)\(0,\i\.jsxs?\).{0,280}?iconClassName:/,
                replace: "!$self.isHiddenChannel(arguments[0]?.channel,true)&&$&"
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
        find: 'getConfig({location:"channel_mention"})',
        replacement: {
            // Show inside voice channel instead of trying to join them when clicking on a channel mention
            match: /(?<=getChannel\(\i\);if\(null!=(\i)).{0,200}?return void (?=\i\.default\.selectVoiceChannel)/,
            replace: (m, channel) => `${m}!$self.isHiddenChannel(${channel})&&`
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
            },
        ]
    },
    {
        find: "GuildTooltip - ",
        replacement: {
            // Make GuildChannelStore.getChannels return hidden channels
            match: /(?<=getChannels\(\i)(?=\))/,
            replace: ",true"
        }
    },
    {
        find: '"NowPlayingViewStore"',
        replacement: {
            // Make active now voice states on hidden channels
            match: /(getVoiceStateForUser.{0,150}?)&&\i\.\i\.canWithPartialContext.{0,20}VIEW_CHANNEL.+?}\)(?=\?)/,
            replace: "$1"
        }
    },
    {
        find: "getAllApplicationStreams(){return",
        replacement: [
            {
                // Make ApplicationStreamingStore include streams from hidden channels
                match: /\.filter\(e=>null!=e&&\i\(e\.streamType,e\.channelId\)\)/,
                replace: ""
            },
            {
                // Make user-level stream lookup include streams from hidden channels
                match: /Object\.values\((\i)\)\.find\(\i=>\i\(\i\)\)\?\?null/,
                replace: "Object.values($1).find(e=>null!=e)??null"
            }
        ]
    }
] satisfies Omit<Patch, "plugin">[];
