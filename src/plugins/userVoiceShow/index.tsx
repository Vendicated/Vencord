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

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import VoiceActivityIcon from "./components/VoiceActivityIcon";
import { settings } from "./settings";
import { UserProps } from "./types";

export default definePlugin({
    name: "UserVoiceShow",
    description: "Shows user's voice activity information in popouts and members lists.",
    authors: [Devs.LordElias, Devs.llytz],
    tags: ["voice", "activity"],
    settings,

    patches: [
        {
            find: "u.Z.BITE_SIZE_PROFILE_POPOUT",
            replacement: {
                match: /Z,{profileType:b.y0.BITE_SIZE,children:\[/,
                replace: "$&$self.patch(arguments[0], false, true),",
            }
        },
        // Full Size Profile
        {
            find: "O.Z.Messages.USER_PROFILE_MODAL",
            replacement: {
                match: /C.y0.FULL_SIZE,children:\[/,
                replace: "$&$self.patch(arguments[0], false, true),",
            }
        },
        // Direct Messages Side Profile
        {
            find: "let{user:t,currentUser:n,channel:P}",
            replacement: {
                match: /PANEL,children:\[/,
                replace: "$&$self.patch(arguments[0], false, true),",
            }
        },
        // Guild Members List
        {
            find: "y.Z.Messages.PREMIUM_GUILD",
            replacement: {
                match: /avatar:(\i){1,2}/,
                replace: "children:[$self.patch(arguments[0], false, false)],$&",
            }
        },
        // Direct Messages List
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /highlighted:.+?name:.+?decorators.+?\}\)\}\),/,
                replace: "$&$self.patch(arguments[0], true, false),",
            }
        },
        // Friends list
        {
            find: "let{user:t,hovered",
            replacement: {
                match: /children:a}\)]}\)/,
                replace: "$&,$self.patch(arguments[0], true, false)",
            }
        }
    ],

    patch: ({ user }: UserProps, needContainer: boolean, inProfile: boolean) => {
        if (!settings.store.showVoiceActivityIconsInLists || !user) return null;
        if (inProfile && !settings.store.showVoiceActivityIconInUserProfile) return null;

        return (
            <ErrorBoundary>
                <VoiceActivityIcon user={user} needContainer={needContainer} inProfile={inProfile} />
            </ErrorBoundary>
        );
    },
});

export const Permissions = {
    CONNECT: 1n << 20n
} as const;

