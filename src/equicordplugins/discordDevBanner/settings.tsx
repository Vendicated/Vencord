/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Forms, TextInput, useState } from "@webpack/common";

import { transform } from ".";

export const settings = definePluginSettings({
    format: {
        component: ({ setValue }) => FormatSetting(setValue),
        type: OptionType.COMPONENT,
        default: "{buildChannel} {buildNumber} ({buildHash}) | {equicordName} {equicordVersion} ({equicordHash})",
        restartNeeded: true
    }
});

function FormatSetting(setValue) {
    const { format } = settings.store;
    const [state, setState] = useState(format ?? "{buildChannel} {buildNumber} ({buildHash}) | {equicordName} {equicordVersion} ({equicordHash})");
    const [error, setError] = useState<string | null>(null);

    const placeholderInfo = [
        "{discordName} - The word 'Discord'",
        "{buildChannel} - Discord build channel (e.g. Stable)",
        "{buildNumber} - Discord build number (e.g. 123456)",
        "{buildHash} - Discord build hash (e.g. 123456789)",
        "{equicordName} - The word 'Equicord'",
        "{equicordVersion} - Version of Equicord (e.g. 1.0.0)",
        "{equicordHash} - Equicord build hash (e.g. 123456789)",
        "{equicordPlatform} - Platform Equicord is running on (e.g. Dev)",
        "{electronName} - The word 'Electron'",
        "{electronVersion} - Electron runtime version (e.g. 25.0.0)",
        "{chromiumName} - The word 'Chromium'",
        "{chromiumVersion} - Chromium engine version (e.g. 125.0.0.0)",
    ];

    function handleChange(newValue) {
        if (!newValue.trim()) {
            setError("Format cannot be empty.");
            return;
        }
        setError(null);
        setState(newValue);
        setValue(newValue);
    }

    const preview = transform(state);

    return (
        <Forms.FormSection>
            <Forms.FormTitle>Custom Format</Forms.FormTitle>
            <Forms.FormText className={"vc-discord-dev-banner"}>
                The format to transform the build number to. You can use the following placeholders:
                {"\n\n"}
                {placeholderInfo.join("\n")}
                {"\n\n"}
            </Forms.FormText>

            <Forms.FormText className="vc-discord-dev-banner">Preview: {preview}</Forms.FormText>
            <TextInput
                value={state}
                onChange={handleChange}
                placeholder="{buildChannel} {buildNumber} ({buildHash}) | {equicordName} {equicordVersion} ({equicordHash})"
            />

            {error && (
                <Forms.FormText className={"vc-discord-dev-banner-error"}>{error}</Forms.FormText>
            )}
        </Forms.FormSection>
    );
}
