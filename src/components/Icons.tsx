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

import "./iconStyles.css";

import { getTheme, Theme } from "@utils/discord";
import { classes } from "@utils/misc";
import { i18n } from "@webpack/common";
import type { JSX, PropsWithChildren } from "react";

interface BaseIconProps extends IconProps {
    viewBox: string;
}

type IconProps = JSX.IntrinsicElements["svg"];
type ImageProps = JSX.IntrinsicElements["img"];

const Icon = ({ height = 24, width = 24, className, children, viewBox, ...svgProps }: PropsWithChildren<BaseIconProps>) => (
    <svg
        className={classes(className, "vc-icon")}
        role="img"
        width={width}
        height={height}
        viewBox={viewBox}
        {...svgProps}
    >
        {children}
    </svg>
);

/**
 * Discord's link icon, as seen in the Message context menu "Copy Message Link" option
 */
export const LinkIcon = ({ height = 24, width = 24, className }: IconProps) => (
    <Icon
        className={classes(className, "vc-link-icon")}
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z" />
    </Icon>
);

/**
 * Discord's copy icon, as seen in the user panel popout on the right of the username and in large code blocks
 */
export const CopyIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-copy-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M3 16a1 1 0 0 1-1-1v-5a8 8 0 0 1 8-8h5a1 1 0 0 1 1 1v.5a.5.5 0 0 1-.5.5H10a6 6 0 0 0-6 6v5.5a.5.5 0 0 1-.5.5H3Zm3 2a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4h-3a5 5 0 0 1-5-5V6h-4a4 4 0 0 0-4 4v8Zm15.73-6a3 3 0 0 0-.6-.88l-4.25-4.24a3 3 0 0 0-.88-.61V9a3 3 0 0 0 3 3h2.73Z" />
    </Icon>
);

/**
 * Discord's open external icon, as seen in the user profile connections
 */
export const OpenExternalIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-open-external-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M13 20h-2V8l-5.5 5.5-1.42-1.42L12 4.16l7.92 7.92-1.42 1.42L13 8z" />
    </Icon>
);

export const ImageIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-image-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </Icon>
);

export const InfoIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-info-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M11 9h2V7h-2v2Zm1 11c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm0-18C6.4771525 2 2 6.4771525 2 12c0 2.6521649 1.0535684 5.195704 2.92893219 7.0710678C6.80429597 20.9464316 9.3478351 22 12 22s5.195704-1.0535684 7.0710678-2.9289322C20.9464316 17.195704 22 14.6521649 22 12s-1.0535684-5.19570403-2.9289322-7.07106781C17.195704 3.0535684 14.6521649 2 12 2Zm-1 15h2v-6h-2v6Z" />
    </Icon>
);

export const OwnerCrownIcon = (props: IconProps) => (
    <Icon
        aria-label={i18n.Messages.GUILD_OWNER}
        {...props}
        className={classes(props.className, "vc-owner-crown-icon")}
        role="img"
        viewBox="0 0 16 16"
        fill="currentColor"
    >
        <path d="M13.6572 5.42868c.2307-.13866.5234-.12466.7401.036.216.16134.3146.436.25.69734l-1.3334 5.33338c-.0746.2973-.3413.5053-.6473.5053H3.33325c-.306 0-.57267-.2087-.64733-.5053L1.35258 6.16202c-.06466-.26134.034-.536.25-.69734.21734-.16.50934-.174.74067-.036l2.78867 1.67334 2.314-3.47134c.01581-.02371.03785-.03938.05996-.05509.01332-.00947.02667-.01896.0387-.03024l-.642-.64267c-.12933-.12933-.12933-.342 0-.47133l.862-.862c.12934-.12933.342-.12933.47134 0l.862.862c.12933.12933.12933.342 0 .47133l-.642.64267c.01202.01151.02562.02116.03924.03083.02187.01552.04381.03109.05942.0545l2.31402 3.47134 2.7886-1.67334ZM2.66667 12.6673H13.3333v1.3334H2.66667v-1.3334Z" />
    </Icon>
);

/**
 * Discord's screenshare icon, as seen in the connection panel
 */
export const ScreenshareIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-screenshare-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M2 4.5c0-1.103.897-2 2-2h16c1.103 0 2 .897 2 2v11c0 1.104-.897 2-2 2h-7v2h4v2H7v-2h4v-2H4c-1.103 0-2-.896-2-2v-11Zm11.2 9.8375V11.6c-3.336 0-5.532 1.0625-7.2 3.4.672-3.3375 2.532-6.6625 7.2-7.3375V5L18 9.6625l-4.8 4.675Z" />
    </Icon>
);

