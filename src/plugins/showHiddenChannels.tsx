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
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "../utils/modal";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { waitFor } from "../webpack";
import { Button, ChannelStore, Text } from "../webpack/common";

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
        }
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
                replace: "renderLevel:$1.Show"
            }
        },
        {
            // This is where the logic that chooses the icon is, we overide it to be a locked voice channel if it's hidden
            find: ".rulesChannelId))",
            replacement: {
                match: /(\w+)\.locked(.*?)switch\((\w+)\.type\)({case \w+\.\w+\.GUILD_ANNOUNCEMENT)/g,
                replace: "Vencord.Plugins.plugins.ShowHiddenChannels.isHiddenChannel($3)||$1.locked$2switch($3._isHiddenChannel?2:$3.type)$4"
            }
        },
        {
            // I can't find the right onClick to patch
            find: "selectChannel:function",
            replacement: [
                {
                    match: /selectChannel:function\((\w)\){/g,
                    replace: "selectChannel:function($1){if(Vencord.Plugins.plugins.ShowHiddenChannels.channelSelected($1)) return;"
                }
            ]
        },
        {
            // Prevents Discord from trying to fetch message and create a 403 error
            find: "fetchMessages:function",
            replacement: {
                match: /fetchMessages:function\((\w)\){/g,
                replace: "fetchMessages:function($1){if(Vencord.Plugins.plugins.ShowHiddenChannels.isHiddenChannel($1)) return;"
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
        }
    ],
    isHiddenChannel(channel) {
        if (!channel) return false;
        if (channel.channelId)
            channel = ChannelStore.getChannel(channel.channelId);
        if (channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM())
            return false;

        channel._isHiddenChannel = !can(VIEW_CHANNEL, channel);
        return channel._isHiddenChannel;
    },
    channelSelected(channelData) {
        const channel = ChannelStore.getChannel(channelData.channelId);

        const isHidden = this.isHiddenChannel(channel);
        if (isHidden)
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
                    <ModalContent style={{ marginBottom: 10, marginTop: 10, marginRight: 8, marginLeft: 8 }}>
                        <Text variant="text-md/normal">You don't have the permission to view the messages in this channel.</Text>
                        {(channel.topic || "").length > 0 && (
                            <>
                                <Text variant="text-md/bold" style={{ marginTop: 10 }}>
                                    Topic:
                                </Text>
                                <Text variant="code">{channel.topic}</Text>
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
                                Continue
                            </Button>
                        </Flex>
                    </ModalFooter>
                </ModalRoot>
            ));
        return isHidden;
    }
});
