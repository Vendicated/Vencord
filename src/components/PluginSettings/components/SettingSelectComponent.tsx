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

import type { PluginOptionSelect } from "@utils/types";
import { Forms, Select, useEffect, useState } from "@webpack/common";

import type { ISettingElementProps } from ".";

export function SettingSelectComponent({ option, pluginSettings, definedSettings, onChange, onError, id }: ISettingElementProps<PluginOptionSelect>) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const def = pluginSettings[id] ?? option.options?.find(o => o.default)?.value;

    const [state, setState] = useState<any>(def ?? null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue: any) {
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
            <Select
                isDisabled={option.disabled?.call(definedSettings) ?? false}
                options={option.options}
                placeholder={option.placeholder ?? "Select an option"}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={handleChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                {...option.componentProps}
            />
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}
