/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

// Inspired by and partially based on:
// - https://github.com/meqativ/dumsane/blob/master/plugins/UwUify
// - https://git.nea.moe/github/Vencord.git/plain/src/plugins/uwuify.ts

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { ContextMenuApi, Menu, React, useEffect, useState } from "@webpack/common";

import Seed from "./seed";
import { getCapitalPercentage, isAt, isUri } from "./utils";

const settings = definePluginSettings({
    faces: {
        type: OptionType.BOOLEAN,
        description: "Add random faces between words",
        default: true,
    },
    actions: {
        type: OptionType.BOOLEAN,
        description: "Add random actions between words",
        default: true,
    },
    stutters: {
        type: OptionType.BOOLEAN,
        description: "Add stutters to words",
        default: true,
    },
    words: {
        type: OptionType.BOOLEAN,
        description: "Replace letters (r/l → w, ove → uv, etc.)",
        default: true,
    },
    exclamations: {
        type: OptionType.BOOLEAN,
        description: "Replace exclamation/question marks",
        default: true,
    },
    uwuifyCodeBlocks: {
        type: OptionType.BOOLEAN,
        description: "UwUify code snippets and code blocks",
        default: false,
    },
    faceChance: {
        type: OptionType.SLIDER,
        description: "Probability of inserting a face",
        default: 0.05,
        markers: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,
        componentProps: { defaultValue: 0.05 },
    },
    actionChance: {
        type: OptionType.SLIDER,
        description: "Probability of inserting an action",
        default: 0.075,
        markers: [0, 0.075, 0.1, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,
        componentProps: { defaultValue: 0.075 },
    },
    stutterChance: {
        type: OptionType.SLIDER,
        description: "Probability of adding a stutter",
        default: 0.1,
        markers: [0, 0.1, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,
        componentProps: { defaultValue: 0.1 },
    },
    wordChance: {
        type: OptionType.SLIDER,
        description: "Probability of replacing letters in a word",
        default: 1,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,
        componentProps: { defaultValue: 1 },
    },
    exclamationChance: {
        type: OptionType.SLIDER,
        description: "Probability of replacing exclamation marks",
        default: 1,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,
        componentProps: { defaultValue: 1 },
    },
});

const FACES = [
    "(・`ω´・)", ";;w;;", "OwO", "UwU", ">w<", "^w^",
    "ÚwÚ", "^-^", ":3", "x3", ";3",
];

const EXCLAMATIONS = ["!?", "?!!", "?!?1", "!!11", "?!?!"];

const ACTIONS = [
    "*blushes*", "*whispers to self*", "*cries*", "*screams*",
    "*sweats*", "*runs away*", "*screeches*", "*walks away*",
    "*looks at you*", "*huggles tightly*", "*boops your nose*",
    "*stares cutely*", "*blushes softly*", "*licks nose*",
    "*nuzzles closer*", "*licks neck*", "*twerks*",
    "*starts twerking*",
];

const UWU_MAP: [RegExp, string][] = [
    [/(?:r|l)/g, "w"],
    [/(?:R|L)/g, "W"],
    [/n([aeiou])/g, "ny$1"],
    [/N([aeiou])/g, "Ny$1"],
    [/N([AEIOU])/g, "Ny$1"],
    [/ove/g, "uv"],
];

function lowercaseIfNeeded(word: string, index: number, words: string[]): string {
    const [firstChar] = word;
    if (firstChar !== firstChar.toUpperCase()) return word;
    if (getCapitalPercentage(word) > 0.5) return word;

    if (index === 0) {
        return firstChar.toLowerCase() + word.slice(1);
    }

    const prev = words[index - 1];
    if (/[.!?-]/.test(prev[prev.length - 1])) {
        return firstChar.toLowerCase() + word.slice(1);
    }

    return word;
}

function uwuifyWords(sentence: string): string {
    if (!settings.store.words) return sentence;
    return sentence.split(" ").map(word => {
        if (isAt(word) || isUri(word)) return word;
        const seed = new Seed(word);
        for (const [pattern, replacement] of UWU_MAP) {
            if (seed.random() > settings.store.wordChance) continue;
            word = word.replace(pattern, replacement);
        }
        return word;
    }).join(" ");
}

function uwuifySpaces(sentence: string): string {
    const words = sentence.split(" ");
    const faceThreshold = settings.store.faces ? settings.store.faceChance : 0;
    const actionThreshold = (settings.store.actions ? settings.store.actionChance : 0) + faceThreshold;
    const stutterThreshold = (settings.store.stutters ? settings.store.stutterChance : 0) + actionThreshold;

    return words.map((word, index) => {
        const seed = new Seed(word);
        const random = seed.random();

        if (random <= faceThreshold) {
            word += " " + FACES[seed.randomInt(0, FACES.length - 1)];
            return lowercaseIfNeeded(word, index, words);
        } else if (random <= actionThreshold) {
            word += " " + ACTIONS[seed.randomInt(0, ACTIONS.length - 1)];
            return lowercaseIfNeeded(word, index, words);
        } else if (random <= stutterThreshold && !isUri(word)) {
            const stutter = seed.randomInt(0, 2);
            return (word[0] + "-").repeat(stutter) + word;
        }

        return word;
    }).join(" ");
}

function uwuifyExclamations(sentence: string): string {
    if (!settings.store.exclamations) return sentence;
    const pattern = /[?!]+$/;
    return sentence.split(" ").map(word => {
        const seed = new Seed(word);
        if (!pattern.test(word) || seed.random() > settings.store.exclamationChance) return word;
        word = word.replace(pattern, "");
        word += EXCLAMATIONS[seed.randomInt(0, EXCLAMATIONS.length - 1)];
        return word;
    }).join(" ");
}

function uwuifySentence(sentence: string): string {
    if (!settings.store.uwuifyCodeBlocks) {
        return sentence.replace(/(```[\s\S]*?```|`[^`]+`)|([^`]+)/g, (_, code, text) => {
            if (code) return code;
            let s = text;
            s = uwuifyWords(s);
            s = uwuifyExclamations(s);
            s = uwuifySpaces(s);
            return s;
        });
    }

    let s = sentence;
    s = uwuifyWords(s);
    s = uwuifyExclamations(s);
    s = uwuifySpaces(s);
    return s;
}

