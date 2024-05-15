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

import { addButton, removeButton } from "@api/MessagePopover";
import ErrorBoundary from "@components/ErrorBoundary";
import { copyWithToast } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, FluxDispatcher, Forms, Text, Toasts } from "@webpack/common";
import { Message } from "discord-types/general";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { EdgeIcon } from "../../plugins/betterSessions/components/icons";
import { definePluginSettings } from "@api/Settings";

const settings = definePluginSettings({
    modal: {
        type: OptionType.BOOLEAN,
        description: "Use modal to edit messages",
        default: false
    }
});

export default definePlugin({
    name: "Plural Kit Edit",
    description: "Allows easier editing of pluralkit messages",
    authors: [{ id: 553652308295155723n, name: "Scyye" }],
    settings: settings,
    start() {
        addButton("EditPluralkit", msg => {
            const handleClick = () => {
                const pk = msg.author.bot && msg.author.discriminator === "0000";
                if (pk) {
                    if (settings.store.modal)
                        openViewRawModal(msg);
                    else {
                        FluxDispatcher.dispatch({
                            type: "CREATE_PENDING_REPLY",
                            channel: ChannelStore.getChannel(msg.channel_id),
                            message: msg,
                            shouldMention: false,
                            showMentionToggle: false,
                        });
                        insertTextIntoChatInputBox("pk;edit " + msg.content)
                    }
                } else {
                    Toasts.show({
                        message: "This message was not sent by PluralKit",
                        id: Toasts.genId(),
                        type: Toasts.Type.FAILURE
                    });
                }
            };

            const handleContextMenu = e => {
                e.preventDefault();
                e.stopPropagation();
            };

            return {
                label: "Edit PluralKit",
                icon: () => {
                    return <EdgeIcon/>;
                },
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: handleClick,
                onContextMenu: handleContextMenu
            };
        });
    },
    stop() {
        removeButton("EditPluralkit");
    },
});

function openViewRawModal(msg?: Message) {
    if (!msg) return;
    const message = msg;
    var result: string = message.content;
    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.MEDIUM}>
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>EDIT MESSAGE</Text>
                    <ModalCloseButton onClick={() => closeModal(key)}/>
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "16px 0" }}>
                        {!!message.content && (
                            <>
                                <Forms.FormTitle tag="h5">Content</Forms.FormTitle>
                                <CheckedTextInput value={message.content} onChange={newValue => result = newValue}
                                                  validate={() => true}></CheckedTextInput>
                            </>
                        )}
                    </div>
                </ModalContent>
                <ModalFooter>
                    <Button onClick={() => copyWithToast(message.content, `Content copied to clipboard!`)}>
                        Copy
                    </Button>
                    <Button onClick={() => {
                        closeModal(key)
                        insertTextIntoChatInputBox("pk;edit " + getMessageLink(message) + " " + result)
                    }}>
                        Submit
                    </Button>
                </ModalFooter>
            </ModalRoot>
        </ErrorBoundary>
    ));
}

function getMessageLink(msg: Message) {
    var guildId = ChannelStore.getChannel(msg.channel_id).getGuildId();

    return `https://discord.com/channels/${guildId}/${msg.channel_id}/${msg.id}`;
}
