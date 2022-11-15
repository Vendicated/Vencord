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

import { isOutdated, rebuild, update } from "../utils/updater";

export async function handleComponentFailed() {
    if (isOutdated) {
        setImmediate(async () => {
            const wantsUpdate = confirm(
                "Uh Oh! Failed to render this Page." +
                " However, there is an update available that might fix it." +
                " Would you like to update and restart now?"
            );
            if (wantsUpdate) {
                try {
                    await update();
                    await rebuild();
                    if (IS_WEB)
                        location.reload();
                    else
                        DiscordNative.app.relaunch();
                } catch (e) {
                    console.error(e);
                    alert("That also failed :( Try updating or reinstalling with the installer!");
                }
            }
        });
    }
}