let lastState = false;

const UwuIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className}>
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
            fill="currentColor" fontSize="10" fontWeight="bold">UwU</text>
    </svg>
);

function UwuSettingsMenu() {
    const s = settings.use(["faces", "actions", "stutters", "words", "exclamations", "uwuifyCodeBlocks"]);
    return (
        <Menu.Menu navId="uwu-settings" onClose={ContextMenuApi.closeContextMenu}>
            <Menu.MenuCheckboxItem id="uwu-faces" label="Faces" checked={s.faces} action={() => settings.store.faces = !settings.store.faces} />
            <Menu.MenuCheckboxItem id="uwu-actions" label="Actions" checked={s.actions} action={() => settings.store.actions = !settings.store.actions} />
            <Menu.MenuCheckboxItem id="uwu-stutters" label="Stutters" checked={s.stutters} action={() => settings.store.stutters = !settings.store.stutters} />
            <Menu.MenuCheckboxItem id="uwu-words" label="Words" checked={s.words} action={() => settings.store.words = !settings.store.words} />
            <Menu.MenuCheckboxItem id="uwu-exclamations" label="Exclamations" checked={s.exclamations} action={() => settings.store.exclamations = !settings.store.exclamations} />
            <Menu.MenuSeparator />
            <Menu.MenuCheckboxItem id="uwu-codeblocks" label="Code Blocks" checked={s.uwuifyCodeBlocks} action={() => settings.store.uwuifyCodeBlocks = !settings.store.uwuifyCodeBlocks} />
        </Menu.Menu>
    );
}

const UwuToggle: ChatBarButtonFactory = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(lastState);

    useEffect(() => {
        const listener: MessageSendListener = (_, message) => {
            if (enabled) {
                message.content = uwuifySentence(message.content);
            }
        };

        addMessagePreSendListener(listener);
        return () => void removeMessagePreSendListener(listener);
    }, [enabled]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Disable UwU" : "Enable UwU"}
            onClick={() => {
                lastState = !enabled;
                setEnabled(!enabled);
            }}
            onContextMenu={e => {
                ContextMenuApi.openContextMenu(e, () => <UwuSettingsMenu />);
            }}
        >
            <span style={{ color: enabled ? "#e91e8a" : "currentColor" }}>
                <UwuIcon />
            </span>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "UwUifier",
    description: "UwUifies your messages before sending",
    authors: [Devs.sillysrc, Devs.iusetheybtw, Devs.meqativ],
    settings,

    chatBarButton: {
        icon: UwuIcon,
        render: UwuToggle,
    },
});
