/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";

import plogon from ".";
import { ManageSongs } from "./ui/settings/ManageSongs";

export const settings = definePluginSettings({
    manager: {
        type: OptionType.COMPONENT,
        component: () => {
            if (!plogon.started) return <Paragraph>Please enable the plugin to manage your songs</Paragraph>;

            return <ManageSongs />;
        },
    },
});
