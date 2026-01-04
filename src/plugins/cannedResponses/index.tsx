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
import "./styles.css";

import {
    ApplicationCommandInputType,
    registerCommand,
    sendBotMessage,
    unregisterCommand
} from "@api/Commands";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import {
    closeModal,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal
} from "@utils/modal";
import definePlugin, { IconComponent } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, Forms, Menu, TextInput, TextArea, useState } from "@webpack/common";

interface CannedMessage {
    id: string;
    command: string;
    content: string;
}

const CannedResponsesMarker = Symbol("CannedResponses");

const settings = definePluginSettings({
    messages: {
        type: 6,
        default: [] as CannedMessage[]
    }
});

const cl = classNameFactory("vc-cm-");

function getCannedResponses() {
    return settings.store.messages || [];
}

function getCannedMessage(command: string) {
    return getCannedResponses().find(m => m.command === command) ?? null;
}

function createCannedCommand(msg: CannedMessage) {
    registerCommand({
        name: msg.command,
        description: `Send canned message: ${msg.command}`,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        execute: async (_, ctx) => {
            const message = getCannedMessage(msg.command);

            if (!message) {
                sendBotMessage(ctx.channel.id, {
                    content: `The canned message **${msg.command}** no longer exists. Please reload Discord.`
                });
                return { content: `/${msg.command}` };
            }

            return { content: message.content };
        },
        [CannedResponsesMarker]: true
    }, "CannedResponses");
}

function unregisterCannedCommand(command: string) {
    unregisterCommand(command);
}

