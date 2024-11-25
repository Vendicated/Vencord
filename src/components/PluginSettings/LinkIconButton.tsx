/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./LinkIconButton.css";

import { getTheme, Theme } from "@utils/discord";
import { MaskedLink, Tooltip } from "@webpack/common";

import { GithubIcon, WebsiteIcon } from "..";

export function GithubLinkIcon() {
    const theme = getTheme() === Theme.Light ? "#000000" : "#FFFFFF";
    return <GithubIcon aria-hidden fill={theme} className={"vc-settings-modal-link-icon"} />;
}

export function WebsiteLinkIcon() {
    const theme = getTheme() === Theme.Light ? "#000000" : "#FFFFFF";
    return <WebsiteIcon aria-hidden fill={theme} className={"vc-settings-modal-link-icon"} />;
}

interface Props {
    text: string;
    href: string;
}

function LinkIcon({ text, href, Icon }: Props & { Icon: React.ComponentType; }) {
    return (
        <Tooltip text={text}>
            {props => (
                <MaskedLink {...props} href={href}>
                    <Icon />
                </MaskedLink>
            )}
        </Tooltip>
    );
}

export const WebsiteButton = (props: Props) => <LinkIcon {...props} Icon={WebsiteLinkIcon} />;
export const GithubButton = (props: Props) => <LinkIcon {...props} Icon={GithubLinkIcon} />;
