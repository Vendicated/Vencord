/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./LinkIconButton.css";

import { MaskedLink, Tooltip } from "@webpack/common";
import type { ComponentType } from "react";

import { GithubIcon, WebsiteIcon } from "..";

export const GithubLinkIcon = () => (
    <GithubIcon aria-hidden className="vc-settings-modal-link-icon" />
);

export const WebsiteLinkIcon = () => (
    <WebsiteIcon aria-hidden className="vc-settings-modal-link-icon" />
);

interface Props {
    text: string;
    href: string;
}

const LinkIcon = ({ text, href, Icon }: Props & { Icon: ComponentType; }) => (
    <Tooltip text={text}>
        {props => (
            <MaskedLink {...props} href={href}>
                <Icon />
            </MaskedLink>
        )}
    </Tooltip>
);

export const WebsiteButton = (props: Props) => <LinkIcon {...props} Icon={WebsiteLinkIcon} />;
export const GithubButton = (props: Props) => <LinkIcon {...props} Icon={GithubLinkIcon} />;
