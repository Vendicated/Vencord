/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button, useStateFromStores } from "@webpack/common";

import { addIndicator, removeIndicator } from ".";
import { HiddenServersMenu } from "./components/HiddenServersMenu";
import { HiddenServersStore } from "./HiddenServersStore";

export default definePluginSettings({
    showIndicator: {
        type: OptionType.BOOLEAN,
        description: "Show menu to unhide servers at the bottom of the list",
        default: true,
        onChange: val => {
            if (val) {
                addIndicator();
            } else {
                removeIndicator();
            }
        }
    },
    guildsList: {
        type: OptionType.COMPONENT,
        description: "Remove hidden servers",
        component: () => {
            const detail = useStateFromStores([HiddenServersStore], () => HiddenServersStore.hiddenGuildsDetail());
            return <HiddenServersMenu guilds={detail} />;
        }
    },
    resetHidden: {
        type: OptionType.COMPONENT,
        description: "Remove all hidden guilds from the list",
        component: () => (
            <div>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    onClick={() => HiddenServersStore.clearHidden()}
                >
                    Reset Hidden Servers
                </Button>
            </div>
        ),
    },
});
