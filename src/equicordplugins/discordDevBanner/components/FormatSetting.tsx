/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, useState } from "@webpack/common";

import { chromiumVariables, discordVariables, electronVariables, equicordVariables, makeDevBanner, miscVariables, settings } from ".";


export function FormatSetting(setValue) {
    const { format } = settings.store;
    const [state, setState] = useState(format ?? "{buildChannel} {buildNumber} ({buildHash}) | {equicordName} {equicordVersion} ({equicordHash})");
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue) {
        if (!newValue.trim()) {
            setError("Format cannot be empty.");
            return;
        }
        setError(null);
        setState(newValue);
        setValue(newValue);
    }

    const preview = makeDevBanner(state);

    return (
        <Forms.FormSection>
            <Forms.FormText className={"vc-discord-dev-banner-text"}>
                The format for the Discord Dev Banner. You can use the following variables:
                {"\n\n"}
                {discordVariables.join("\n")}
                {"\n\n"}
                {equicordVariables.join("\n")}
                {"\n\n"}
                {electronVariables.join("\n")}
                {"\n\n"}
                {chromiumVariables.join("\n")}
                {"\n\n"}
                {miscVariables.join("\n")}
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
