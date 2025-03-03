/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { disableStyle, enableStyle } from "@api/Styles";

import hideAvatarDecorations from "./hideAvatarDecorations.css?managed";
import hideDiscoverButton from "./hideDiscoverButton.css?managed";
import hideNitroButtons from "./hideNitroButtons.css?managed";
import hideProfileEffects from "./hideProfileEffects.css?managed";
import hideShopButton from "./hideShopButton.css?managed";

const settings = definePluginSettings({
    nitro: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove Nitro buttons",
        restartNeeded: true
    },
    shop: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove the Shop button",
        restartNeeded: true
    },
    themes: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove profile themes",
        restartNeeded: true
    },
    effects: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove profile effects",
        restartNeeded: true
    },
    decorations: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove profile decorations",
        restartNeeded: true
    },
    discover: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Remove the \"Discover\" button",
        restartNeeded: true
    },
});

export default definePlugin({
    name: "NoDiscordJunk",
    description: "Gives the user options to disable default Discord junk such as nitro buttons, shop buttons etc.",
    authors: [Devs.bamboooz],
    patches: [
        {
            find: "hasThemeColors(){",
            replacement: {
                match: /get canUsePremiumProfileCustomization\(\){return /,
                replace: "$&$self.showThemes()&&"
            }
        },
    ],
    start() {
        if (settings.store.nitro) {
            enableStyle(hideNitroButtons);
        } else {
            disableStyle(hideNitroButtons);
        }

        if (settings.store.shop) {
            enableStyle(hideShopButton);
        } else {
            disableStyle(hideShopButton);
        }

        if (settings.store.effects) {
            enableStyle(hideProfileEffects);
        } else {
            disableStyle(hideProfileEffects);
        }

        if (settings.store.decorations) {
            enableStyle(hideAvatarDecorations);
        } else {
            disableStyle(hideAvatarDecorations);
        }

        if (settings.store.discover) {
            enableStyle(hideDiscoverButton);
        } else {
            disableStyle(hideDiscoverButton);
        }
    },
    settings,
    showThemes: () => {
        return !settings.store.themes;
    }
});
