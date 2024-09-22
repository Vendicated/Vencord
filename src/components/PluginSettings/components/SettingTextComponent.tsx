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

import { Margins } from "@utils/margins";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import type { PluginOptionString } from "@utils/types";
import { Forms, TextInput, useEffect, useState } from "@webpack/common";

import type { ISettingElementProps } from ".";

export function SettingTextComponent({ option, pluginSettings, definedSettings, id, onChange, onError }: ISettingElementProps<PluginOptionString>) {
    const [state, setState] = useState(pluginSettings[id] ?? option.default ?? null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue: any) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else setError(null);

        setState(newValue);
        onChange(newValue);
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>{wordsToTitle(wordsFromCamel(id))}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom20} type="description">{option.description}</Forms.FormText>
            <TextInput
                type="text"
                value={state}
                onChange={handleChange}
                placeholder={option.placeholder ?? "Enter a value"}
                disabled={option.disabled?.call(definedSettings) ?? false}
                {...option.componentProps}
            />
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}
