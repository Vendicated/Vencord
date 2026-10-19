/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

import { useAuthorizationStore } from "./stores/AuthorizationStore";
import { useStreaksStore } from "./stores/StreaksStore";

export const settings = definePluginSettings({
    account: {
        type: OptionType.COMPONENT,
        description: "Log in or out of the Streaks API.",
        component() {
            const { isAuthorized, authorize, remove } = useAuthorizationStore();

            if (isAuthorized()) {
                return (
                    <Flex>
                        <Button
                            onClick={() => remove(UserStore.getCurrentUser()?.id)}
                            variant="dangerPrimary"
                        >
                            Log Out of Streaks API
                        </Button>
                    </Flex>
                );
            } else {
                return (
                    <Flex>
                        <Button onClick={async () => {
                            await authorize();
                            await useStreaksStore.getState().migrate();
                            await useStreaksStore.getState().fetch();
                        }}>
                            Log In to Streaks API
                        </Button>
                    </Flex>
                );
            }
        }
    },
    eliteColor: {
        type: OptionType.STRING,
        description: "Elite Streak Color (100+ days)",
        default: "#9b39fe"
    },
    diamondColor: {
        type: OptionType.STRING,
        description: "Diamond Streak Color (60+ days)",
        default: "#f7409c"
    },
    platinumColor: {
        type: OptionType.STRING,
        description: "Platinum Streak Color (45+ days)",
        default: "#856bfe"
    },
    goldColor: {
        type: OptionType.STRING,
        description: "Gold Streak Color (30+ days)",
        default: "#f75340"
    },
    silverColor: {
        type: OptionType.STRING,
        description: "Silver Streak Color (14+ days)",
        default: "#f57b0b"
    },
    bronzeColor: {
        type: OptionType.STRING,
        description: "Bronze Streak Color (7+ days)",
        default: "#b08d57"
    },
    defaultColor: {
        type: OptionType.STRING,
        description: "Default Streak Color (1+ days)",
        default: "#f59e0b"
    }
});
