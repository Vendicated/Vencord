/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import ColorSettings from "./components/ColorSettings";

export default definePluginSettings({
    ignoreYourself: {
        type: OptionType.BOOLEAN,
        description:
            "Don't add tag to yourself",
        default: false,
    },
    botTagInDmsList: {
        type: OptionType.BOOLEAN,
        description:
            "Show bot tag in DMs list",
        default: true,
    },
    originalOfficialTag: {
        type: OptionType.BOOLEAN,
        description:
            "Use the original `Official Discord` tag for official messages",
        default: false,
    },
    originalAutoModTag: {
        type: OptionType.BOOLEAN,
        description:
            "Use the original `Official Discord` tag for AutoMod messages",
        default: false,
    },
    colorSettings: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            return <ColorSettings />;
        }
    }
});
