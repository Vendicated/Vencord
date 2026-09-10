/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { OptionType } from "@utils/types";

import { TagsGuildMap } from "./metadata";
import { ChannelTagsData } from "./selectors";
import { UserDMChannelMap } from "./types";

export const settings = definePluginSettings({
    clickTagsToRemove: {
        type: OptionType.BOOLEAN,
        displayName: "Click tags to remove them",
        description: "Whether clicking a tag decoration removes it from its channel",
        default: true
    },
    showHints: {
        type: OptionType.BOOLEAN,
        displayName: "Show hints & tips",
        description: "Don't need help with the shortcuts anymore?",
        default: true
    },
    manageTags: {
        type: OptionType.COMPONENT,
        component: () => (
            <SettingsSection tag="div" name="Tags" id="" description="" inlineSetting>
                <Button onClick={() => void import("./TagsModal").then(({ openTagsModal }) => openTagsModal())}>Manage Tags</Button>
            </SettingsSection>
        )
    }
}).withPrivateSettings<ChannelTagsData & {
    userDMChannels: UserDMChannelMap;
    guilds: TagsGuildMap;
}>();
