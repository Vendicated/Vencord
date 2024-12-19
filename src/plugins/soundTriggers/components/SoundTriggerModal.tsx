/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Button, Card, Forms, Slider, Switch, Text, TextInput, useEffect, useState } from "@webpack/common";

import { classFactory, EMPTY_TRIGGER, settings, SoundTrigger } from "..";
import { failToast, successToast, triggersAreUnique, triggersEqual, validateAndFormatTrigger } from "../util";
import { EmojiTextInput } from "./EmojiTextInput";
import { EmptyState } from "./EmptyState";

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
    const initialTrigger = props.data ?? EMPTY_TRIGGER;
    const [trigger, setTrigger] = useState(initialTrigger);
    const [dirty, setDirty] = useState(false);
    const [emojiTextInput, setEmojiTextInput] = useState("");

    useEffect(() => {
        const validationResult = validateAndFormatTrigger(trigger);
        if (validationResult.error) {
            return;
        }
        setDirty(!triggersEqual(initialTrigger, validationResult.formattedTrigger));
    }, [trigger]);

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">{props.mode} Sound Trigger</Forms.FormTitle>
            </ModalHeader>

            <ModalContent className={classFactory("modal-content")}>
                <Flex flexDirection="column" style={{ gap: "10px" }}>
                    <div>
                        <Forms.FormTitle tag="h5">Patterns</Forms.FormTitle>
                        <EmojiTextInput
                            value={emojiTextInput}
                            onChange={setEmojiTextInput}
                            onSubmit={() => {
                                setTrigger({ ...trigger, patterns: [...trigger.patterns, emojiTextInput] });
                                setEmojiTextInput("");
                            }}
                        />
                    </div>
                    {trigger.patterns.length > 0
                        ? (<Card className={classFactory("modal-body-text-card")}>
                            {trigger.patterns.map((t, i) => (
                                <Flex flexDirection="row" className={classFactory("modal-body-text-entry")}>
                                    <Text style={{ overflowWrap: "anywhere" }}>{t}</Text>
                                    <Button
                                        color={Button.Colors.RED}
                                        size={Button.Sizes.SMALL}
                                        onClick={() => setTrigger({ ...trigger, patterns: trigger.patterns.filter((_, idx) => i !== idx) })}
                                    >
                                        <DeleteIcon width={16} height={16} />
                                    </Button>
                                </Flex>
                            ))}
                        </Card>)
                        : <EmptyState text="No text patterns defined." />}
                    <Switch
                        value={trigger.caseSensitive}
                        onChange={() => setTrigger({ ...trigger, caseSensitive: !trigger.caseSensitive })}
                    >
                        Case Sensitive
                    </Switch>
                    <div>
                        <Forms.FormTitle tag="h5">Sound URL</Forms.FormTitle>
                        <TextInput
                            type="text"
                            placeholder="Enter URL"
                            label="URL"
                            width={"100%"}
                            value={trigger.sound}
                            onChange={v => setTrigger({ ...trigger, sound: v })}
                            style={{ margin: 0 }}
                        />
                    </div>
                    <div>
                        <Forms.FormTitle tag="h5">Volume</Forms.FormTitle>
                        <Slider
                            minValue={0}
                            maxValue={1}
                            onValueRender={v => `${Math.round(v * 100)}%`}
                            initialValue={trigger.volume}
                            onValueChange={v => setTrigger({ ...trigger, volume: v })}
                        />
                    </div>
                </Flex>

            </ModalContent>

            <ModalFooter className={classFactory("modal-footer")}>
                <Button
                    disabled={trigger.patterns.length === 0 || trigger.sound.trim() === ""}
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        const validationResult = validateAndFormatTrigger(trigger);
                        if (validationResult.error) {
                            failToast(validationResult.message);
                            return;
                        }
                        if (dirty && !triggersAreUnique([...settings.store.soundTriggers, trigger])) {
                            failToast("Duplicate sound trigger.");
                            return;
                        }
                        props.onSubmit(validationResult.formattedTrigger);

                        successToast(
                            props.mode === "create"
                                ? "Created new sound trigger."
                                : "Sound trigger saved."
                        );

                        props.onClose();
                    }}>
                    {props.mode === "create" ? "Create" : "Save"}
                </Button>
                <Button look={Button.Looks.OUTLINED} onClick={props.onClose}>
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot >
    );
}
