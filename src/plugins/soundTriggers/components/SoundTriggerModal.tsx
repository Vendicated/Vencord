/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Button, Card, Forms, Text, TextInput, useState } from "@webpack/common";

import { classFactory, EMPTY_TRIGGER, SoundTrigger } from "..";
import { EmojiTextInput, formatEmojiTextInput } from "./EmojiTextInput";
import { NoTriggers } from "./NoTriggers";

export type SoundTriggerModalMode = "create" | "edit";

interface OpenTriggerModalOptions {
    mode: SoundTriggerModalMode;
    onSubmit(trigger: SoundTrigger): void;
    data?: SoundTrigger;
}

export const openTriggerModal = (opts: OpenTriggerModalOptions) => (
    openModal(modalProps => (
        <SoundTriggerModal
            {...modalProps}
            mode={opts.mode}
            data={opts.data}
            onSubmit={opts.onSubmit}
        />
    ))
);

interface SoundTriggerModalProps extends ModalProps {
    mode: SoundTriggerModalMode;
    onSubmit(trigger: SoundTrigger): void;
    data?: SoundTrigger;
}

export function SoundTriggerModal(props: SoundTriggerModalProps) {
    const [trigger, setTrigger] = useState(props.data ?? EMPTY_TRIGGER);
    const [emojiTextInput, setEmojiTextInput] = useState("");

    const handleSubmit = () => {
        const formatted = formatEmojiTextInput(emojiTextInput);
        if (formatted === "" || trigger.patterns.includes(formatted)) {
            return;
        }
        setTrigger({ ...trigger, patterns: [...trigger.patterns, formatted] });
        setEmojiTextInput("");
    };

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">{props.mode} Sound Trigger</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Flex flexDirection="row" style={{ alignItems: "center" }}>
                    <EmojiTextInput
                        value={emojiTextInput}
                        onChange={setEmojiTextInput}
                        onSubmit={() => handleSubmit()} />
                    <Button onClick={() => handleSubmit()}>
                        Add
                    </Button>
                </Flex>
                {trigger.patterns.length > 0
                    ? (
                        <Card className={classFactory("modal-body-text-card")}>
                            {trigger.patterns.map(t => (
                                <Flex flexDirection="row" className={classFactory("modal-body-text-entry")}>
                                    <Text style={{ overflowWrap: "anywhere" }}>{t}</Text>
                                    <Button
                                        color={Button.Colors.RED}
                                        size={Button.Sizes.SMALL}
                                        onClick={() => setTrigger({ ...trigger, patterns: trigger.patterns.filter(ft => t !== ft) })}
                                    >
                                        <DeleteIcon width={16} height={16} />
                                    </Button>
                                </Flex>
                            ))}
                        </Card>
                    )
                    : <NoTriggers text="No text patterns defined." />}
                <TextInput
                    type="text"
                    style={{ marginTop: "10px", marginBottom: "10px" }}
                    value={trigger.sound}
                    placeholder="Sound URL"
                    onChange={v => setTrigger({ ...trigger, sound: v })}
                />
            </ModalContent>

            <ModalFooter className={classFactory("modal-footer")}>
                <Button
                    disabled={trigger.patterns.length === 0 || trigger.sound === ""}
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        props.onSubmit(trigger);
                        props.onClose();
                    }}>
                    {props.mode === "create" ? "Create" : "Save"}
                </Button>
                <Button look={Button.Looks.OUTLINED} onClick={props.onClose}>
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
