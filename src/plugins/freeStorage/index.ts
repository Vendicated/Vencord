/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Samu and contributors
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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
  totalSize: {
      type: OptionType.NUMBER,
      description: "Total Message Size",
      default: 2000,
      hidden: false
  },
  attack: {
      type: OptionType.BOOLEAN,
      description: "Attack",
      default: false,
      hidden: false 
  }
})

const change = async (_, message) => {
    if (!settings.store.attack) return;

    if (!message.content) return;

    message.content = "­".repeat(settings.store.totalSize-message.content.length) + message.content
}

export default definePlugin({
    name: "FreeStorage",
    description: "Discord is FREE Storage",
    authors: [Devs.TechFun],
    dependencies: ["MessageEventsAPI"],
    patches: [
        {
            // Indicator
            find: ".Messages.MESSAGE_EDITED,",
            replacement: {
                match: /let\{className:\i,message:\i[^}]*\}=(\i)/,
                replace: "try {$1.message.content=$1.message.content.replaceAll('­', '')} catch {};$&"
            }
        },
    ],
    settings,
    start: () => {
        addPreSendListener(change);
    },
    stop: () => {
        removePreSendListener(change);
    }
});
