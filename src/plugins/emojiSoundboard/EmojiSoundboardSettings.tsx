/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./components/styles.css";

import { Flex } from "@components/Flex";
import { openModal } from "@utils/modal";
import { Button, TextInput, useState } from "@webpack/common";
import { DEFAULT_SOUNDS, EmojiSound, classFactory, settings } from ".";
import { EmojiModal, EmojiModalMode } from "./components/EmojiModal";
import { NoEmojiSounds } from "./components/NoEmojiSounds";
import { LazyComponent } from "@utils/react";
import { find } from "@webpack";
import { CogWheel, DeleteIcon } from "@components/Icons";


interface EmojiSoundboardEntryProps {
    index: number;
    entry: EmojiSound;
}

const InputComponent = LazyComponent(() => find(m => m?.id?.includes("delete")));

const openEmojiModal = (mode: EmojiModalMode, onsubmit: (emoji: string, soundUrl: string, caseSensitive: boolean) => void) => (
    openModal(modalProps => (
        <EmojiModal
            {...modalProps}
            mode={mode}
            onSubmit={onsubmit}
        />
    ))
);

function EmojiSoundboardEntry(props: EmojiSoundboardEntryProps) {
    const {
        entry: { emoji, sound, caseSensitive },
        index,
    } = props;

    return (
        <Flex flexDirection="row" className={classFactory("fields-row")}>
            <TextInput
                type="text"
                value={emoji}
                placeholder="Emoji"
            />
            <TextInput
                type="text"
                value={sound}
                placeholder="Sound"
            />
            <Flex flexDirection="row">
                <Button
                    onClick={() => openEmojiModal("edit", (emoji, sound, cs) => {

                    })}
                >
                    <CogWheel width={16} height={16} />
                </Button>
                <Button
                    color={Button.Colors.RED}
                >
                    <DeleteIcon width={16} height={16} />
                </Button>
            </Flex>
        </Flex>

    );
}

export function EmojiSoundboardSettings() {
    console.log(settings.store.emojiSounds);
    const [sounds] = useState<EmojiSound[]>(settings.store.emojiSounds ?? DEFAULT_SOUNDS);

    return (
        <Flex flexDirection="column">
            {sounds.length > 0
                ? sounds.map((sound, i) => (
                    <EmojiSoundboardEntry
                        key={i}
                        index={i}
                        entry={sound}

                    />
                ))
                : <NoEmojiSounds />
            }
            <Button
                onClick={() => openEmojiModal("create", (emoji, sound, caseSensitive) => {
                    settings.store.emojiSounds.push({ emoji, sound, caseSensitive });
                })}
            >
                Create New Sound Trigger
            </Button>
        </Flex>
    );
}
