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
import { fakeD } from "../fakeDeafen";
import { replacedUserPanelComponent } from "@plugins/philsPluginLibrary/patches";

export default definePlugin({
    name: "PhilsPluginLibrary",
    description: "A library for phil's plugins",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    patches: [
        {
            find: '"--custom-app-panels-height",',
            replacement: {
                match: /{}\)}\),/,
                replace: "{})}),$self.replacedUserPanelComponent(),"
            }
        },
        {
            find: "Unknown frame rate",
            replacement: [
                {
                    match: /(switch\((.{0,10})\).{0,1000})(throw Error\(.{0,100}?Unknown resolution.{0,100}?\))(?=})/,
                    replace: "$1return $2"
                },
                {
                    match: /(switch\((.{0,10})\).{0,1000})(throw Error\(.{0,100}?Unknown frame rate.{0,100}?\))(?=})/,
                    replace: "$1return $2"
                }
            ]
        }
    ],
    replacedUserPanelComponent
});

export const DeafenIcon = (props: React.ComponentProps<"svg">) => {
    const isFakeD = fakeD;
    return (
        <svg
            aria-hidden="true"
            role="img"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            {isFakeD ? (
                <>
                    {
                        <><path d="M6.16204 15.0065C6.10859 15.0022 6.05455 15 6 15H4V12C4 7.588 7.589 4 12 4C13.4809 4 14.8691 4.40439 16.0599 5.10859L17.5102 3.65835C15.9292 2.61064 14.0346 2 12 2C6.486 2 2 6.485 2 12V19.1685L6.16204 15.0065Z" fill="#b5bac1"></path><path d="M19.725 9.91686C19.9043 10.5813 20 11.2796 20 12V15H18C16.896 15 16 15.896 16 17V20C16 21.104 16.896 22 18 22H20C21.105 22 22 21.104 22 20V12C22 10.7075 21.7536 9.47149 21.3053 8.33658L19.725 9.91686Z" fill="#b5bac1"></path><path d="M3.20101 23.6243L1.7868 22.2101L21.5858 2.41113L23 3.82535L3.20101 23.6243Z" fill="#b5bac1"></path></>
                    }
                </>
            ) : (
                <>
                    {
                        <><svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2.00305C6.486 2.00305 2 6.48805 2 12.0031V20.0031C2 21.1071 2.895 22.0031 4 22.0031H6C7.104 22.0031 8 21.1071 8 20.0031V17.0031C8 15.8991 7.104 15.0031 6 15.0031H4V12.0031C4 7.59105 7.589 4.00305 12 4.00305C16.411 4.00305 20 7.59105 20 12.0031V15.0031H18C16.896 15.0031 16 15.8991 16 17.0031V20.0031C16 21.1071 16.896 22.0031 18 22.0031H20C21.104 22.0031 22 21.1071 22 20.0031V12.0031C22 6.48805 17.514 2.00305 12 2.00305Z" fill="#b5bac1"></path></svg></>
                    }
                </>
            )}
        </svg>
    );
};
export const CameraSettingsIcon =
    (props: React.ComponentProps<"svg">) =>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1000"
            height="1000"
            viewBox="0 0 1000 1000"
            {...props}
        >
            <defs>
                <mask id="m">
                    <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M21.526 8.149a1 1 0 00-.973-.044L18 9.382V7c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v10c0 1.104.897 2 2 2h12c1.103 0 2-.896 2-2v-2.382l2.553 1.276a.992.992 0 00.973-.043c.294-.183.474-.504.474-.851V9c0-.347-.18-.668-.474-.851z"
                        transform="translate(586.527 617.666) scale(41.3472) translate(-12 -12)"
                        vectorEffect="non-scaling-stroke"
                    ></path>
                    <path
                        fill="#000"
                        strokeWidth="0"
                        // Circle
                        d="M132.5 67.5c0 35.899-29.101 65-65 65-35.898 0-65-29.101-65-65 0-35.898 29.102-65 65-65 35.899 0 65 29.102 65 65z"
                        transform="translate(229.14 230.807) scale(4.9157) translate(-67.5 -67.5)"
                        vectorEffect="non-scaling-stroke"
                    ></path>
                </mask>
            </defs>
            <rect width="100%" height="100%" fill="#fff" mask="url(#m)"></rect>
            <path
                fill="currentColor"
                fillRule="evenodd"
                strokeWidth="0"
                // Settings Icon
                d="M19.738 10H22v4h-2.261a7.952 7.952 0 01-1.174 2.564L20 18l-2 2-1.435-1.436A7.946 7.946 0 0114 19.738V22h-4v-2.262a7.94 7.94 0 01-2.564-1.174L6 20l-2-2 1.436-1.436A7.911 7.911 0 014.262 14H2v-4h2.262a7.9 7.9 0 011.174-2.564L4 6l2-2 1.436 1.436A7.9 7.9 0 0110 4.262V2h4v2.261a7.967 7.967 0 012.565 1.174L18 3.999l2 2-1.436 1.437A7.93 7.93 0 0119.738 10zM12 16a4 4 0 100-8 4 4 0 000 8z"
                transform="translate(229.812 230.81) scale(23.0217) translate(-12 -12)"
                vectorEffect="non-scaling-stroke"
            ></path>
        </svg>;
const MuteIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M16.5 12C16.5 10.62 15.88 9.39 14.94 8.59L16.36 7.17C18.04 8.42 19.2 10.11 19.2 12C19.2 13.89 18.04 15.58 16.36 16.83L14.94 15.41C15.88 14.61 16.5 13.38 16.5 12ZM4.27 3L3 4.27L7.73 9H4C2.9 9 2 9.9 2 11V13C2 14.1 2.9 15 4 15H7.73L12.73 20L14 18.73L4.27 3ZM12 6.17L14 8.17V7C14 5.9 13.1 5 12 5H9.82L12 7.17ZM12 17.83L9.82 15.66H12C13.1 15.66 14 14.76 14 13.66V12.83L12 14.83V17.83Z" />
    </svg>
);

export * from "./components";
export * from "./discordModules";
export * from "./emitter";
export * from "./icons";
export * from "./patchers";
export * from "./patches";
export * from "./store";
export * as types from "./types";
export * from "./utils";
