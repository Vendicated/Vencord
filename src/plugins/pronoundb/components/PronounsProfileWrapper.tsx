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

import { useAwaiter } from "../../../utils/misc";
import { Settings } from "../../../Vencord";
import { UserStore } from "../../../webpack/common";
import { fetchPronouns, formatPronouns } from "../pronoundbUtils";
import { PronounMapping, UserProfilePronounsProps, UserProfileProps } from "../types";

export default function PronounsProfileWrapper(PronounsComponent: React.ElementType<UserProfilePronounsProps>, props: UserProfilePronounsProps, profileProps: UserProfileProps) {
    const user = UserStore.getUser(profileProps.userId) ?? {};
    // Don't bother fetching bot or system users
    if (user.bot || user.system) return null;
    // Respect showSelf options
    if (!Settings.plugins.PronounDB.showSelf && user.id === UserStore.getCurrentUser().id)
        return null;

    return <ProfilePronouns
        userId={profileProps.userId}
        Component={PronounsComponent}
        leProps={props}
    />;
}

function ProfilePronouns(
    { userId, Component, leProps }: {
        userId: string;
        Component: React.ElementType<UserProfilePronounsProps>;
        leProps: UserProfilePronounsProps;
    }
) {
    const [result, , isPending] = useAwaiter(
        () => fetchPronouns(userId),
        null,
        e => console.error("Fetching pronouns failed: ", e)
    );

    // If the promise completed, the result was not "unspecified", and there is a mapping for the code, then render
    if (!isPending && result && result !== "unspecified" && PronounMapping[result]) {
        // First child is the header, second is a div with the actual text
        leProps.currentPronouns ||= formatPronouns(result);
        return <Component {...leProps} />;
    }

    return null;
}
