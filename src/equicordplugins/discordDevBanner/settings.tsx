/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Forms, useState } from "@webpack/common";

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
        "{discordIcon} - Discord icon",
        "{discordName} - The word 'Discord'",
        "{buildChannel} - Discord build channel (e.g. Stable)",
        "{buildNumber} - Discord build number (e.g. 123456)",
        "{buildHash} - Discord build hash (e.g. 123456789)",
        "{equicordIcon} - Equicord icon",
        "{equicordName} - The word 'Equicord'",
        "{equicordVersion} - Version of Equicord (e.g. 1.0.0)",
        "{equicordHash} - Equicord build hash (e.g. 123456789)",
        "{equicordPlatform} - Platform Equicord is running on (e.g. Dev)",
        "{electronIcon} - Electron icon",
        "{electronName} - The word 'Electron'",
        "{electronVersion} - Electron runtime version (e.g. 25.0.0)",
        "{chromiumIcon} - Chromium icon",
        "{chromiumName} - The word 'Chromium'",
        "{chromiumVersion} - Chromium engine version (e.g. 125.0.0.0)",
        "{devBannerIcon} - Dev banner icon",
        "{newline} or \\n - Newline character"
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
            <Forms.FormText className={"vc-discord-dev-banner-text"}>
                The format to transform the build number to. You can use the following placeholders:
                {"\n\n"}
                {placeholderInfo.join("\n")}
                {"\n\n"}
            </Forms.FormText>

            <Forms.FormText className="vc-discord-dev-banner-text">Preview:</Forms.FormText>
            <Forms.FormText style={{ padding: "2px" }}>{preview}</Forms.FormText>
            <textarea
                className="vc-discord-dev-banner-input"
                value={state}
                onChange={e => handleChange(e.target.value)}
                placeholder="{buildChannel} {buildNumber} ({buildHash}) | {equicordName} {equicordVersion} ({equicordHash})"
                rows={1}
                ref={el => {
                    if (el) {
                        el.style.height = "auto";
                        el.style.height = el.scrollHeight + "px";
                    }
                }}
                onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                }}
            />

            {error && (
                <Forms.FormText className={"vc-discord-dev-banner-error"}>{error}</Forms.FormText>
            )}
        </Forms.FormSection>
    );
}
