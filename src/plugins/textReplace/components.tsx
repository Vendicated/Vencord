/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TextInput, useState } from "@webpack/common";

import { applyRule, stringToRegex } from "./utils";

export function Input({ initialValue, onChange, placeholder, enabled }: {
    placeholder: string;
    initialValue: string;
    enabled: boolean;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            disabled={!enabled}
            onChange={e => {
                setValue(e);
                onChange(e);
            }}
            spellCheck={false}
            maxLength={2000}
        />
    );
}

export function Preview({ textReplaceRules, value, index, enabled }) {
    for (let i = 0; i <= index; i++) {
        value = applyRule(textReplaceRules[i], value);
    }
    return (
        <TextInput
            editable={false}
            value={value}
            disabled={!enabled}
        />
    );
}

export function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (e) {
        return (
            <span style={{ color: "var(--text-danger)" }}>
                {String(e)}
            </span>
        );
    }
}
