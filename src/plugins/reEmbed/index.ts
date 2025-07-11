/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { MessageObject } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import redirectMap from "./redirectMap";
import { twitterMirrors } from "./mirrors";

const settings = definePluginSettings({
  twitterMirror: {
    type: OptionType.SELECT,
    description: "Preferred Twitter/X mirror",
    default: Object.keys(twitterMirrors)[0],
    options: Object.entries(twitterMirrors).map(([domain, name]) => ({
      label: name,
      value: domain
    }))
  }
});

export default definePlugin({
  name: "ReEmbed",
  description: "Converts unsupported embeds to supported embeds and supports differents types of Twitter/X mirrors.",
  authors: [Devs.TheCat],
  settings,

  onBeforeMessageSend(_, msg) {
    return this.replaceLinks(msg);
  },

  onBeforeMessageEdit(_, __, msg) {
    return this.replaceLinks(msg);
  },

  replaceLinks(msg: MessageObject) {
    if (!msg.content) return;

    const chosen = settings.store.twitterMirror;

    msg.content = msg.content.replace(
      /https?:\/\/(?:www\.)?twitter\.com\/([^\s<.,:;"')\]\[|]+)/gi,
      (_match, path) => `https://${chosen}/${path}`
    );

    msg.content = msg.content.replace(
      /https?:\/\/(?:www\.)?([a-zA-Z0-9.-]+)\/([^\s<.,:;"')\]\[|]+)/gi,
      (match, domain, path) => {
        const newDomain = redirectMap[domain.toLowerCase()];
        if (!newDomain) return match;
        return `https://${newDomain}/${path}`;
      }
    );

    return msg;
  }
});