export const ImageVisible = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-image-visible")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21Zm0-2h14V5H5v14Zm1-2h12l-3.75-5-3 4L9 13Zm-1 2V5v14Z" />
    </Icon>
);

export const ImageInvisible = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-image-invisible")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="m21 18.15-2-2V5H7.85l-2-2H19q.825 0 1.413.587Q21 4.175 21 5Zm-1.2 4.45L18.2 21H5q-.825 0-1.413-.587Q3 19.825 3 19V5.8L1.4 4.2l1.4-1.4 18.4 18.4ZM6 17l3-4 2.25 3 .825-1.1L5 7.825V19h11.175l-2-2Zm7.425-6.425ZM10.6 13.4Z" />
    </Icon>
);

export const Microphone = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-microphone")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M14.99 11c0 1.66-1.33 3-2.99 3-1.66 0-3-1.34-3-3V5c0-1.66 1.34-3 3-3s3 1.34 3 3l-.01 6ZM12 16.1c2.76 0 5.3-2.1 5.3-5.1H19c0 3.42-2.72 6.24-6 6.72V22h-2v-4.28c-3.28-.49-6-3.31-6-6.72h1.7c0 3 2.54 5.1 5.3 5.1Z" />
    </Icon>
);

export const CogWheel = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-cog-wheel")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M19.738 10H22v4h-2.261c-.241.931-.639 1.798-1.174 2.564L20 18l-2 2-1.435-1.436c-.768.535-1.633.934-2.565 1.174V22h-4v-2.262c-.931-.24-1.797-.639-2.564-1.174L6 20l-2-2 1.436-1.436c-.535-.765-.934-1.632-1.174-2.564H2v-4h2.262c.24-.932.638-1.798 1.174-2.564L4 6l2-2 1.436 1.436C8.202 4.9 9.068 4.502 10 4.262V2h4v2.261c.932.241 1.797.639 2.565 1.174L18 3.999l2 2-1.436 1.437c.535.766.934 1.633 1.174 2.564ZM12 16c2.2091 0 4-1.7909 4-4 0-2.20914-1.7909-4-4-4-2.20914 0-4 1.79086-4 4 0 2.2091 1.79086 4 4 4Z" />
    </Icon>
);

export const ReplyIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-reply-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M10 8.26667V4l-7 7.4667 7 7.4666V14.56c5 0 8.5 1.7067 11 5.44-1-5.3333-4-10.66667-11-11.73333Z" />
    </Icon>
);

export const DeleteIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-delete-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M15 3.999V2H9v1.999H3v2h18v-2h-6ZM5 6.99902V18.999c0 1.102.897 2 2 2h10c1.103 0 2-.898 2-2V6.99902H5ZM11 17H9v-6h2v6Zm4 0h-2v-6h2v6Z" />
    </Icon>
);

export const PlusIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-plus-icon")}
        viewBox="0 0 18 18"
        fill="currentColor"
    >
        <path d="M15 10h-5v5H8v-5H3V8h5V3h2v5h5z" />
    </Icon>
);

export const NoEntrySignIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-no-entry-sign-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" />
    </Icon>
);

export const SafetyIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-safety-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M4.27 5.22A2.66 2.66 0 0 0 3 7.5v2.3c0 5.6 3.3 10.68 8.42 12.95.37.17.79.17 1.16 0A14.18 14.18 0 0 0 21 9.78V7.5c0-.93-.48-1.78-1.27-2.27l-6.17-3.76a3 3 0 0 0-3.12 0L4.27 5.22ZM6 7.68l6-3.66V12H6.22C6.08 11.28 6 10.54 6 9.78v-2.1Zm6 12.01V12h5.78A11.19 11.19 0 0 1 12 19.7Z" />
    </Icon>
);

