/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Card, Forms, TextArea, useState } from "@webpack/common";

export function OnlineThemesTab() {
    const settings = useSettings(["themeLinks"]);

    const [themeText, setThemeText] = useState(settings.themeLinks.join("\n"));

    // When the user leaves the online theme textbox, update the settings
    function onBlur() {
        settings.themeLinks = [...new Set(
            themeText
                .trim()
                .split(/\n+/)
                .map(s => s.trim())
                .filter(Boolean)
        )];
    }

    return (
        <>
            <Card className={classes("vc-warning-card", Margins.bottom16)}>
                <Forms.FormText>
                    This section is for advanced users. If you are having difficulties using it, use the
                    Local Themes tab instead.
                </Forms.FormText>
            </Card>
            <Card className="vc-settings-card">
                <Forms.FormTitle tag="h5">Paste links to css files here</Forms.FormTitle>
                <Forms.FormText>One link per line</Forms.FormText>
                <Forms.FormText>You can prefix lines with @light or @dark to toggle them based on your Discord theme</Forms.FormText>
                <Forms.FormText>Make sure to use direct links to files (raw or github.io)!</Forms.FormText>
            </Card>

            <Forms.FormSection title="Online Themes" tag="h5">
                <TextArea
                    value={themeText}
                    onChange={setThemeText}
                    className={"vc-settings-theme-links"}
                    placeholder="Enter Theme Links..."
                    spellCheck={false}
                    onBlur={onBlur}
                    rows={10}
                />
            </Forms.FormSection>
        </>
    );
}
