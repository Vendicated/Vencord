/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, Text, useEffect, useRef, useState } from "@webpack/common";

interface EditableTextProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
}

export function EditableText({ value, onChange, className }: EditableTextProps) {
    const [editing, setEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editing]);

    return editing ? (
        <input
            ref={inputRef}
            className={className}
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            onBlur={() => {
                setEditing(false);
                onChange(tempValue);
            }}
            onKeyDown={e => {
                if (e.key === "Enter") {
                    setEditing(false);
                    onChange(tempValue);
                } else if (e.key === "Escape") {
                    setEditing(false);
                    setTempValue(value);
                }
            }}
        />
    ) : (
        <Text
            className={className}
            onClick={() => setEditing(true)}
            style={{ cursor: "pointer" }}
        >
            {value}
        </Text>
    );
}
