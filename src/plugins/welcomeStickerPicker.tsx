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
import { findByProps } from "@webpack";
import { ContextMenu, FluxDispatcher, Menu } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

interface Sticker {
    id: string;
    format_type: number;
    description: string;
    name: string;
}

export default definePlugin({
    name: "WelcomeStickerPicker",
    description: "description",
    authors: [Devs.Ven],

    patches: [
        {
            find: "Messages.WELCOME_CTA_LABEL",
            replacement: {
                match: /innerClassName:\i\(\).welcomeCTAButton,(?<=%\i\.length;return (\i)\[\i\].+?)/,
                replace: "$& onContextMenu:(e)=>$self.pickSticker(e, $1, arguments[0]),"
            }
        }
    ],

    pickSticker(
        event: React.UIEvent,
        stickers: Sticker[],
        { channel, message }: { channel: Channel, message: Message; }
    ) {
        ContextMenu.open(event, () => (
            <Menu.Menu
                navId="spotify-album-menu"
                onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                aria-label="Spotify Album Menu"
            >
                {stickers.map(sticker => (
                    <Menu.MenuItem
                        key={sticker.id}
                        id={sticker.id}
                        label={sticker.description.split(" ")[0]}
                        action={() => {
                            const Greeter = findByProps("sendGreetMessage");
                            Greeter.sendGreetMessage(channel.id, sticker.id, Greeter.getSendMessageOptionsForReply({
                                channel,
                                message,
                                shouldMention: true,
                                showMentionToggle: true
                            }));
                        }}
                    />
                ))}
            </Menu.Menu>
        ));
    }
});
