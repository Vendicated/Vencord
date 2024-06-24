/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";

const openPopout = findByCodeLazy(".QUICKSWITCHER_OPENED,{");
function SearchIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                fill-rule="evenodd"
                d="M15.62 17.03a9 9 0 1 1 1.41-1.41l4.68 4.67a1 1 0 0 1-1.421.42l-4.67-4.68ZM17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                clip-rule="evenodd"></path>
        </svg>
    );
}

export default definePlugin({
    name: "ServerSearch",
    authors: [EquicordDevs.camila314],
    description: "Navigate your servers better with a quick search button",
    patches: [
        {
            find: ".guildSeparator",
            replacement: {
                match: /return(\(0,.+?}\)}\))/,
                replace: "return $self.insertSearch(() => $1)"
            }
        },
        {
            find: "__invalid_circleButtonMask",
            replacement: {
                match: /let (\i)=(\i)\.forwardRef/,
                replace: "let $1 = $self.BigComponent = $2.forwardRef"
            }
        },
    ],

    insertSearch(Elem) {
        return (<>
            <this.BigComponent
                id="search-btn"
                showPill={true}
                tooltip="Search"
                icon={() => <SearchIcon />}
                onClick={() => openPopout("DM_SEARCH")}
                search={true}
            />

            <Elem />
        </>);
    }
});
