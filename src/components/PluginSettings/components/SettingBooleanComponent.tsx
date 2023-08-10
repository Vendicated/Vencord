/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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

