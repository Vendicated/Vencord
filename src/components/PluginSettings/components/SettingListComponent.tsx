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

import { PluginOptionList } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { Button, Forms, React, TextInput } from "@webpack/common";

import { ISettingElementProps } from ".";

const IconClose = findByCodeLazy("M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z");

export function SettingListComponent({ option, pluginSettings, definedSettings, id, onChange, onError }: ISettingElementProps<PluginOptionList>) {
    const [state, setState] = React.useState<string[]>(pluginSettings[id] ?? option.default ?? []);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else {
            setError(null);
            setState(newValue);
            onChange(newValue);
        }
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>{option.description}</Forms.FormTitle>
            <div className="vc-settings-list-wrapper">
                {state.map((value, index)=>(<div className="vc-settings-list-row">
                    <TextInput
                        key={"list-entry-" + index}
                        type="text"
                        value={value}
                        onChange={newValue => {
                            state[index] = newValue;
                            handleChange(state);
                        }}
                        placeholder={option.placeholder ?? "Enter a value"}
                        disabled={option.disabled?.call(definedSettings) ?? false}
                    />
                    <Button
                        color={Button.Colors.RED}
                        size={Button.Sizes.ICON}
                        onClick={() => {
                            state.splice(index, 1);
                            handleChange(state);
                        }}
                        disabled={option.disabled?.call(definedSettings) ?? false}
                    >
                        <IconClose color="currentColor" />
                    </Button>
                </div>))}
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        state.push("");
                        handleChange(state);
                    }}
                    disabled={option.disabled?.call(definedSettings) ?? false}
                >
                    Add new entry
                </Button>
            </div>
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}
