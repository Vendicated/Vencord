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

export const ScreenshareSettingsIcon =
    (props: React.ComponentProps<"svg">) =>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1000"
            height="1000"
            viewBox="0 0 1000 1000"
            {...props}
        >
            <defs>
                <mask id="screenshareSettingsIconMask">
                    <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M2 4.5c0-1.103.897-2 2-2h16c1.103 0 2 .897 2 2v11c0 1.104-.897 2-2 2h-7v2h4v2H7v-2h4v-2H4c-1.103 0-2-.896-2-2v-11zm11.2 9.838V11.6c-3.336 0-5.532 1.063-7.2 3.4.672-3.338 2.532-6.662 7.2-7.338V5L18 9.662l-4.8 4.675z"
                        transform="matrix(43.2813 0 0 43.3063 567.187 588.59) translate(-12 -12)"
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
            <rect width="100%" height="100%" fill="#fff" mask="url(#screenshareSettingsIconMask)"></rect>
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

export const MicrophoneSettingsIcon =
    (props: React.ComponentProps<"svg">) =>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1000"
            height="1000"
            viewBox="0 0 1000 1000"
            {...props}
        >
            <defs>
                <mask id="microphoneSettingsIcon">
                    <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M14.99 11c0 1.66-1.33 3-2.99 3-1.66 0-3-1.34-3-3V5c0-1.66 1.34-3 3-3s3 1.34 3 3l-.01 6zM12 16.1c2.76 0 5.3-2.1 5.3-5.1H19c0 3.42-2.72 6.24-6 6.72V21h-2v-3.28c-3.28-.49-6-3.31-6-6.72h1.7c0 3 2.54 5.1 5.3 5.1zM12 4c-.8 0-1 .667-1 1v6c0 .333.2 1 1 1s1-.667 1-1V5c0-.333-.2-1-1-1z"
                        transform="translate(689.616 574.556) scale(48.6222) translate(0 -.417) scale(.8333) translate(-12 -11.5)"
                    ></path>
                    <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M14.99 11c0 1.66-1.33 3-2.99 3-1.66 0-3-1.34-3-3V5c0-1.66 1.34-3 3-3s3 1.34 3 3l-.01 6zM12 16.1c2.76 0 5.3-2.1 5.3-5.1H19c0 3.42-2.72 6.24-6 6.72V22h-2v-4.28c-3.28-.49-6-3.31-6-6.72h1.7c0 3 2.54 5.1 5.3 5.1z"
                        transform="translate(689.616 574.556) scale(48.6222) scale(.8333) translate(-12 -12)"
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
            <rect width="100%" height="100%" fill="#fff" mask="url(#microphoneSettingsIcon)"></rect>
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
