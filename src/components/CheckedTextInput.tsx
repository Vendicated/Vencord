/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { React, TextInput } from "@webpack/common";

interface TextInputProps {
    /**
     * WARNING: Changing this between renders will have no effect!
     */
    value: string;
    /**
     * This will only be called if the new value passed validate()
     */
    onChange(newValue: string): void;
    /**
     * Optionally validate the user input
     * Return true if the input is valid
     * Otherwise, return a string containing the reason for this input being invalid
     */
    validate(v: string): true | string;
}

/**
 * A very simple wrapper around Discord's TextInput that validates input and shows
 * the user an error message and only calls your onChange when the input is valid
 */
export function CheckedTextInput({ value: initialValue, onChange, validate }: TextInputProps) {
    const [value, setValue] = React.useState(initialValue);
    const [error, setError] = React.useState<string>();

    function handleChange(v: string) {
        setValue(v);
        const res = validate(v);
        if (res === true) {
            setError(void 0);
            onChange(v);
        } else {
            setError(res);
        }
    }

    return (
        <>
            <TextInput
                type="text"
                value={value}
                onChange={handleChange}
                error={error}
            />
        </>
    );
}
