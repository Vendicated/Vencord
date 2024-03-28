/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
import { Forms } from "@webpack/common";

const settings = definePluginSettings({
    giftButton: {
        description: "Gifts button in chatbox",
        default: true,
        type: OptionType.BOOLEAN,
    },
    gifButton: {
        description: "GIFs button in chatbox",
        default: true,
        type: OptionType.BOOLEAN,
    },
    stickerButton: {
        description: "Stickers button in chatbox",
        default: true,
        type: OptionType.BOOLEAN,
    },
    emojiButton: {
        description: "Emojis button in chatbox",
        default: true,
        type: OptionType.BOOLEAN,
    },
    languageButton: {
        description: "Languages button in the chatbox context menu",
        default: true,
        type: OptionType.BOOLEAN,
    },
    discoverButton: {
        description: "Server Discovery button in the server list",
        default: true,
        type: OptionType.BOOLEAN,
    },
    nitroButton: {
        description: "Nitro button in the home page",
        default: true,
        type: OptionType.BOOLEAN,
    },
    shopButton: {
        description: "Shop button in the home page",
        default: true,
        type: OptionType.BOOLEAN,
    },
    helpButton: {
        description: "Help button on the toolbar",
        default: true,
        type: OptionType.BOOLEAN,
    }
});

export default definePlugin({
    name: "Declutter",
    description: "Adds toggles for some unnecessary UI elements",
    authors: [Devs.KawaiianPizza],
    settingsAboutComponent: () => (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Usage</Forms.FormTitle>
            <Forms.FormText>
                Off to hide, default is On
            </Forms.FormText>
        </Forms.FormSection>),
    settings,
    patches: [
        {
            find: ",\"ChannelTextAreaButtons\")",
            replacement: {
                match: /,(.null===.+?"gift"..)/,
                replace: ",$self.settings.store.giftButton&&$1"
            }
        },
        {
            find: ",\"ChannelTextAreaButtons\")",
            replacement: {
                match: /,(.null===.+?"gif"..)/,
                replace: ",$self.settings.store.gifButton&&$1"
            }
        },
        {
            find: ",\"ChannelTextAreaButtons\")",
            replacement: {
                match: /,(.null===.+?"sticker"..)/,
                replace: ",$self.settings.store.stickerButton&&$1"
            }
        },
        {
            find: ",\"ChannelTextAreaButtons\")",
            replacement: {
                match: /,(.null===.+?"emoji"..)/,
                replace: ",$self.settings.store.emojiButton&&$1"
            }
        },
        {
            find: ",\"ChannelTextAreaButtons\")",
            replacement: {
                match: /,(.null===.+?"gift"..)/,
                replace: ",$self.settings.store.giftButton&&$1"
            }
        },
        {
            find: "Messages.LANGUAGES",
            replacement: {
                match: /,(.\?.+?"languages".+?null)/,
                replace: ",$self.settings.store.languageButton&&$1"
            }
        },
        {
            find: "guildDiscoveryRef",
            replacement: {
                match: /,(!.{1,2}&&.+?guildDiscoveryRef,.+?null)/,
                replace: ",$self.settings.store.discoverButton&&($1)"
            }
        },
        {
            find: "guildDiscoveryRef",
            replacement: {
                match: /,(.{1,2}\|\|.+?guildDiscoveryRef.+?),/,
                replace: ",$self.settings.store.discoverButton&&($1),"
            }
        },
        {
            find: ".HOME_PAGE_SHOP_TAB,",
            replacement: {
                match: /,(.0.{53,59}APPLICATION_STORE.+?"premium")/,
                replace: ",$self.settings.store.nitroButton&&$1"
            }
        },
        {
            find: ".HOME_PAGE_SHOP_TAB,",
            replacement: {
                match: /,(.0.{33,36}COLLECTIBLES_SHOP.+?"discord-shop")/,
                replace: ",$self.settings.store.shopButton&&$1"
            }
        },
        {
            find: "toolbar:function",
            replacement: {
                match: /,(.{1,2}\?[^:]+?:.0.{10,12}default.{4})\]/,
                replace: ",$self.settings.store.helpButton?($1):null]"
            }
        }
    ]
});


