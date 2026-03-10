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

import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { PluginOptionBoolean } from "@utils/types";
import { Forms, React, Switch } from "@webpack/common";

import { ISettingElementProps } from ".";

export function SettingBooleanComponent({ option, pluginSettings, definedSettings, id, onChange, onError }: ISettingElementProps<PluginOptionBoolean>) {
    const def = pluginSettings[id] ?? option.default;

    const [state, setState] = React.useState(def ?? false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue: boolean): void {
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
            <Switch
                value={state}
                onChange={handleChange}
                note={option.description}
                disabled={option.disabled?.call(definedSettings) ?? false}
                {...option.componentProps}
                hideBorder
                style={{ marginBottom: "0.5em" }}
            >
                {wordsToTitle(wordsFromCamel(id))}
            </Switch>
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}

