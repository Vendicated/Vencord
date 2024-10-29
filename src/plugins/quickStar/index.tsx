/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { addButton, removeButton } from "@api/MessagePopover";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { closeModal, Modals, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, Flex, Forms, Menu, PermissionsBits, PermissionStore, UserStore } from "@webpack/common";
import { Guild, ReactionEmoji } from "discord-types/general";

const EmojiPicker = findComponentByCodeLazy(".useEmojiSelectHandler)");

const ReactionManager = findByPropsLazy("addReaction", "getReactors");

function StarIcon() {
    return <svg viewBox="0 0 36 36" fill="currentColor" aria-hidden="true" width="20" height="20">
        <path d="M27.287 34.627c-.404 0-.806-.124-1.152-.371L18 28.422l-8.135 5.834c-.693.496-1.623.496-2.312-.008-.689-.499-.979-1.385-.721-2.194l3.034-9.792-8.062-5.681c-.685-.505-.97-1.393-.708-2.203.264-.808 1.016-1.357 1.866-1.363L12.947 13l3.179-9.549c.268-.809 1.023-1.353 1.874-1.353.851 0 1.606.545 1.875 1.353L23 13l10.036.015c.853.006 1.606.556 1.867 1.363.263.81-.022 1.698-.708 2.203l-8.062 5.681 3.034 9.792c.26.809-.033 1.695-.72 2.194-.347.254-.753.379-1.16.379z" />
    </svg>;
}

async function emojiForServer(serverId: string) {
    const defaultEmoji: ReactionEmoji = {
        id: undefined,
        name: "⭐",
        animated: false
    };

    // serverId will be null in non-server places (dms)
    if (serverId === null)
        return defaultEmoji;

    const emojis = await DataStore.get("QuickStar-emojis");

    if (emojis === undefined) {
        await DataStore.set("QuickStar-emojis", { [serverId]: defaultEmoji });
        return defaultEmoji;
    }

    if (emojis[serverId])
        return emojis[serverId];

    emojis[serverId] = defaultEmoji;
    await DataStore.set("QuickStar-emojis", emojis);
    return defaultEmoji;
}

const serverContextPatch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    if (!guild) return;

    children.push(
        <Menu.MenuItem
            label="Change Quick Star"
            id="vc-qs-change"
            icon={StarIcon}
            action={() => {
                const modalKey = openModal(props =>
                    <ErrorBoundary>
                        <Modals.ModalRoot size={ModalSize.MEDIUM} {...props}>
                            <Modals.ModalHeader>
                                <Forms.FormTitle tag="h2" style={{ marginBottom: "auto", marginTop: "auto" }}>
                                    Change Quick Star for {guild.name}
                                </Forms.FormTitle>
                                <Modals.ModalCloseButton onClick={() => closeModal(modalKey)} />
                            </Modals.ModalHeader>
                            <Modals.ModalContent>
                                <Flex style={{ width: "100%", justifyContent: "center", padding: "1em" }}>
                                    <EmojiPicker
                                        pickerIntention="REACTION"
                                        guildId={guild.id}
                                        onSelectEmoji={async (emoji, isFinalSelection, isBurst) => {
                                            if (emoji == null) return;

                                            const reactionEmoji: ReactionEmoji = {
                                                id: emoji.id,
                                                name: emoji.id ? emoji.name : emoji.optionallyDiverseSequence,
                                                animated: emoji.animated ?? false
                                            };

                                            await DataStore.update("QuickStar-emojis", emojis => {
                                                return Object.assign({}, emojis, { [guild.id]: reactionEmoji });
                                            });
                                            closeModal(modalKey);
                                        }}
                                    />
                                </Flex>
                            </Modals.ModalContent>
                        </Modals.ModalRoot>
                    </ErrorBoundary>
                );
            }}
        />
    );
};

export default definePlugin({
    name: "Quick Star",
    description: "Quickly add a \"star\" to any message, for use with starboards. The specific \"star\" emoji can be configured per-server (right click), the default is the regular star emoji (⭐).",
    authors: [Devs.williamist],

    dependencies: ["MessagePopoverAPI", "ContextMenuAPI"],

    contextMenus: {
        "guild-header-popout": serverContextPatch,
        "guild-context": serverContextPatch
    },

    async start() {
        addButton("QuickStar", message => {
            // shouldn't be able to star our own messages
            if (message.author.id === UserStore.getCurrentUser().id)
                return null;

            const channel = ChannelStore.getChannel(message.channel_id);

            // can't react without perms
            if (!channel.isDM() && !PermissionStore.can(PermissionsBits.ADD_REACTIONS, channel)) {
                return null;
            }

            return {
                label: "Quick Star",
                message: message,
                channel: channel,
                icon: StarIcon,
                onClick: async () => {
                    ReactionManager.addReaction(
                        message.channel_id,
                        message.id,
                        await emojiForServer(channel.guild_id)
                    );
                }
            };
        });
    },

    stop() {
        removeButton("QuickStar");
    }
});
