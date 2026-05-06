/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Card } from "@components/Card";
import { Flex } from "@components/Flex";
import { Forms, TextArea, useState } from "@webpack/common";

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
        <Flex flexDirection="column" gap="1em">
            <Card variant="warning" defaultPadding>
                <Forms.FormText size="md">
                    This section is for advanced users. If you are having difficulties using it, use the
                    Local Themes tab instead.
                </Forms.FormText>
            </Card>
            <Card>
                <Forms.FormTitle tag="h5">Paste links to css files here</Forms.FormTitle>
                <Forms.FormText>One link per line</Forms.FormText>
                <Forms.FormText>You can prefix lines with @light or @dark to toggle them based on your Discord theme</Forms.FormText>
                <Forms.FormText>Make sure to use direct links to files (raw or github.io)!</Forms.FormText>
            </Card>

            <section>
                <Forms.FormTitle tag="h5">Online Themes</Forms.FormTitle>
                <TextArea
                    value={themeText}
                    onChange={setThemeText}
                    className={"vc-settings-theme-links"}
                    placeholder="Enter Theme Links..."
                    spellCheck={false}
                    onBlur={onBlur}
                    rows={10}
                />
            </section>
        </Flex>
    );
}
