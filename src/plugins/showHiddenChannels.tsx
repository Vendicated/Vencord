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

import { Flex } from "../components/Flex";
import { Devs } from "../utils/constants";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "../utils/modal";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { waitFor } from "../webpack";
import { Button, ChannelStore, Text } from "../webpack/common";

const CONNECT = 1048576n;
const VIEW_CHANNEL = 1024n;

let can = (permission, channel) => true;
waitFor(m => m.can && m.initialize, m => ({ can } = m));

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Show hidden channels",
    authors: [
        {
            name: "BigDuck",
            id: 1024588272623681609n
        },
        {
            name: "Average React Enjoyer",
            id: 1004904120056029256n
        },
        Devs.D3SOX,
    ],
    options: {
        hideUnreads: {
            description: "Hide unreads",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true // Restart is needed to refresh channel list
        }
    },
    patches: [
        {
            // RenderLevel defines if a channel is hidden, collapsed in category, visible, etc
            find: ".CannotShow",
            replacement: {
                match: /renderLevel:(\w+)\.CannotShow/g,
                replace: "renderLevel:Vencord.Plugins.plugins.ShowHiddenChannels.shouldShow(this.record, this.category, this.isMuted) ? $1.Show : $1.CannotShow"
            }
        },
        {
            // This is where the logic that chooses the icon is, we override it to be a locked voice channel if it's hidden
            find: ".rulesChannelId))",
            replacement: {
                match: /(\w+)\.locked(.*?)switch\((\w+)\.type\)({case \w+\.\w+\.GUILD_ANNOUNCEMENT)/g,
                replace: "Vencord.Plugins.plugins.ShowHiddenChannels.isHiddenChannel($3)||$1.locked$2switch($3._isHiddenChannel?2:$3.type)$4"
            }
        },
        {
            // inside the onMouseClick handler, we check if the channel is hidden and open the modal if it is
            find: ".handleThreadsPopoutClose();",
            replacement: {
                match: /((\w)\.handleThreadsPopoutClose\(\);)/g,
                replace: "if(Vencord.Plugins.plugins.ShowHiddenChannels.channelSelected($2?.props?.channel))return;$1"
            }
        },
        {
            // Prevent categories from disappearing when they're collapsed
            find: ".prototype.shouldShowEmptyCategory=function(){",
            replacement: {
                match: /(\.prototype\.shouldShowEmptyCategory=function\(\){)/g,
                replace: "$1return true;"
            }
        },
        {
            // Hide unreads
            find: "?\"button\":\"link\"",
            predicate: () => Settings.plugins.ShowHiddenChannels.hideUnreads === true,
            replacement: {
                match: /(\w)\.connected,(\w)=(\w\.unread),(\w=\w\.canHaveDot)/g,
                replace: "$1.connected,$2=Vencord.Plugins.plugins.ShowHiddenChannels.isHiddenChannel($1.channel)?false:$3,$4"
            }
        },
        {
            // Hide New unreads box for hidden channels
            find: '.displayName="ChannelListUnreadsStore"',
            replacement: {
                match: /((.)\.getGuildId\(\))(&&\(!\(.\.isThread.{1,100}\.hasRelevantUnread\()/,
                replace: "$1&&!$2._isHiddenChannel$3"
            }
        }
    ],
    shouldShow(channel, category, isMuted) {
        if (!this.isHiddenChannel(channel)) return false;
        if (!category) return false;
        if (channel.type === 0 && category.guild?.hideMutedChannels && isMuted) return false;

        return !category.isCollapsed;
    },
    isHiddenChannel(channel) {
        if (!channel) return false;
        if (channel.channelId)
            channel = ChannelStore.getChannel(channel.channelId);
        if (!channel || channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM())
            return false;

        // check for disallowed voice channels too so that they get hidden when collapsing the category
        channel._isHiddenChannel = !can(VIEW_CHANNEL, channel) || (channel.type === 2 && !can(CONNECT, channel));
        return channel._isHiddenChannel;
    },
    channelSelected(channel) {
        if (!channel) return false;
        const isHidden = this.isHiddenChannel(channel);
        // check for type again, otherwise it would show it for hidden stage channels
        if (channel.type === 0 && isHidden) {
            const lastMessageDate = channel.lastActiveTimestamp ? new Date(channel.lastActiveTimestamp).toLocaleString() : null;

            openModal(modalProps => (
                <ModalRoot size={ModalSize.SMALL} {...modalProps}>
                    <ModalHeader>
                        <Flex>
                            <Text variant="heading-md/bold">{channel.name}</Text>
                            {(channel.isNSFW() && (
                                <Text style={{ backgroundColor: "var(--status-danger)", borderRadius: "8px", paddingLeft: 4, paddingRight: 4 }} variant="heading-md/normal">
                                    NSFW
                                </Text>
                            ))}
                        </Flex>
                    </ModalHeader>
                    <ModalContent style={{ marginBottom: 10, marginRight: 8, marginLeft: 8 }}>
                        {(channel.topic || "").length > 0 && (
                            <>
                                <Text variant="text-md/bold" style={{ marginTop: 10 }}>
                                    Topic:
                                </Text>
                                <Text variant="code">{channel.topic}</Text>
                            </>
                        )}
                        {lastMessageDate && (
                            <>
                                <Text variant="text-md/bold" style={{ marginTop: 10 }}>
                                    Last message sent:
                                </Text>
                                <Text variant="code">{lastMessageDate}</Text>
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
        return isHidden;
    }
});
