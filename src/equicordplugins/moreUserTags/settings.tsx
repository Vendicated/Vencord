/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Margins } from "@utils/margins";
import { OptionType } from "@utils/types";
import { Card, Flex, Forms, Switch, TextInput, Tooltip } from "@webpack/common";

import { Tag, tags } from "./consts";
import { TagSettings } from "./types";

function SettingsComponent() {
    const tagSettings = settings.store.tagSettings as TagSettings;

    return (
        <Flex flexDirection="column">
            {tags.map(t => (
                <Card key={t.name} style={{ padding: "1em 1em 0" }}>
                    <Forms.FormTitle style={{ width: "fit-content" }}>
                        <Tooltip text={t.description}>
                            {({ onMouseEnter, onMouseLeave }) => (
                                <div
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                >
                                    {t.displayName} Tag <Tag type={Tag.Types[t.name]} />
                                </div>
                            )}
                        </Tooltip>
                    </Forms.FormTitle>

                    <TextInput
                        type="text"
                        value={tagSettings[t.name]?.text ?? t.displayName}
                        placeholder={`Text on tag (default: ${t.displayName})`}
                        onChange={v => tagSettings[t.name].text = v}
                        className={Margins.bottom16}
                    />

                    <Switch
                        value={tagSettings[t.name]?.showInChat ?? true}
                        onChange={v => tagSettings[t.name].showInChat = v}
                        hideBorder
                    >
                        Show in messages
                    </Switch>

                    <Switch
                        value={tagSettings[t.name]?.showInNotChat ?? true}
                        onChange={v => tagSettings[t.name].showInNotChat = v}
                        hideBorder
                    >
                        Show in member list and profiles
                    </Switch>
                </Card>
            ))}
        </Flex>
    );
}

export const settings = definePluginSettings({
    dontShowForBots: {
        description: "Don't show extra tags for bots (excluding webhooks)",
        type: OptionType.BOOLEAN,
        default: false
    },
    dontShowBotTag: {
        description: "Only show extra tags for bots / Hide [APP] text",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    tagSettings: {
        type: OptionType.COMPONENT,
        component: SettingsComponent,
        description: "fill me"
    }
});
