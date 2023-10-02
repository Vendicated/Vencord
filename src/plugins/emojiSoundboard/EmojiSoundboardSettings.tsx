/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { LazyComponent } from "@utils/react";
import { find, findByPropsLazy } from "@webpack";
import { Button, Menu, Switch, TextInput, useState } from "@webpack/common";


type EmojiSound = {
    emoji: string;
    sound: string;
    caseSensitive: boolean;
};

interface EmojiSoundboardEntryProps {
    index: number;
    entry: EmojiSound;
    onChange(index: number, emojiSound: EmojiSound): void;
}

const cl = classNameFactory("vc-es-");

function EmojiSoundboardEntry(props: EmojiSoundboardEntryProps) {
    const {
        entry: { emoji, sound, caseSensitive },
        index,
        onChange
    } = props;
    return (
        <Flex flexDirection="column">
            <Flex className={cl("emoji-entry")}>
                <TextInput
                    type="text"
                    value={emoji}
                    placeholder="Emoji"
                    onChange={v => onChange(index, { emoji: v, sound, caseSensitive })}
                    style={{ flex: 1 }}
                />
                <TextInput
                    type="text"
                    value={sound}
                    placeholder="Sound"
                    onChange={v => onChange(index, { emoji, sound: v, caseSensitive })}
                    style={{ flex: 1 }}
                />
            </Flex>
            <Flex>
                <Switch
                    value={caseSensitive}
                    onChange={v => onChange(index, { emoji, sound, caseSensitive: v })}
                    hideBorder
                >
                    Case Sensitive
                </Switch>
                {/* <Button */}

            </Flex>
            <Menu.MenuSeparator />
        </Flex>
    );
}

const EMPTY_SOUND = { emoji: "", sound: "", caseSensitive: false };

const DEFAULT_SOUNDS: EmojiSound[] = [
    // {
    //     emoji: "skull",
    //     sound: "ooga",
    //     caseSensitive: false
    // }
    EMPTY_SOUND
];

export function EmojiSoundboardSettings() {
    const [sounds, setSounds] = useState<EmojiSound[]>(DEFAULT_SOUNDS);

    const updateSounds = (i: number, sound: EmojiSound) => {
        const newSounds = [...sounds];
        newSounds[i] = sound;
        setSounds(newSounds);
    };

    return (
        <Flex flexDirection="column">
            <Button
                onClick={() => setSounds([...sounds, { ...EMPTY_SOUND }])}
            >
                Add Emoji Sound
            </Button>
            {sounds.map((sound, i) => (
                <EmojiSoundboardEntry
                    key={i}
                    index={i}
                    entry={sound}
                    onChange={updateSounds}
                />
            ))}
        </Flex>
    );
}
