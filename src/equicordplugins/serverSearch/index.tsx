/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";
import { Tooltip } from "webpack/common/components";

function SearchIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" id="vc-searchbutton-icon">
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

    renderButton() {
        return <ErrorBoundary noop>
            <div id="vc-searchbutton-container">
                <Tooltip text="Search" position="right">
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div
                            id="vc-searchbutton"
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onClick={() =>
                                FluxDispatcher.dispatch({
                                    type: "QUICKSWITCHER_SHOW",
                                    query: "",
                                    queryMode: null
                                })
                            }>
                            <SearchIcon />
                        </div>
                    )}
                </Tooltip>
            </div>
        </ErrorBoundary>;
    },

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderButton);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderButton);
    }
});
