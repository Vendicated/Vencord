/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

type BansResult = {
    banned: true;
    ban: {
        id: string,
        reason: string,
        expires: string | false;
    };
} | {
    banned: false;
    ban: null;
};

export default definePlugin({
    name: "Bans",
    description: "Allows you to get banned from using this client, if you violate Sencord™ Terms™ or do NOT buy NYTRO! You may NOT disable this plugin. Because I said so.",
    authors: [Devs.sin],
    required: true,

    logger: new Logger("Bans"),

    async start() {
        const userId = UserStore.getCurrentUser().id;
        const banResult = await this.checkBan(userId);

        if (banResult.banned) {
            const { reason, expires } = banResult.ban;
            const banScreen = this.createBanScreen(reason, expires);
            document.body.appendChild(banScreen);
        }
    },

    timeSpan(a: Date, b: Date) {
        let diff = a.getTime() - b.getTime();

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        diff -= days * (1000 * 60 * 60 * 24);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        diff -= hours * (1000 * 60 * 60);

        const mins = Math.floor(diff / (1000 * 60));
        diff -= mins * (1000 * 60);

        const seconds = Math.floor(diff / (1000));
        diff -= seconds * (1000);

        return { days, hours, mins, seconds };
    },

    createBanScreen(reason: string, expires: string | false) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.height = "100vh";
        div.style.width = "100vw";
        div.style.top = "0";
        div.style.left = "0";
        div.style.background = "var(--bg-overlay-app-frame,var(--background-tertiary))";
        div.style.color = "var(--white-500)";
        div.style.zIndex = "1000";
        div.style.display = "flex";
        div.style.justifyContent = "center";
        div.style.alignItems = "center";
        div.style.flexDirection = "column";
        div.style.rowGap = "14px";

        const h1 = document.createElement("h1");
        h1.innerText = "You have been banned from using Sencord™";
        h1.style.fontWeight = "bold";
        h1.style.fontSize = "34px";

        const pReason = document.createElement("p");
        pReason.innerHTML = `<b>Reason:</b> ${reason}`;
        pReason.style.margin = "0";

        div.appendChild(h1);
        div.appendChild(pReason);

        if (expires) {
            const expiresDate = new Date(expires);
            const timeSpan = this.timeSpan(expiresDate, new Date());

            const pExpires = document.createElement("p");
            pExpires.innerHTML = `Your Ban will expire in <b>${timeSpan.days} days ${timeSpan.hours} hours</b>`;
            pExpires.style.margin = "0";

            div.appendChild(pExpires);
        }

        return div;
    },

    async checkBan(userID: string) {
        const response = await fetch(`https://api.nigga.church/sencord/bans?user_id=${encodeURIComponent(userID)}`);
        const result = await response.json() as BansResult;
        return result;
    },
});
