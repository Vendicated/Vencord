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

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore, useState } from "@webpack/common";

let avatarUrl = "";

const settings = definePluginSettings({
    default: {
        type: OptionType.BOOLEAN,
        description: "Enable avatar preview by default.",
        default: false
    }
});

function toggle(enabled: boolean) {
    const avatars = document.querySelectorAll(".shopCard__3d319 .avatarContainer_e11d35 .wrapper__3ed10 .mask_d5067d foreignObject .avatarStack__789b4");

    for (const avatar of avatars) {
        const img = avatar.querySelector("img");

        if (img) img.src = enabled ? avatarUrl : "https://canary.discord.com/assets/6d8f0708e196aaad2550.png";
    }
}

const PreviewToggle = () => {
    const [enabled, setEnabled] = useState(settings.store.default);

    toggle(enabled);

    return (
        <button type="button" className="fieldButton__1edf0 button__581d0 lookFilled__950dd colorPrimary_ebe632 sizeSmall_da7d10 grow__4c8a4" style={{
            marginLeft: "8px"
        }} onClick={() => {
            setEnabled(!enabled);
            toggle(!enabled);
        }}>
            <div className="contents__322f4">
                {enabled ? "Disable" : "Enable"} Avatar Preview
            </div>
        </button>
    );
};

export default definePlugin({
    name: "BetterShopPreview",
    description: "Uses your avatar for avatar decoration previews in the Discord Shop.",
    authors: [EquicordDevs.Tolgchu],
    settings,
    patches: [
        {
            find: "default.Messages.COLLECTIBLES_SHOP})]})",
            replacement: {
                match: /(className:\i\.title,children:)(\i\.default\.Messages\.COLLECTIBLES_SHOP)/,
                replace: "$1[$2,$self.PreviewToggle()]"
            },
        },
    ],
    PreviewToggle,
    async start() {
        const user = UserStore.getCurrentUser();
        const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif`;

        await fetch(url).then(response => {
            if (response.ok) avatarUrl = url;
            else avatarUrl = url.replace(".gif", ".png");
        });
    },
    stop() { }
});
