/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MaskedLinkStore, Tooltip } from "@webpack/common";

import { Badge } from "../entities";
import { cl } from "../utils";

export default function ReviewBadge(badge: Badge) {
    return (
        <Tooltip
            text={badge.name}>
            {({ onMouseEnter, onMouseLeave }) => (
                <img
                    className={cl("badge")}
                    width="24px"
                    height="24px"
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    src={badge.icon}
                    alt={badge.description}
                    onClick={() =>
                        MaskedLinkStore.openUntrustedLink({
                            href: badge.redirectURL,
                        })
                    }
                />
            )}
        </Tooltip>
    );
}
