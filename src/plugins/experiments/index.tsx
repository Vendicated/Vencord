/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { ErrorCard } from "@components/ErrorCard";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy } from "@webpack";
import { Forms, React } from "@webpack/common";

import hideBugReport from "./hideBugReport.css?managed";

const KbdStyles = findByPropsLazy("key", "combo");
const BugReporterExperiment = findLazy(m => m?.definition?.id === "2024-09_bug_reporter");

const isMacOS = navigator.platform.includes("Mac");
const modKey = isMacOS ? "cmd" : "ctrl";
const altKey = isMacOS ? "opt" : "alt";

const settings = definePluginSettings({
    toolbarDevMenu: {
        type: OptionType.BOOLEAN,
        description: "Change the Help (?) toolbar button (top right in chat) to Discord's developer menu",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "Experiments",
    description: "Enable Access to Experiments & other dev-only features in Discord!",
    authors: [
        Devs.Megu,
        Devs.Ven,
        Devs.Nickyux,
        Devs.BanTheNons,
        Devs.Nuckyz,
    ],

    settings,

    patches: [
        {
            find: "Object.defineProperties(this,{isDeveloper",
            replacement: {
                match: /(?<={isDeveloper:\{[^}]+?,get:\(\)=>)\i/,
                replace: "true"
            }
        },
        {
            find: 'type:"user",revision',
            replacement: {
                match: /!(\i)(?=&&"CONNECTION_OPEN")/,
                replace: "!($1=true)"
            }
        },
        {
            find: 'H1,title:"Experiments"',
            replacement: {
                match: 'title:"Experiments",children:[',
                replace: "$&$self.WarningCard(),"
            }
        },
        // Change top right chat toolbar button from the help one to the dev one
        {
            find: '"M9 3v18"',
            replacement: {
                match: /hasBugReporterAccess:(\i)/,
                replace: "_hasBugReporterAccess:$1=true"
            },
            predicate: () => settings.store.toolbarDevMenu
        },

        // Make the Favourites Server experiment allow favouriting DMs and threads
        {
            find: "useCanFavoriteChannel",
            replacement: {
                match: /\i\.isDM\(\)\|\|\i\.isThread\(\)/,
                replace: "false",
            }
        },
        // Enable option to always record clips even if you are not streaming
        {
            find: "isDecoupledGameClippingEnabled(){",
            replacement: {
                match: /\i\.isStaff\(\)/,
                replace: "true"
            }
        },

        // Enable experiment embed on sent experiment links
        {
            find: "dev://experiment/",
            replacement: [
                {
                    match: /\i\.isStaff\(\)/,
                    replace: "true"
                },
                // Fix some tricky experiments name causing a client crash
                {
                    match: /.getRegisteredExperiments\(\)(?<=(\i)=.+?).+?if\(null==(\i)(?=\)return null;)/,
                    replace: "$&||!Object.hasOwn($1,$2)"
                }
            ]
        },
    ],

    start: () => !BugReporterExperiment.getCurrentConfig().hasBugReporterAccess && enableStyle(hideBugReport),
    stop: () => disableStyle(hideBugReport),

    settingsAboutComponent: () => {
        return (
            <React.Fragment>
                <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    You can open Discord's DevTools via {" "}
                    <div className={KbdStyles.combo} style={{ display: "inline-flex" }}>
                        <kbd className={KbdStyles.key}>{modKey}</kbd> +{" "}
                        <kbd className={KbdStyles.key}>{altKey}</kbd> +{" "}
                        <kbd className={KbdStyles.key}>O</kbd>{" "}
                    </div>
                </Forms.FormText>
            </React.Fragment>
        );
    },

    WarningCard: ErrorBoundary.wrap(() => (
        <ErrorCard id="vc-experiments-warning-card" className={Margins.bottom16}>
            <Forms.FormTitle tag="h2">Hold on!!</Forms.FormTitle>

            <Forms.FormText>
                Experiments are unreleased Discord features. They might not work, or even break your client or get your account disabled.
            </Forms.FormText>

            <Forms.FormText className={Margins.top8}>
                Only use experiments if you know what you're doing. Vencord is not responsible for any damage caused by enabling experiments.

                If you don't know what an experiment does, ignore it. Do not ask us what experiments do either, we probably don't know.
            </Forms.FormText>

            <Forms.FormText className={Margins.top8}>
                No, you cannot use server-side features like checking the "Send to Client" box.
            </Forms.FormText>
        </ErrorCard>
    ), { noop: true })
});
