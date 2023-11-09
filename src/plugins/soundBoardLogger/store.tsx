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

import { DataStore } from "@api/index";
import settings from "./settings";
import { SoundEvent, SoundLogEntry } from "./utils";

/** Attempts to add a sound event to the log */
export async function updateLoggedSounds(sound: SoundEvent): Promise<void> {
    const data = await getLoggedSounds();

    if (!data) {
        await DataStore.set("SoundBoardLogList", [{ ...sound, users: [{ id: sound.userId, plays: [+Date.now()] }] }]);
    } else {
        if (data.some(item => item.soundId === sound.soundId)) {
            const newSounds = data.map(item => {
                if (item.soundId != sound.soundId) return item;
                return {
                    ...item,
                    users: item.users.some(user => user.id === sound.userId) ?
                        item.users.map(user => {
                            if (user.id != sound.userId) return user;
                            return { id: sound.userId, plays: [...user.plays, +Date.now()] };
                        }) :
                        [
                            ...item.users,
                            { id: sound.userId, plays: [+Date.now()] }
                        ]
                };
            });
            await DataStore.set("SoundBoardLogList", newSounds);
            return;
        };

        let limit = settings.store.SavedIds ?? 50;
        if (limit == 0) limit = Infinity;
        const modified = [{ ...sound, users: [{ id: sound.userId, plays: [+Date.now()] }] }, ...data].slice(0, limit);

        await DataStore.set("SoundBoardLogList", modified);
    }
}

/** Clears the logged sounds array */
export async function clearLoggedSounds() {
    await DataStore.set("SoundBoardLogList", []);
}

/** Returns an array with the logged sounds */
export async function getLoggedSounds(): Promise<SoundLogEntry[]> {
    let data = await DataStore.get("SoundBoardLogList");
    if (!data) {
        DataStore.set("SoundBoardLogList", []);
        return [];
    }
    else {
        return data;
    }
};