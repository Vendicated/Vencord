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

export async function updateLoggedSounds(sound: SoundEvent): Promise<void> {
    await DataStore.update<SoundLogEntry[]>("SoundBoardLogList", (data = []) => {
        const now = Date.now();
        const entry = data.find(item => item.soundId === sound.soundId);
        if (entry) {
            const user = entry.users.find(user => user.id === sound.userId);
            if (user) user.plays.push(now);
            else entry.users.push({ id: sound.userId, plays: [now] });
        } else {
            data.unshift({ ...sound, users: [{ id: sound.userId, plays: [now] }] });
        }
        const limit = settings.store.SavedIds;
        return limit === 0 ? data : data.slice(0, limit);
    });
}

export async function clearLoggedSounds() {
    await DataStore.set("SoundBoardLogList", []);
}

export async function getLoggedSounds(): Promise<SoundLogEntry[]> {
    return await DataStore.get<SoundLogEntry[]>("SoundBoardLogList") ?? [];
}
