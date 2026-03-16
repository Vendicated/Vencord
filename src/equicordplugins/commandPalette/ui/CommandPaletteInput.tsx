/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { React, TextInput } from "@webpack/common";

const cl = classNameFactory("vc-command-palette-");

interface CommandPaletteInputProps {
    value: string;
    onChange(value: string): void;
    placeholder?: string;
    autoFocus?: boolean;
    inputClassName?: string;
    readOnly?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    onInputFocus?: React.FocusEventHandler<HTMLInputElement>;
    onInputBlur?: React.FocusEventHandler<HTMLInputElement>;
    onInputClick?: React.MouseEventHandler<HTMLInputElement>;
    children?: React.ReactNode;
}

export function CommandPaletteInput({
    value,
    onChange,
    placeholder,
    autoFocus = true,
    inputClassName,
    readOnly = false,
    inputRef,
    onInputFocus,
    onInputBlur,
    onInputClick,
    children
}: CommandPaletteInputProps) {
    return (
        <div className={cl("input")}>
            <div className={cl("main-input")}>
                <TextInput
                    ref={inputRef}
                    className={classes(cl("main-search-input"), inputClassName)}
                    autoFocus={autoFocus}
                    value={value}
                    onChange={onChange}
                    readOnly={readOnly}
                    placeholder={placeholder ?? "Search commands or type a query"}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                    onClick={onInputClick}
                />
            </div>
            {children}
        </div>
    );
}