export const NotesIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-notes-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
        fillRule="evenodd"
    >
        <path d="M8 3c-.55229 0-1 .44772-1 1v1c0 .55228.44772 1 1 1h8c.5523 0 1-.44772 1-1V4c0-.55228-.4477-1-1-1h-.8755c-.3957 0-.771-.17576-1.0243-.47975l-.7334-.88007C13.0288 1.23454 12.528 1 12 1s-1.0288.23454-1.3668.64018l-.7334.88007C9.64647 2.82424 9.27121 3 8.8755 3H8Zm11 1.49996v.5c0 1.65685-1.3431 3-3 3H8c-1.65685 0-3-1.34315-3-3v-.5c0-.27614-.22554-.50437-.49791-.45887C3.08221 4.27826 2 5.51273 2 6.99996V19c0 1.6568 1.34315 3 3 3h14c1.6569 0 3-1.3432 3-3V6.99996c0-1.48723-1.0822-2.7217-2.5021-2.95887-.2724-.0455-.4979.18273-.4979.45887ZM8 12c-.55228 0-1 .4477-1 1 0 .5522.44772 1 1 1h8c.5523 0 1-.4478 1-1 0-.5523-.4477-1-1-1H8Zm-1 5c0-.5523.44772-1 1-1h5c.5523 0 1 .4477 1 1 0 .5522-.4477 1-1 1H8c-.55228 0-1-.4478-1-1Z" />
    </Icon>
);

export const FolderIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-folder-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M2 5a3 3 0 0 1 3-3h3.93a2 2 0 0 1 1.66.9L12 5h7a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5Z" />
    </Icon>
);

export const LogIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-log-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
        fillRule="evenodd"
    >
        <path d="M3.11 8H6v10.82c0 .86.37 1.68 1 2.27.46.43 1.02.71 1.63.84A1 1 0 0 0 9 22h10a4 4 0 0 0 4-4v-1a2 2 0 0 0-2-2h-1V5a3 3 0 0 0-3-3H4.67c-.87 0-1.7.32-2.34.9-.63.6-1 1.42-1 2.28 0 .71.3 1.35.52 1.75a5.35 5.35 0 0 0 .48.7l.01.01h.01L3.11 7l-.76.65a1 1 0 0 0 .76.35Zm1.56-4c-.38 0-.72.14-.97.37-.24.23-.37.52-.37.81a1.69 1.69 0 0 0 .3.82H6v-.83c0-.29-.13-.58-.37-.8C5.4 4.14 5.04 4 4.67 4Zm5 13a3.58 3.58 0 0 1 0 3H19a2 2 0 0 0 2-2v-1H9.66ZM3.86 6.35ZM11 8a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2h-5Zm-1 5a1 1 0 0 1 1-1h5a1 1 0 1 1 0 2h-5a1 1 0 0 1-1-1Z" />
    </Icon>
);

export const RestartIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-restart-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M4 12a8 8 0 0 1 14.93-4H15a1 1 0 1 0 0 2h6a1 1 0 0 0 1-1V3a1 1 0 1 0-2 0v3a9.98 9.98 0 0 0-18 6 10 10 0 0 0 16.29 7.78 1 1 0 0 0-1.26-1.56A8 8 0 0 1 4 12Z" />
    </Icon>
);

export const PaintbrushIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-paintbrush-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M15.35 7.24C15.9 6.67 16 5.8 16 5a3 3 0 1 1 3 3c-.8 0-1.67.09-2.24.65a1.5 1.5 0 0 0 0 2.11l1.12 1.12a3 3 0 0 1 0 4.24l-5 5a3 3 0 0 1-4.25 0l-5.76-5.75a3 3 0 0 1 0-4.24l4.04-4.04.97-.97a3 3 0 0 1 4.24 0l1.12 1.12c.58.58 1.52.58 2.1 0ZM6.9 9.9l-2.6 2.64a1 1 0 0 0 0 1.42l2.17 2.17.83-.84a1 1 0 0 1 1.42 1.42l-.84.83.59.59 1.83-1.84a1 1 0 0 1 1.42 1.42l-1.84 1.83.17.17a1 1 0 0 0 1.42 0l2.63-2.62L6.9 9.9Z" />
    </Icon>
);

export const PencilIcon = (props: IconProps) => (
    <Icon
        {...props}
        className={classes(props.className, "vc-pencil-icon")}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" />
    </Icon>
);

const WebsiteIconDark = "/assets/e1e96d89e192de1997f73730db26e94f.svg";
const WebsiteIconLight = "/assets/730f58bcfd5a57a5e22460c445a0c6cf.svg";
const GithubIconLight = "/assets/3ff98ad75ac94fa883af5ed62d17c459.svg";
const GithubIconDark = "/assets/6a853b4c87fce386cbfef4a2efbacb09.svg";

export function GithubIcon(props: ImageProps) {
    const src = getTheme() === Theme.Light
        ? GithubIconLight
        : GithubIconDark;

    return <img {...props} src={src} />;
}

export function WebsiteIcon(props: ImageProps) {
    const src = getTheme() === Theme.Light
        ? WebsiteIconLight
        : WebsiteIconDark;

    return <img {...props} src={src} />;
}
