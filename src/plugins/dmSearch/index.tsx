/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { ReactNode } from "react";

import { Overlay } from "./components/Overlay";
import { settings } from "./settings";

export default definePlugin({
    name: "DMSearch",
    description: "Adds a global DM and Groups search to the Quick Switcher (Ctrl+K) with Messages, Media, Pins, Links and Files tabs.",
    authors: [Devs.QDave],
    tags: ["Chat", "Utility", "Shortcuts"],
    settings,

    patches: [
        {
            find: '"QUICK_SWITCHER_MODAL_KEY"',
            replacement: {
                match: /\[this\.renderInput\(\),this\.renderResults\(\),this\.renderProtip\(\),this\.renderTutorial\(\)\]/,
                replace: '[this.renderInput(),$self.render_overlay(this.state?.query??"",this.props?.results?.length??0,this.renderResults(),this.renderProtip(),this.renderTutorial())]'
            }
        }
    ],

    render_overlay(query: string, discord_matches: number, default_results: ReactNode, protip: ReactNode, tutorial: ReactNode) {
        return (
            <ErrorBoundary noop>
                <Overlay
                    key="dms-overlay"
                    query={query}
                    discord_matches={discord_matches}
                    default_results={default_results}
                    protip={protip}
                    tutorial={tutorial}
                />
            </ErrorBoundary>
        );
    }
});
