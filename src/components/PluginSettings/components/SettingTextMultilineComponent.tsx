/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginOptionString } from "@utils/types";
import { Forms, React, TextArea } from "@webpack/common";

import { ISettingElementProps } from ".";

export function SettingTextMultilineComponent({ option, pluginSettings, definedSettings, id, onChange, onError }: ISettingElementProps<PluginOptionString>) {
    const [state, setState] = React.useState(pluginSettings[id] ?? option.default ?? null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else setError(null);

        setState(newValue);
        onChange(newValue);
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>{option.description}</Forms.FormTitle>
            <TextArea
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
