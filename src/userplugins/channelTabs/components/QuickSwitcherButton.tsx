/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps, LazyComponentWebpack } from "@webpack";
import { FluxDispatcher, React } from "@webpack/common";

import { channelTabsSettings as settings } from "../util";
import { clab } from "./TitleBar";

const CompassIcon = LazyComponentWebpack(() => {
    const component = findByProps("CompassIcon").CompassIcon;
    return React.memo(component);
});

export default function ChannelsTabsContainer() {
    const { showQuickSwitcher } = settings.use(["showQuickSwitcher"]);
    return <>
        {showQuickSwitcher && <button
            onClick={() => FluxDispatcher.dispatch({
                type: "QUICKSWITCHER_SHOW",
                query: "",
                queryMode: null
            })}
            className={clab("quick-switcher")}
        >
            <CompassIcon height={20} width={20} />
        </button>}
    </>;
}
