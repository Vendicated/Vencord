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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserUtils } from "@webpack/common";

const USER_ID_REGEX = /<@!?(\d+)>/;

export default definePlugin({
    name: "MentionCacheFix",
    description: "Force fetches uncached users from the API when they are mentioned",
    authors: [Devs.MyNameIsJeff],
    onMouseOver({ target }: MouseEvent) {
        if (!(target instanceof HTMLElement)) return;
        const message = target.closest("[id^=chat-messages-]");
        if (!message) return;
        const mentions: NodeListOf<HTMLSpanElement> = message.querySelectorAll("span[class^=roleMention]");
        const userIds = new Set<string>();
        mentions.forEach(m => {
            const match = USER_ID_REGEX.exec(m.innerText);
            if (!match) return;
            userIds.add(match[1]);
        });
        if (userIds.size === 0) return;

        Promise.allSettled([...userIds].map(id => UserUtils.fetchUser(id))).then(() => {
            // TODO - get react to update the message without needing the user to unhover
        });
    },
    start() {
        document.addEventListener("mouseover", this.onMouseOver);
    },

    stop() {
        document.removeEventListener("mouseover", this.onMouseOver);
    }
});
