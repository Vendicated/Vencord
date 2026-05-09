/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { InlineCode } from "@components/CodeBlock";
import { ExpandableSection } from "@components/ExpandableCard";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { InfoIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal,openModal, TextArea, TextInput, useState } from "@webpack/common";

import { parseTagArguments } from ".";
import { addTag, getTag, Tag } from "./settings";

export function openCreateTagModal(initialValue: Tag = { name: "", message: "" }) {
    openModal(modalProps => (
        <CreateTagDialog initialValue={initialValue} modalProps={modalProps} />
    ));
}

const EXAMPLE_RESPONSE = "Hello {{user}}! I am feeling {{mood = great}}.";

function CreateTagDialog({ initialValue, modalProps }: { initialValue: Tag; modalProps: RenderModalProps; }) {
    const [name, setName] = useState(initialValue.name);
    const [message, setMessage] = useState(initialValue.message.replaceAll("\\n", "\n"));

    const isEdit = Boolean(initialValue.name);

    const detectedArguments = parseTagArguments(message);
    const hasReservedEphemeral = detectedArguments.some(arg => arg.name === "ephemeral");
    const nameAlreadyExists = name !== initialValue.name && getTag(name);

    const notice = hasReservedEphemeral
        ? 'The argument name "ephemeral" is reserved and cannot be used.'
        : nameAlreadyExists
            ? `A tag with the name "${name}" already exists and will be overwritten.`
            : undefined;

    return (
        <Modal
            {...modalProps}
            title={isEdit ? "Edit Tag" : "Create New Tag"}
            subtitle={isEdit ? "Edit your custom command." : "Create a new tag which will be registered as a slash command."}
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose
                },
                {
                    text: isEdit ? "Save" : "Create",
                    variant: "primary",
                    onClick: () => {
                        const tag = { name, message };
                        addTag(tag);
                        modalProps.onClose();
                    },
                    disabled: !name || !message || hasReservedEphemeral
                }
            ]}
            notice={notice ? { message: notice, type: "critical" } : undefined}
        >
            <Flex flexDirection="column" gap={12}>
                <section>
                    <HeadingSecondary>Name</HeadingSecondary>
                    <TextInput value={name} onChange={setName} placeholder="greet" />
                </section>

                <section>
                    <HeadingSecondary>Response</HeadingSecondary>
                    <TextArea value={message} onChange={setMessage} placeholder={EXAMPLE_RESPONSE} autosize />
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
            </Flex>
        </Modal>
    );
}
