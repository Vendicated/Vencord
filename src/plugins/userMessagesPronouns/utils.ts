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

import { getCurrentChannel } from "@utils/discord";
import { UserProfileStore, useStateFromStores } from "@webpack/common";

import { PronounsFormat, settings } from "./settings";

function useDiscordPronouns(id: string, useGlobalProfile: boolean = false): string | undefined {
    const globalPronouns: string | undefined = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(id)?.pronouns);
    const guildPronouns: string | undefined = useStateFromStores([UserProfileStore], () => UserProfileStore.getGuildMemberProfile(id, getCurrentChannel()?.getGuildId())?.pronouns);

    if (useGlobalProfile) return globalPronouns;
    return guildPronouns || globalPronouns;
}

export function useFormattedPronouns(id: string, useGlobalProfile: boolean = false) {
    const pronouns = useDiscordPronouns(id, useGlobalProfile)?.trim().replace(/\n+/g, "");
    return settings.store.pronounsFormat === PronounsFormat.Lowercase ? pronouns?.toLowerCase() : pronouns;
}
