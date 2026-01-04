/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    findOption,
    registerCommand,
    sendBotMessage,
    unregisterCommand
} from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Heading, HeadingSecondary } from "@components/Heading";
import { DeleteIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
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
import { Menu, TextArea, TextInput, useState } from "@webpack/common";

interface Tag {
    id: string;
    command: string;
    content: string;
}

const settings = definePluginSettings({
    messages: {
        type: 6,
        default: [] as Tag[]
    }
});

const cl = classNameFactory("vc-cm-");
const EMOTE = "<:luna:1035316192220553236>";
const MessageTagsMarker = Symbol("MessageTags");

function getTags() {
    return settings.store.messages || [];
}

function getTag(name: string) {
    return getTags().find(m => m.command === name) ?? null;
}

function deleteTag(id: string) {
    const tag = getTags().find(m => m.id === id);
    if (tag) {
        unregisterCommand(tag.command);
        settings.store.messages = getTags().filter(m => m.id !== id);
    }
}

function createTagCommand(msg: Tag) {
    unregisterCommand(msg.command);
    registerCommand({
        name: msg.command,
        description: `Send tag: ${msg.command}`,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        execute: async (_, ctx) => {
            const message = getTag(msg.command);

            if (!message) {
                sendBotMessage(ctx.channel.id, {
                    content: `${EMOTE} The tag **${msg.command}** no longer exists.`
                });
                return { content: `/${msg.command}` };
            }

            return { content: message.content };
        },
        [MessageTagsMarker]: true
    }, "MessageTags");
}

function unregisterTagCommand(command: string) {
    unregisterCommand(command);
}

function Accordion({
    title,
    children,
    defaultExpanded = false,
    onDelete,
    error
}: {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    onDelete?: () => void;
    error?: string;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={cl("accordion", error && "accordion-error")}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={cl("accordion-header")} onClick={() => setIsExpanded(!isExpanded)}>
                <div className={cl("accordion-title-wrapper")}>
                    <svg
                        className={cl("accordion-chevron", isExpanded && "accordion-chevron-expanded")}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                    >
                        <path fill="currentColor" d="M9.29 15.88L13.17 12 9.29 8.12a.996.996 0 1 1 1.41-1.41l4.59 4.59c.39.39.39 1.02 0 1.41L10.7 17.3a.996.996 0 0 1-1.41 0c-.38-.39-.39-1.03 0-1.42z" />
                    </svg>
                    <span className={cl("accordion-title")}>
                        {title}
                        {error && <span className={cl("error")}> ({error})</span>}
                    </span>
                </div>
                {onDelete && isHovered && (
                    <button
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className={cl("accordion-delete-button")}
                        aria-label="Delete"
                    >
                        <DeleteIcon width="18" height="18" />
                    </button>
                )}
            </div>
            {isExpanded && (
                <div className={cl("accordion-content")}>
                    {children}
                </div>
            )}
        </div>
    );
}

function PickerModal({ rootProps, close, prefilledContent }: { rootProps: ModalProps; close(): void; prefilledContent?: string; }) {
    const [messages, setMessages] = useState<Tag[]>(() => {
        // There's this consistent error "An object could not be cloned" when saving back?
        // Not sure if this is the fix or if I'm just being dumb, but making a deep copy seems to work
        // see the numbered comments below.

        const existingMessages = settings.store.messages
            ? JSON.parse(JSON.stringify(settings.store.messages))
            : [];

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

        const oldMessages = getTags();
        const oldCommands = oldMessages.map(m => m.command);
        const newCommands = messages.map(m => m.command);

        // 1. Unregister removed commands
        oldCommands.forEach(cmd => {
            if (!newCommands.includes(cmd)) {
                unregisterTagCommand(cmd);
            }
        });

        // 2. Unregister updated commands
        oldMessages.forEach(oldMsg => {
            const updated = messages.find(m => m.id === oldMsg.id);
            if (updated && updated.command !== oldMsg.command) {
                unregisterTagCommand(oldMsg.command);
            }
        });

        // 3. Update storage (Clean copy to be safe)
        settings.store.messages = JSON.parse(JSON.stringify(messages));

        messages.forEach(msg => {
            if (msg.command) createTagCommand(msg);
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
        a.download = "message-tags.json";
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
                const imported: Tag[] = JSON.parse(await file.text());
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
                <Heading tag="h2" className={cl("modal-title")}>
                    Message Tags
                </Heading>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                {messages.length === 0 ? (
                    <Paragraph>
                        No tags yet.
                    </Paragraph>
                ) : (
                    messages.map(msg => {
                        const unique = isCommandUnique(msg.command, msg.id);
                        const valid = msg.command.length > 0 && !/\s/.test(msg.command);

                        let errorText = "";
                        if (!unique) errorText = "must be unique";
                        else if (!valid && msg.command) errorText = "no spaces";

                        const isNew = !msg.command || !msg.content;

                        return (
                            <Accordion
                                key={msg.id}
                                title={msg.command || "New Tag"}
                                defaultExpanded={isNew}
                                onDelete={() => deleteMessage(msg.id)}
                                error={errorText}
                            >
                                <HeadingSecondary className={cl("section-title")}>
                                    Tag Name
                                </HeadingSecondary>

                                <TextInput
                                    value={msg.command}
                                    onChange={v => updateMessage(msg.id, "command", v)}
                                    placeholder="e.g. greet, brb"
                                    error={!unique || !valid ? "Invalid tag name" : undefined}
                                />

                                <HeadingSecondary className={cl("section-title", "section-title--spaced")}>
                                    Message Content
                                </HeadingSecondary>

                                <TextArea
                                    value={msg.content}
                                    onChange={v => updateMessage(msg.id, "content", v)}
                                    placeholder="Type your message..."
                                    rows={3}
                                    className={cl("textarea")}
                                />
                            </Accordion>
                        );
                    })
                )}

                <Button onClick={addMessage} className={cl("add-button")}>
                    + Add Tag
                </Button>
            </ModalContent>

            <ModalFooter className={cl("footer")}>
                <div className={cl("footer-group")}>
                    <Button variant="secondary" size="small" onClick={importMessages}>
                        Import
                    </Button>
                    <Button
                        variant="secondary"
                        size="small"
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

const MessageTagsIcon: IconComponent = ({ width = 20, height = 20, className }) => (
    <svg
        width={width}
        height={height}
        viewBox="0 0 20 20"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M5.02 6.227a1.038 1.038 0 0 1-1.043-1.032c0-.569.467-1.03 1.043-1.03.576 0 1.043.461 1.043 1.03 0 .57-.467 1.032-1.043 1.032m14.369 4.42-3.455-3.414C10.06 1.429 11.435 2.819 9.158.419 8.962.225 8.697 0 8.42 0H2.085C.934 0 0 1.157 0 2.295v6.26c0 .274.11.536.305.73 4.091 4.042 1.145 1.13 10.232 10.111a2.104 2.104 0 0 0 2.95 0l5.902-5.833a2.045 2.045 0 0 0 0-2.915"
            fill="currentColor"
            fillRule="evenodd"
        />
    </svg>
);

const MessageTagsButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    if (!isAnyChat) return null;

    return (
        <ChatBarButton
            tooltip="Message Tags"
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
            <MessageTagsIcon />
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
            id="vc-save-tag"
            label="Save as Tag"
            icon={MessageTagsIcon}
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

export default definePlugin({
    name: "MessageTags",
    description: "Allows you to save messages and to use them with a simple command or UI.",
    authors: [Devs.Luna, Devs.abb3v],
    settings,

    start() {
        getTags().forEach(createTagCommand);
    },

    stop() {
        getTags().forEach(m => unregisterTagCommand(m.command));
    },

    contextMenus: {
        "message": messageCtxPatch
    },

    chatBarButton: {
        icon: MessageTagsIcon,
        render: MessageTagsButton
    },

    commands: [
        {
            name: "tags",
            description: "Manage your message tags",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "list",
                    description: "List all your tags",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                },
                {
                    name: "delete",
                    description: "Remove a tag",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "tag-name",
                            description: "The name of the tag to delete",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                },
                {
                    name: "preview",
                    description: "Preview a tag without sending it publicly",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "tag-name",
                            description: "The name of the tag to preview",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                }
            ],

            async execute(args, ctx) {
                switch (args[0].name) {
                    case "list": {
                        const tags = getTags();
                        sendBotMessage(ctx.channel.id, {
                            embeds: [
                                {
                                    title: "All Tags:",
                                    description: tags.length > 0
                                        ? tags.map(tag => `\`${tag.command}\`: ${tag.content.slice(0, 72).replaceAll("\\n", " ")}${tag.content.length > 72 ? "..." : ""}`).join("\n")
                                        : `${EMOTE} Woops! There are no tags yet, click the chat bar button to create one!`,
                                    // @ts-expect-error
                                    color: 0xd77f7f,
                                    type: "rich",
                                }
                            ]
                        });
                        break;
                    }
                    case "delete": {
                        const name: string = findOption(args[0].options, "tag-name", "");
                        const tag = getTag(name);

                        if (!tag)
                            return sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                            });

                        deleteTag(tag.id);

                        sendBotMessage(ctx.channel.id, {
                            content: `${EMOTE} Successfully deleted the tag **${name}**!`
                        });
                        break;
                    }
                    case "preview": {
                        const name: string = findOption(args[0].options, "tag-name", "");
                        const tag = getTag(name);

                        if (!tag)
                            return sendBotMessage(ctx.channel.id, {
                                content: `${EMOTE} A Tag with the name **${name}** does not exist!`
                            });

                        sendBotMessage(ctx.channel.id, {
                            content: tag.content.replaceAll("\\n", "\n")
                        });
                        break;
                    }

                    default: {
                        sendBotMessage(ctx.channel.id, {
                            content: "Invalid sub-command"
                        });
                        break;
                    }
                }
            }
        }
    ]
});
