/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Flex } from "@components/Flex";
import { CogWheel, DeleteIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import { Button, Card, Text, useState } from "@webpack/common";

import { classFactory, DEFAULT_TRIGGERS, settings, SoundTrigger } from "..";
import { ConfirmationModal } from "./ConfirmationModal";
import { NoTriggers } from "./NoTriggers";
import { openTriggerModal } from "./SoundTriggerModal";

const updateSettings = (newTriggers: SoundTrigger[]) => {
    settings.store.soundTriggers = newTriggers;
};

interface SoundTriggerEntryProps {
    index: number;
    entry: SoundTrigger;
    onDelete(index: number): void;
}

function SoundTriggerEntry(props: SoundTriggerEntryProps) {
    const {
        entry: { patterns, sound },
        index,
    } = props;

    return (
        <Card style={{ padding: "10px" }}>
            <Flex flexDirection="row" className={classFactory("trigger-entry")}>
                <Flex flexDirection="column" style={{ gap: "6px" }}>
                    <Text><b>Patterns: </b>{patterns.join(", ")}</Text>
                    <Text><b>Sound URL: </b>{sound}</Text>
                </Flex>
                <Flex flexDirection="row">
                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={() => openTriggerModal({
                            mode: "edit",
                            onSubmit(trigger) {
                                settings.store.soundTriggers[index] = trigger;
                            },
                            data: { patterns, sound }
                        })}
                    >
                        <CogWheel width={16} height={16} />
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                        onClick={() => {
                            openModal(modalProps =>
                                <ConfirmationModal
                                    {...modalProps}
                                    message="Are you sure you want to delete this trigger?"
                                    onConfirm={() => props.onDelete(index)}
                                />
                            );
                        }}
                    >
                        <DeleteIcon width={16} height={16} />
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}

export function SoundTriggerSettings() {
    const [triggers, setTriggers] = useState<SoundTrigger[]>(settings.store.soundTriggers ?? DEFAULT_TRIGGERS);
    console.log(settings.store.soundTriggers.length);
    return (
        <Flex flexDirection="column">
            {triggers.length > 0
                ? triggers.map((sound, i) => (
                    <SoundTriggerEntry
                        key={i}
                        index={i}
                        entry={sound}
                        onDelete={i => {
                            const newTriggers = triggers.filter((_, idx) => idx !== i);
                            setTriggers(newTriggers);
                            updateSettings(newTriggers);
                        }}
                    />
                ))
                : <NoTriggers />
            }
            <Button
                onClick={() => openTriggerModal({
                    mode: "create",
                    onSubmit(trigger) {
                        settings.store.soundTriggers.push(trigger);
                    }
                })}
            >
                Create Sound Trigger
            </Button>
        </Flex>
    );
}