export const Icons = {
    Private: "M11 5V3C16.515 3 21 7.486 21 13H19C19 8.589 15.411 5 11 5ZM17 13H15C15 10.795 13.206 9 11 9V7C14.309 7 17 9.691 17 13ZM11 11V13H13C13 11.896 12.105 11 11 11ZM14 16H18C18.553 16 19 16.447 19 17V21C19 21.553 18.553 22 18 22H13C6.925 22 2 17.075 2 11V6C2 5.447 2.448 5 3 5H7C7.553 5 8 5.447 8 6V10C8 10.553 7.553 11 7 11H6C6.063 14.938 9 18 13 18V17C13 16.447 13.447 16 14 16Z", // M11 5V3C16.515 3 21 7.486
    Group: "M14 8.00598C14 10.211 12.206 12.006 10 12.006C7.795 12.006 6 10.211 6 8.00598C6 5.80098 7.794 4.00598 10 4.00598C12.206 4.00598 14 5.80098 14 8.00598ZM2 19.006C2 15.473 5.29 13.006 10 13.006C14.711 13.006 18 15.473 18 19.006V20.006H2V19.006Z", // M14 8.00598C14 10.211 12.206 12.006
    Speaker: "M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00204H3C2.45 8.00204 2 8.45304 2 9.00204V15.002C2 15.552 2.45 16.002 3 16.002H6L10.293 20.71C10.579 20.996 11.009 21.082 11.383 20.927C11.757 20.772 12 20.407 12 20.002V4.00204C12 3.59904 11.757 3.23204 11.383 3.07904ZM14 5.00195V7.00195C16.757 7.00195 19 9.24595 19 12.002C19 14.759 16.757 17.002 14 17.002V19.002C17.86 19.002 21 15.863 21 12.002C21 8.14295 17.86 5.00195 14 5.00195ZM14 9.00195C15.654 9.00195 17 10.349 17 12.002C17 13.657 15.654 15.002 14 15.002V13.002C14.551 13.002 15 12.553 15 12.002C15 11.451 14.551 11.002 14 11.002V9.00195Z", // M11.383 3.07904C11.009 2.92504 10.579 3.01004
    Muted: "M6.7 11H5C5 12.19 5.34 13.3 5.9 14.28L7.13 13.05C6.86 12.43 6.7 11.74 6.7 11 M9.01 11.085C9.015 11.1125 9.02 11.14 9.02 11.17L15 5.18V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 11.03 9.005 11.0575 9.01 11.085 M11.7237 16.0927L10.9632 16.8531L10.2533 17.5688C10.4978 17.633 10.747 17.6839 11 17.72V22H13V17.72C16.28 17.23 19 14.41 19 11H17.3C17.3 14 14.76 16.1 12 16.1C11.9076 16.1 11.8155 16.0975 11.7237 16.0927 M21 4.27L19.73 3L3 19.73L4.27 21L8.46 16.82L9.69 15.58L11.35 13.92L14.99 10.28L21 4.27Z", // M6.7 11H5C5 12.19 5.34 13.3
    Deafened: "M6.16204 15.0065C6.10859 15.0022 6.05455 15 6 15H4V12C4 7.588 7.589 4 12 4C13.4809 4 14.8691 4.40439 16.0599 5.10859L17.5102 3.65835C15.9292 2.61064 14.0346 2 12 2C6.486 2 2 6.485 2 12V19.1685L6.16204 15.0065 M3.20101 23.6243L1.7868 22.2101L21.5858 2.41113L23 3.82535L3.20101 23.6243 M19.725 9.91686C19.9043 10.5813 20 11.2796 20 12V15H18C16.896 15 16 15.896 16 17V20C16 21.104 16.896 22 18 22H20C21.105 22 22 21.104 22 20V12C22 10.7075 21.7536 9.47149 21.3053 8.33658L19.725 9.91686Z", // M6.16204 15.0065C6.10859 15.0022 6.05455 15
    Video: "M21.526 8.149C21.231 7.966 20.862 7.951 20.553 8.105L18 9.382V7C18 5.897 17.103 5 16 5H4C2.897 5 2 5.897 2 7V17C2 18.104 2.897 19 4 19H16C17.103 19 18 18.104 18 17V14.618L20.553 15.894C20.694 15.965 20.847 16 21 16C21.183 16 21.365 15.949 21.526 15.851C21.82 15.668 22 15.347 22 15V9C22 8.653 21.82 8.332 21.526 8.149Z", // M21.526 8.149C21.231 7.966 20.862 7.951
    Stage: "M14 13C14 14.1 13.1 15 12 15C10.9 15 10 14.1 10 13C10 11.9 10.9 11 12 11C13.1 11 14 11.9 14 13ZM8.5 20V19.5C8.5 17.8 9.94 16.5 12 16.5C14.06 16.5 15.5 17.8 15.5 19.5V20H8.5ZM7 13C7 10.24 9.24 8 12 8C14.76 8 17 10.24 17 13C17 13.91 16.74 14.75 16.31 15.49L17.62 16.25C18.17 15.29 18.5 14.19 18.5 13C18.5 9.42 15.58 6.5 12 6.5C8.42 6.5 5.5 9.42 5.5 13C5.5 14.18 5.82 15.29 6.38 16.25L7.69 15.49C7.26 14.75 7 13.91 7 13ZM2.5 13C2.5 7.75 6.75 3.5 12 3.5C17.25 3.5 21.5 7.75 21.5 13C21.5 14.73 21.03 16.35 20.22 17.75L21.51 18.5C22.45 16.88 23 15 23 13C23 6.93 18.07 2 12 2C5.93 2 1 6.93 1 13C1 15 1.55 16.88 2.48 18.49L3.77 17.74C2.97 16.35 2.5 14.73 2.5 13Z", // M14 13C14 14.1 13.1 15 12 15C10.9 15 10 14.1 10 13C10 11.9 10.9 11 12 11C13.1 11 14 11.9 14 13ZM8.5 20V19.5C8.5
    Locked: "M6.5 8.33325C6.5 6.87456 7.07946 5.47561 8.11091 4.44416C9.14236 3.41271 10.5413 2.83325 12 2.83325C13.4587 2.83325 14.8576 3.41271 15.8891 4.44416C16.9205 5.47561 17.5 6.87456 17.5 8.33325H18.4167C18.9029 8.33325 19.3692 8.52641 19.713 8.87022C20.0568 9.21404 20.25 9.68036 20.25 10.1666V19.3333C20.25 19.8195 20.0568 20.2858 19.713 20.6296C19.3692 20.9734 18.9029 21.1666 18.4167 21.1666H5.58333C5.0971 21.1666 4.63079 20.9734 4.28697 20.6296C3.94315 20.2858 3.75 19.8195 3.75 19.3333V10.1666C3.75 9.68036 3.94315 9.21404 4.28697 8.87022C4.63079 8.52641 5.0971 8.33325 5.58333 8.33325H6.5ZM12 4.66659C12.9725 4.66659 13.9051 5.05289 14.5927 5.74053C15.2804 6.42816 15.6667 7.36079 15.6667 8.33325H8.33333C8.33333 7.36079 8.71964 6.42816 9.40728 5.74053C10.0949 5.05289 11.0275 4.66659 12 4.66659ZM13.8333 13.8333C13.8333 14.1551 13.7486 14.4712 13.5877 14.7499C13.4268 15.0286 13.1954 15.26 12.9167 15.4209V16.5833C12.9167 16.8264 12.8201 17.0595 12.6482 17.2314C12.4763 17.4033 12.2431 17.4999 12 17.4999C11.7569 17.4999 11.5237 17.4033 11.3518 17.2314C11.1799 17.0595 11.0833 16.8264 11.0833 16.5833V15.4209C10.7338 15.2191 10.4607 14.9076 10.3063 14.5348C10.1519 14.1619 10.1248 13.7486 10.2292 13.3587C10.3337 12.9689 10.5638 12.6245 10.884 12.3788C11.2042 12.1331 11.5964 11.9999 12 11.9999C12.4862 11.9999 12.9525 12.1931 13.2964 12.5369C13.6402 12.8807 13.8333 13.347 13.8333 13.8333Z"
};
