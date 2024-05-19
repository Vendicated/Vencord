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

import { showNotification } from "@api/Notifications";
import { relaunch } from "@utils/native";
import { Alerts } from "@webpack/common";

import { Native } from "..";
import { Commit, GitInfo } from "../native";
import { GitError, GitResult } from "../types";
import { getNative } from "./misc";

export let changes: Commit[] | undefined = [];
export let updateError: GitError | undefined;
export let isOutdated = false;
export let repoInfo: GitInfo | undefined;
export let isNewer = false;
(async () => {
    const Native = getNative();
    repoInfo = await Unwrap<GitInfo>(Native.getRepoInfo());
})();

async function Unwrap<T>(p: Promise<GitResult>) {
    const res = await p;

    if (res.ok) return res.value as T;

    updateError = res;
    if (res.error) console.error(res.error);
}

export async function getRepoInfo() {
    return repoInfo ?? (repoInfo = await Unwrap<GitInfo>(Native.getRepoInfo()));
}

export async function checkForUpdates() {
    changes = await Unwrap<Commit[]>(Native.getNewCommits());

    if (!changes)
        return isOutdated = false;

    if (changes.some(c => c.hash === repoInfo?.gitHash)) {
        isNewer = true;
        return isOutdated = false;
    }

    return isOutdated = changes.length > 0;
}