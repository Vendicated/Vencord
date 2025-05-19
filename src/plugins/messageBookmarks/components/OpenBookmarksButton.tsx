/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findComponentByCodeLazy } from "@webpack";

import { openBookmarksModal } from "../modals/BookmarksModal";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

export function BookmarkIcon() {
    return (
        <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="0"
            viewBox="0 0 24 24"
            height={24}
            width={24}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                fill="currentColor"
                d="M6 4c-1.1 0-2 .9-2 2v14l8-3.5 8 3.5V6c0-1.1-.9-2-2-2H6z"
            />
        </svg>
    );
}

export function OpenBookmarksButton() {
    return (
        <HeaderBarIcon
            className="vc-bookmark-button"
            onClick={() => openBookmarksModal()}
            tooltip={"Open Bookmarks"}
            icon={BookmarkIcon}
        />
    );
}
