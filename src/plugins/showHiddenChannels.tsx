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


import { definePluginSettings } from "@api/settings";
import { Badge } from "@components/Badge";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { proxyLazy } from "@utils/proxyLazy";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy } from "@webpack";
import { Button, ChannelStore, moment, Parser, PermissionStore, SnowflakeUtils, Text, Timestamp, Tooltip } from "@webpack/common";
import { Channel } from "discord-types/general";

const ChannelListClasses = findByPropsLazy("channelName", "subtitle", "modeMuted", "iconContainer");
const Permissions = findLazy(m => typeof m.VIEW_CHANNEL === "bigint");
const ChannelTypes = findByPropsLazy("GUILD_TEXT", "GUILD_FORUM");

const ChannelTypesToChannelName = proxyLazy(() => ({
    [ChannelTypes.GUILD_TEXT]: "TEXT",
    [ChannelTypes.GUILD_ANNOUNCEMENT]: "ANNOUNCEMENT",
    [ChannelTypes.GUILD_FORUM]: "FORUM"
}));

enum ShowMode {
    LockIcon,
    HiddenIconWithMutedStyle
}

const settings = definePluginSettings({
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
    }
});

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Show channels that you do not have access to view.",
    authors: [Devs.BigDuck, Devs.AverageReactEnjoyer, Devs.D3SOX, Devs.Ven, Devs.Nuckyz, Devs.Nickyux, Devs.dzshn],
    settings,

    patches: [
        {
            // RenderLevel defines if a channel is hidden, collapsed in category, visible, etc
            find: ".CannotShow",
            // These replacements only change the necessary CannotShow's
            replacement: [
                {
                    match: /(?<=isChannelGatedAndVisible\(this\.record\.guild_id,this\.record\.id\).+?renderLevel:)(?<RenderLevels>\i)\..+?(?=,)/,
                    replace: "this.category.isCollapsed?$<RenderLevels>.WouldShowIfUncollapsed:$<RenderLevels>.Show"
                },
                // Move isChannelGatedAndVisible renderLevel logic to the bottom to not show hidden channels in case they are muted
                {
                    match: /(?<=(?<permissionCheck>if\(!\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL.+?{)if\(this\.id===\i\).+?};)(?<isChannelGatedAndVisibleCondition>if\(!\i\.\i\.isChannelGatedAndVisible\(.+?})(?<restOfFunction>.+?)(?=return{renderLevel:\i\.Show.{1,40}return \i)/,
                    replace: "$<restOfFunction>$<permissionCheck>$<isChannelGatedAndVisibleCondition>}"
                },
                {
                    match: /(?<=renderLevel:(?<renderLevelExpression>\i\(this,\i\)\?\i\.Show:\i\.WouldShowIfUncollapsed).+?renderLevel:).+?(?=,)/,
                    replace: "$<renderLevelExpression>"
                },
                {
                    match: /(?<=activeJoinedRelevantThreads.+?renderLevel:.+?,threadIds:\i\(this.record.+?renderLevel:)(?<RenderLevels>\i)\..+?(?=,)/,
                    replace: "$<RenderLevels>.Show"
                },
                {
                    match: /(?<=getRenderLevel=function.+?return ).+?\?(?<renderLevelExpressionWithoutPermCheck>.+?):\i\.CannotShow(?=})/,
                    replace: "$<renderLevelExpressionWithoutPermCheck>"
                }
            ]
        },
        {
            // inside the onMouseDown handler, we check if the channel is hidden and open the modal if it is
            find: "VoiceChannel.renderPopout: There must always be something to render",
            replacement: [
                {
                    match: /(?=(?<this>\i)\.handleThreadsPopoutClose\(\))/,
                    replace: "if($self.isHiddenChannel($<this>.props.channel)&&arguments[0].button===0){"
                        + "$self.onHiddenChannelSelected($<this>.props.channel);"
                        + "return;"
                        + "}"
                },
                // Do nothing when trying to join a voice channel if the channel is hidden
                {
                    match: /(?<=handleClick=function\(\){)(?=.{1,80}(?<this>\i)\.handleVoiceConnect\(\))/,
                    replace: "if($self.isHiddenChannel($<this>.props.channel))return;"
                },
                // Render null instead of the buttons if the channel is hidden
                ...[
                    "renderEditButton",
                    "renderInviteButton",
                    "renderOpenChatButton"
                ].map(func => ({
                    match: new RegExp(`(?<=\\i\\.${func}=function\\(\\){)`, "g"), // Global because Discord has multiple declarations of the same functions
                    replace: "if($self.isHiddenChannel(this.props.channel))return null;"
                }))
            ]
        },
        {
            find: ".Messages.CHANNEL_TOOLTIP_DIRECTORY",
            predicate: () => settings.store.showMode === ShowMode.LockIcon,
            replacement: {
                // Lock Icon
                match: /(?=switch\((?<channel>\i)\.type\).{1,30}\.GUILD_ANNOUNCEMENT.{1,30}\(0,\i\.\i\))/,
                replace: "if($self.isHiddenChannel($<channel>))return $self.LockIcon;"
            }
        },
        {
            find: ".UNREAD_HIGHLIGHT",
            predicate: () => settings.store.hideUnreads === true,
            replacement: [{
                // Hide unreads
                match: /(?<=\i\.connected,\i=)(?=(?<props>\i)\.unread)/,
                replace: "$self.isHiddenChannel($<props>.channel)?false:"
            }]
        },
        {
            find: ".UNREAD_HIGHLIGHT",
            predicate: () => settings.store.showMode === ShowMode.HiddenIconWithMutedStyle,
            replacement: [
                // Make the channel appear as muted if it's hidden
                {
                    match: /(?<=\i\.name,\i=)(?=(?<props>\i)\.muted)/,
                    replace: "$self.isHiddenChannel($<props>.channel)?true:"
                },
                // Add the hidden eye icon if the channel is hidden
                {
                    match: /(?<=(?<channel>\i)=\i\.channel,.+?\(\)\.children.+?:null)/,
                    replace: ",$self.isHiddenChannel($<channel>)?$self.HiddenChannelIcon():null"
                },
                // Make voice channels also appear as muted if they are muted
                {
                    match: /(?<=\i\(\)\.wrapper:\i\(\)\.notInteractive,)(?<otherClasses>.+?)(?<mutedClassExpression>(?<isMuted>\i)\?\i\.MUTED)/,
                    replace: "$<mutedClassExpression>:\"\",$<otherClasses>$<isMuted>?\"\""
                }
            ]
        },
        // Make muted channels also appear as unread if hide unreads is false, using the HiddenIconWithMutedStyle and the channel is hidden
        {
            find: ".UNREAD_HIGHLIGHT",
            predicate: () => settings.store.hideUnreads === false && settings.store.showMode === ShowMode.HiddenIconWithMutedStyle,
            replacement: {
                match: /(?<=(?<channel>\i)=\i\.channel,.+?\.LOCKED:\i)/,
                replace: "&&!($self.settings.store.hideUnreads===false&&$self.isHiddenChannel($<channel>))"
            }
        },
        {
            // Hide New unreads box for hidden channels
            find: '.displayName="ChannelListUnreadsStore"',
            replacement: {
                match: /(?<=return null!=(?<channel>\i))(?=.{1,130}hasRelevantUnread\(\i\))/,
                replace: "&&!$self.isHiddenChannel($<channel>)"
            }
        },
        // Patch keybind handlers so you can't accidentally jump to hidden channels
        {
            find: '"alt+shift+down"',
            replacement: {
                match: /(?<=getChannel\(\i\);return null!=(?<channel>\i))(?=.{1,130}hasRelevantUnread\(\i\))/,
                replace: "&&!$self.isHiddenChannel($<channel>)"
            }
        },
        {
            find: '"alt+down"',
            replacement: {
                match: /(?<=getState\(\)\.channelId.{1,30}\(0,\i\.\i\)\(\i\))(?=\.map\()/,
                replace: ".filter(ch=>!$self.isHiddenChannel(ch))"
            }
        },
    ],

    isHiddenChannel(channel: Channel & { channelId?: string; }) {
        if (!channel) return false;

        if (channel.channelId) channel = ChannelStore.getChannel(channel.channelId);
        if (!channel || channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()) return false;

        return !PermissionStore.can(Permissions.VIEW_CHANNEL, channel);
    },

    onHiddenChannelSelected(channel: Channel) {
        // Check for type, otherwise it would attempt to show the modal for stage channels
        if ([ChannelTypes.GUILD_TEXT, ChannelTypes.GUILD_ANNOUNCEMENT, ChannelTypes.GUILD_FORUM].includes(channel.type)) {
            openModal(modalProps => (
                <ModalRoot size={ModalSize.SMALL} {...modalProps}>
                    <ModalHeader>
                        <Flex>
                            <Text variant="heading-md/bold">#{channel.name}</Text>
                            {<Badge text={ChannelTypesToChannelName[channel.type]} color="var(--brand-experiment)" />}
                            {channel.isNSFW() && <Badge text="NSFW" color="var(--status-danger)" />}
                        </Flex>
                    </ModalHeader>
                    <ModalContent style={{ margin: "10px 8px" }}>
                        <Text variant="text-md/normal">You don't have permission to view {channel.type === ChannelTypes.GUILD_FORUM ? "posts" : "messages"} in this channel.</Text>
                        {(channel.topic ?? "").length > 0 && (
                            <>
                                <Text variant="text-md/bold" style={{ marginTop: 10 }}>
                                    {channel.type === ChannelTypes.GUILD_FORUM ? "Guidelines:" : "Topic:"}
                                </Text>
                                <div style={{ color: "var(--text-normal)", marginTop: 10 }}>
                                    {Parser.parseTopic(channel.topic, false, { channelId: channel.id })}
                                </div>
                            </>
                        )}
                        {channel.lastMessageId && (
                            <>
                                <Text variant="text-md/bold" style={{ marginTop: 10 }}>
                                    {channel.type === ChannelTypes.GUILD_FORUM ? "Last Post Created" : "Last Message Sent:"}
                                </Text>
                                <div style={{ color: "var(--text-normal)", marginTop: 10 }}>
                                    <Timestamp timestamp={moment(SnowflakeUtils.extractTimestamp(channel.lastMessageId))} />
                                </div>
                            </>
                        )}
                    </ModalContent>
                    <ModalFooter>
                        <Flex>
                            <Button
                                onClick={modalProps.onClose}
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.PRIMARY}
                            >
                                Close
                            </Button>
                        </Flex>
                    </ModalFooter>
                </ModalRoot>
            ));
        }
    },

    LockIcon: () => (
        <svg
            className={ChannelListClasses.icon}
            height="18"
            width="20"
            viewBox="0 0 24 24"
            aria-hidden={true}
            role="img"
        >
            <path fillRule="evenodd" fill="currentColor" d="M17 11V7C17 4.243 14.756 2 12 2C9.242 2 7 4.243 7 7V11C5.897 11 5 11.896 5 13V20C5 21.103 5.897 22 7 22H17C18.103 22 19 21.103 19 20V13C19 11.896 18.103 11 17 11ZM12 18C11.172 18 10.5 17.328 10.5 16.5C10.5 15.672 11.172 15 12 15C12.828 15 13.5 15.672 13.5 16.5C13.5 17.328 12.828 18 12 18ZM15 11H9V7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V11Z" />
        </svg>
    ),

    HiddenChannelIcon: () => (
        <Tooltip text="Hidden Channel">
            {({ onMouseLeave, onMouseEnter }) => (
                <svg
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter}
                    className={ChannelListClasses.icon}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden={true}
                    role="img"
                    style={{ marginLeft: 6, zIndex: 0, cursor: "not-allowed" }}
                >
                    <path fillRule="evenodd" fill="currentColor" d="m19.8 22.6-4.2-4.15q-.875.275-1.762.413Q12.95 19 12 19q-3.775 0-6.725-2.087Q2.325 14.825 1 11.5q.525-1.325 1.325-2.463Q3.125 7.9 4.15 7L1.4 4.2l1.4-1.4 18.4 18.4ZM12 16q.275 0 .512-.025.238-.025.513-.1l-5.4-5.4q-.075.275-.1.513-.025.237-.025.512 0 1.875 1.312 3.188Q10.125 16 12 16Zm7.3.45-3.175-3.15q.175-.425.275-.862.1-.438.1-.938 0-1.875-1.312-3.188Q13.875 7 12 7q-.5 0-.938.1-.437.1-.862.3L7.65 4.85q1.025-.425 2.1-.638Q10.825 4 12 4q3.775 0 6.725 2.087Q21.675 8.175 23 11.5q-.575 1.475-1.512 2.738Q20.55 15.5 19.3 16.45Zm-4.625-4.6-3-3q.7-.125 1.288.112.587.238 1.012.688.425.45.613 1.038.187.587.087 1.162Z" />
                </svg>
            )}
        </Tooltip>
    )
});
