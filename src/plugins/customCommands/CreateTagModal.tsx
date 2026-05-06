/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { InlineCode } from "@components/CodeBlock";
import { ExpandableSection } from "@components/ExpandableCard";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { InfoIcon } from "@components/Icons";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { TextArea, TextInput, useState } from "@webpack/common";

import { parseTagArguments } from ".";
import { addTag, getTag, Tag } from "./settings";

export function openCreateTagModal(initialValue: Tag = { name: "", message: "" }) {
    openModal(modalProps => (
        <Modal initialValue={initialValue} modalProps={modalProps} />
    ));
}

const EXAMPLE_RESPONSE = "Hello {{user}}! I am feeling {{mood = great}}.";

function Modal({ initialValue, modalProps }: { initialValue: Tag; modalProps: ModalProps; }) {
    const [name, setName] = useState(initialValue.name);
    const [message, setMessage] = useState(initialValue.message.replaceAll("\\n", "\n"));

    const detectedArguments = parseTagArguments(message);
    const hasReservedEphemeral = detectedArguments.some(arg => arg.name === "ephemeral");
    const nameAlreadyExists = name !== initialValue.name && getTag(name);

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <BaseText size="lg" weight="semibold" style={{ flexGrow: 1 }}>Create Tag</BaseText>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent>
                <Flex flexDirection="column" gap={12}>
                    <Paragraph>Create a new tag which will be registered as a slash command.</Paragraph>

                    <section className={Margins.top8}>
                        <HeadingSecondary>Name</HeadingSecondary>
                        <TextInput value={name} onChange={setName} placeholder="greet" />
                    </section>

                    <section>
                        <HeadingSecondary>Response</HeadingSecondary>
                        <TextArea value={message} onChange={setMessage} placeholder={EXAMPLE_RESPONSE} />
                    </section>

                    {detectedArguments.length > 0 && (
                        <section>
                            <HeadingSecondary>Detected Arguments</HeadingSecondary>
                            <Paragraph>
                                <ul>
                                    {detectedArguments.map(arg => (
                                        <li key={arg.name}>
                                            &mdash; <b>{arg.name}</b>{arg.defaultValue ? ` (default: ${arg.defaultValue})` : ""}
                                        </li>
                                    ))}
                                </ul>
                            </Paragraph>
                        </section>
                    )}

                    <ExpandableSection
                        renderContent={() => (
                            <Flex flexDirection="column" gap={12}>
                                <Paragraph>
                                    Your response can include variables wrapped in double curly braces which will become command arguments, for example <InlineCode>{"Hello {{user}}"}</InlineCode>.
                                </Paragraph>
                                <Paragraph>
                                    You can specify arguments with default values by using an equals sign, for example <InlineCode>{"Hello {{user = pal}}"}</InlineCode>.
                                </Paragraph>

                                <section>
                                    <Paragraph><b>Example Command response:</b> <InlineCode>{EXAMPLE_RESPONSE}</InlineCode></Paragraph>
                                    <Paragraph><b>Example usage:</b> <InlineCode>{"/greet user:@Clyde"}</InlineCode></Paragraph>
                                    <Paragraph><b>Example output:</b> <InlineCode>{"Hello @Clyde! I am feeling great."}</InlineCode></Paragraph>
                                </section>
                            </Flex>
                        )}
                    >
                        <Flex alignItems="center" gap={8}>
                            <InfoIcon color="var(--text-muted)" height={16} width={16} />
                            View Arguments guide
                        </Flex>
                    </ExpandableSection>
                    {hasReservedEphemeral &&
                        <Card variant="danger" className={Margins.top8} defaultPadding>
                            <Paragraph>The argument name "ephemeral" is reserved and cannot be used.</Paragraph>
                        </Card>
                    }
                    {nameAlreadyExists &&
                        <Card variant="warning" className={Margins.top8} defaultPadding>
                            <Paragraph>A tag with the name <InlineCode>{name}</InlineCode> already exists and will be overwritten.</Paragraph>
                        </Card>
                    }
                </Flex>
            </ModalContent>

            <ModalFooter>
                <Flex>
                    <Button
                        variant="secondary"
                        onClick={modalProps.onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            const tag = { name, message };
                            addTag(tag);
                            modalProps.onClose();
                        }}
                        disabled={!name || !message || hasReservedEphemeral}
                    >
                        Create
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}
