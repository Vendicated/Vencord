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

import { Settings } from "@api/settings";
import { UserStore } from "@webpack/common";

import { awaitAndFormatPronouns } from "../pronoundbUtils";
import { UserProfilePronounsProps, UserProfileProps } from "../types";

export default function PronounsProfileWrapper(PronounsComponent: React.ElementType<UserProfilePronounsProps>, props: UserProfilePronounsProps, profileProps: UserProfileProps) {
    const user = UserStore.getUser(profileProps.userId) ?? {};
    // Respect showInProfile
    if (!Settings.plugins.PronounDB.showInProfile)
        return null;
    // Don't bother fetching bot or system users
    if (user.bot || user.system)
        return null;
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
    const result = awaitAndFormatPronouns(userId);

    // If the promise completed, the result was not "unspecified", and there is a mapping for the code, then render
    if (result != null) {
        // First child is the header, second is a div with the actual text
        leProps.currentPronouns ||= result;
        return <Component {...leProps} />;
    }

    return null;
}