function PickerModal({ rootProps, close, prefilledContent }: { rootProps: ModalProps; close(): void; prefilledContent?: string }) {
    const [messages, setMessages] = useState<CannedMessage[]>(() => {
        const existingMessages = settings.store.messages || [];
        
        if (prefilledContent) {
            return [
                ...existingMessages,
                {
                    id: Date.now().toString(),
                    command: "",
                    content: prefilledContent
                }
            ];
        }
        
        return existingMessages;
    });

    const addMessage = () => {
        setMessages([
            ...messages,
            {
                id: Date.now().toString(),
                command: "",
                content: ""
            }
        ]);
    };

    const updateMessage = (id: string, field: "command" | "content", value: string) => {
        if (field === "command") {
            value = value.replace(/\s+/g, "").toLowerCase();
        }

        setMessages(messages.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ));
    };

    const deleteMessage = (id: string) => {
        setMessages(messages.filter(m => m.id !== id));
    };

    const isCommandUnique = (command: string, currentId: string) => {
        if (!command) return true;
        return !messages.some(m => m.id !== currentId && m.command === command);
    };

    const hasValidCommands = () => {
        if (messages.length === 0) return true;
        const commands = messages.map(m => m.command).filter(Boolean);
        return commands.length === new Set(commands).size;
    };

    const saveMessages = () => {
        if (!hasValidCommands()) return;

        const oldMessages = getCannedResponses();
        const oldCommands = oldMessages.map(m => m.command);
        const newCommands = messages.map(m => m.command);

        // Unregister removed commands
        oldCommands.forEach(cmd => {
            if (!newCommands.includes(cmd)) {
                unregisterCannedCommand(cmd);
            }
        });

        // Unregister updated commands
        oldMessages.forEach(oldMsg => {
            const updated = messages.find(m => m.command === oldMsg.command);
            if (updated && updated.content !== oldMsg.content) {
                unregisterCannedCommand(oldMsg.command);
            }
        });

        settings.store.messages = messages;

        // Only register new or updated commands
        messages.forEach(msg => {
            const oldMsg = oldMessages.find(m => m.command === msg.command);
            // Register if it's new OR if it was updated (content changed)
            if (!oldMsg || oldMsg.content !== msg.content) {
                createCannedCommand(msg);
            }
        });

        close();
    };

    const exportMessages = () => {
        const blob = new Blob(
            [JSON.stringify(messages, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "canned-messages.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const importMessages = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";

        input.onchange = async e => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const imported: CannedMessage[] = JSON.parse(await file.text());
                if (!Array.isArray(imported)) {
                    alert("Invalid JSON: expected an array");
                    return;
                }

                const withIds = imported.map(m => ({
                    ...m,
                    id: Date.now().toString() + Math.random().toString(36)
                }));

                setMessages([...messages, ...withIds]);
            } catch (err) {
                alert("Failed to import: " + err);
            }
        };

        input.click();
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    Canned Messages
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                {messages.length === 0 ? (
                    <Forms.FormText>
                        No canned messages yet.
                    </Forms.FormText>
                ) : (
                    messages.map(msg => {
                        const unique = isCommandUnique(msg.command, msg.id);
                        const valid = msg.command.length > 0 && !/\s/.test(msg.command);

                        return (
                            <div key={msg.id} className={cl("message-card")}>
                                <Forms.FormTitle tag="h3" className={cl("section-title")}>
                                    Command Name
                                    {!unique && <span className={cl("error")}>(must be unique)</span>}
                                    {!valid && msg.command && <span className={cl("error")}>(no spaces)</span>}
                                </Forms.FormTitle>

                                <TextInput
                                    value={msg.command}
                                    onChange={v => updateMessage(msg.id, "command", v)}
                                    placeholder="e.g. greet, brb"
                                    error={!unique || !valid ? "Invalid command" : undefined}
                                />

                                <Forms.FormTitle
                                    tag="h3"
                                    className={cl("section-title", "section-title--spaced")}
                                >
                                    Message Content
                                </Forms.FormTitle>

                                <TextArea
                                    value={msg.content}
                                    onChange={v => updateMessage(msg.id, "content", v)}
                                    placeholder="Message text…"
                                    rows={3}
                                    className={cl("textarea")}
                                />

                                <Button
                                    color={Button.Colors.RED}
                                    size={Button.Sizes.SMALL}
                                    onClick={() => deleteMessage(msg.id)}
                                    className={cl("delete-button")}
                                >
                                    Delete
                                </Button>
                            </div>
                        );
                    })
                )}

                <Button onClick={addMessage} className={cl("add-button")}>
                    + Add Message
                </Button>
            </ModalContent>

            <ModalFooter className={cl("footer")}>
                <div className={cl("footer-group")}>
                    <Button size={Button.Sizes.SMALL} onClick={importMessages}>
                        Import
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={exportMessages}
                        disabled={messages.length === 0}
                    >
                        Export
                    </Button>
                </div>

                <Button onClick={saveMessages} disabled={!hasValidCommands()}>
                    Save & Close
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

const CannedResponsesIcon: IconComponent = ({ width = 20, height = 20, className }) => (
    <svg
        width={width}
        height={height}
        viewBox="0 0 256 256"
        className={className}
        aria-hidden="true"
    >
        <path
            fill="currentColor"
            d="M102.9 10.7c-5.6 2.8-4.6 12.3 2.6 24.4l2.8 4.7 6.1.8c3.4.5 6.2.9 6.2.9s-1.2 1.6-2.6 3.5c-1.4 1.9-2.6 3.7-2.6 3.9 0 .5 6.2 7.8 11.8 14l4.1 4.5-8.6.3c-29.7 1-53.1 10-59.4 22.8L62 93.2v127.5l1.3 2.5c6.3 12.3 27.7 21 55.3 22.6 20.1 1.1 40.1-2.2 54.3-9.1 8.7-4.3 14.1-9.1 16.3-14.8.8-2.3.9-4.3.9-60.1V104l1.2-.8c2.6-1.7 3.3-7 1.6-12.7-3.6-11.7-16.7-29.3-35.7-47.9C142.8 28.5 130.6 19 120.4 14c-3.3-1.7-7.1-3.2-8.3-3.5-3.2-.8-7.5-.6-9.2.2zm11.5 9.1"
        />
    </svg>
);

const CannedResponsesButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    if (!isAnyChat) return null;

    return (
        <ChatBarButton
            tooltip="Canned Messages"
            onClick={() => {
                const key = openModal(props => (
                    <PickerModal
                        rootProps={props}
                        close={() => closeModal(key)}
                    />
                ));
            }}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <CannedResponsesIcon />
        </ChatBarButton>
    );
};

function getMessageContent(message: Message) {
    return message.content
        || message.messageSnapshots?.[0]?.message.content
        || message.embeds?.find(embed => embed.type === "auto_moderation_message")?.rawDescription || "";
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const content = getMessageContent(message);
    if (!content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-save-canned"
            label="Save as Canned Message"
            icon={CannedResponsesIcon}
            action={() => {
                const key = openModal(props => (
                    <PickerModal
                        rootProps={props}
                        close={() => closeModal(key)}
                        prefilledContent={content}
                    />
                ));
            }}
        />
    ));
};

/* 
 * Ahem lets begin some attributions
 * This code was inspired in part by "sendTimestamps" for their Modal stuff.

*/

export default definePlugin({
    name: "CannedResponses",
    description: "Quickly send pre-written messages",
    authors: [Devs.abb3v],
    settings,

    start() {
        getCannedResponses().forEach(createCannedCommand);
    },

    stop() {
        getCannedResponses().forEach(m => unregisterCannedCommand(m.command));
    },

    contextMenus: {
        "message": messageCtxPatch
    },

    chatBarButton: {
        icon: CannedResponsesIcon,
        render: CannedResponsesButton
    }
});