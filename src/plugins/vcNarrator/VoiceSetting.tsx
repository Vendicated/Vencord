/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, SearchableSelect, useMemo, useState } from "@webpack/common";

import { getCurrentVoice, settings } from "./settings";

// TODO: replace by [Object.groupBy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy) once it has more maturity

function groupBy<T extends object, K extends PropertyKey>(arr: T[], fn: (obj: T) => K) {
    return arr.reduce((acc, obj) => {
        const value = fn(obj);
        acc[value] ??= [];
        acc[value].push(obj);
        return acc;
    }, {} as Record<K, T[]>);
}

interface PickerProps {
    voice: string | undefined;
    voices: SpeechSynthesisVoice[];
}

function SimplePicker({ voice, voices }: PickerProps) {
    const options = voices.map(voice => ({
        label: voice.name,
        value: voice.voiceURI,
        default: voice.default,
    }));

    return (
        <SearchableSelect
            placeholder="Select a voice"
            maxVisibleItems={5}
            options={options}
            value={options.find(o => o.value === voice)}
            onChange={v => settings.store.voice = v}
            closeOnSelect
        />
    );
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

function ComplexPicker({ voice, voices }: PickerProps) {
    const groupedVoices = useMemo(() => groupBy(voices, voice => voice.lang), [voices]);

    const languageNameMapping = useMemo(() => {
        const list = [] as Record<"name" | "friendlyName", string>[];

        for (const name in groupedVoices) {
            try {
                const friendlyName = languageNames.of(name);
                if (friendlyName) {
                    list.push({ name, friendlyName });
                }
            } catch { }
        }

        return list;
    }, [groupedVoices]);

    const [selectedLanguage, setSelectedLanguage] = useState(() => getCurrentVoice()?.lang ?? languageNameMapping[0].name);

    if (languageNameMapping.length === 1) {
        return (
            <SimplePicker
                voice={voice}
                voices={groupedVoices[languageNameMapping[0].name]}
            />
        );
    }

    const voicesForLanguage = groupedVoices[selectedLanguage];

    const languageOptions = languageNameMapping.map(l => ({
        label: l.friendlyName,
        value: l.name
    }));

    return (
        <>
            <Forms.FormTitle>Language</Forms.FormTitle>
            <SearchableSelect
                placeholder="Select a language"
                options={languageOptions}
                value={languageOptions.find(l => l.value === selectedLanguage)}
                onChange={v => setSelectedLanguage(v)}
                maxVisibleItems={5}
                closeOnSelect
            />
            <Forms.FormTitle>Voice</Forms.FormTitle>
            <SimplePicker
                voice={voice}
                voices={voicesForLanguage}
            />
        </>
    );
}


function VoiceSetting() {
    const voices = useMemo(() => window.speechSynthesis?.getVoices() ?? [], []);
    const { voice } = settings.use(["voice"]);

    if (!voices.length)
        return <Forms.FormText>No voices found.</Forms.FormText>;

    // espeak on Linux has a ridiculous amount of voices (26k for me).
    // If there are more than 20 voices, we split it up into two pickers, one for language, then one with only the voices for that language.
    // This way, there are around 200-ish options per language
    const Picker = voices.length > 20 ? ComplexPicker : SimplePicker;
    return <Picker voice={voice} voices={voices} />;
}

export function VoiceSettingSection() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle>Voice</Forms.FormTitle>
            <VoiceSetting />
        </Forms.FormSection>
    );
}
