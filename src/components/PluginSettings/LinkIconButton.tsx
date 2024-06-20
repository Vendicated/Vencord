/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./LinkIconButton.css";

import { getTheme, Theme } from "@utils/discord";
import { MaskedLink, Tooltip } from "@webpack/common";

const WebsiteIconDark = "/assets/e1e96d89e192de1997f73730db26e94f.svg";
const WebsiteIconLight = "/assets/730f58bcfd5a57a5e22460c445a0c6cf.svg";
const GithubIconLight = "/assets/3ff98ad75ac94fa883af5ed62d17c459.svg";
const GithubIconDark = "/assets/6a853b4c87fce386cbfef4a2efbacb09.svg";

export function GithubIcon() {
    const src = getTheme() === Theme.Light ? GithubIconLight : GithubIconDark;
    return <img src={src} aria-hidden className={"vc-settings-modal-link-icon"} />;
}

export function WebsiteIcon() {
    const src = getTheme() === Theme.Light ? WebsiteIconLight : WebsiteIconDark;
    return <img src={src} aria-hidden className={"vc-settings-modal-link-icon"} />;
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

export const WebsiteButton = (props: Props) => <LinkIcon {...props} Icon={WebsiteIcon} />;
export const GithubButton = (props: Props) => <LinkIcon {...props} Icon={GithubIcon} />;
