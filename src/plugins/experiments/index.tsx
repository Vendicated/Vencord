/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { ErrorCard } from "@components/ErrorCard";
import { HeadingPrimary, HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs, IS_MAC } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy } from "@webpack";
import { React } from "@webpack/common";

import hideBugReport from "./hideBugReport.css?managed";

const KbdStyles = findByPropsLazy("key", "combo");
const BugReporterExperiment = findLazy(m => m?.definition?.id === "2024-09_bug_reporter");

const modKey = IS_MAC ? "cmd" : "ctrl";
const altKey = IS_MAC ? "opt" : "alt";

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
            find: 'placeholder:"Search experiments"',
            replacement: {
                match: /(?<=children:\[)(?=\(0,\i\.jsx?\)\(\i\.\i,{placeholder:"Search experiments")/,
                replace: "$self.WarningCard(),"
            }
        },
        // Change top right toolbar button from the help one to the dev one
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /hasBugReporterAccess:(\i)/,
                replace: "_hasBugReporterAccess:$1=true"
            },
            predicate: () => settings.store.toolbarDevMenu
        },
        // Disable opening the bug report menu when clicking the top right toolbar dev button
        {
            find: 'navId:"staff-help-popout"',
            replacement: {
                match: /(isShown.+?)onClick:\i/,
                replace: (_, rest) => `${rest}onClick:()=>{}`
            }
        },
        // Make the Favourites Server experiment allow favouriting DMs and threads
        {
            find: "useCanFavoriteChannel",
            replacement: {
                match: /\i\.isDM\(\)\|\|\i\.isThread\(\)/,
                replace: "false",
            }
        },
        // Enable experiment embed on sent experiment links
        {
            find: ".experimentOverride,children:",
            replacement: [
                {
                    match: /\i\.isStaff\(\)/,
                    replace: "true"
                },
                // Fix some tricky experiments name causing a client crash
                {
                    match: /\.isStaffPersonal\(\).+?if\(null==(\i)\|\|null==\i(?=\)return null;)/,
                    replace: "$&||({})[$1]!=null"
                }
            ]
        },
        // Fix another function which cases crashes with tricky experiment names and the experiment embed
        {
            find: "}getServerAssignment(",
            replacement: {
                match: /}getServerAssignment\((\i),\i,\i\){/,
                replace: "$&if($1==null)return;"
            }
        }
    ],

    start: () => !BugReporterExperiment.getCurrentConfig().hasBugReporterAccess && enableStyle(hideBugReport),
    stop: () => disableStyle(hideBugReport),

    settingsAboutComponent: () => {
        return (
            <React.Fragment>
                <HeadingSecondary>More Information</HeadingSecondary>
                <BaseText size="md">
                    You can open Discord's DevTools via {" "}
                    <div className={KbdStyles.combo} style={{ display: "inline-flex" }}>
                        <kbd className={KbdStyles.key}>{modKey}</kbd> +{" "}
                        <kbd className={KbdStyles.key}>{altKey}</kbd> +{" "}
                        <kbd className={KbdStyles.key}>O</kbd>{" "}
                    </div>
                </BaseText>
            </React.Fragment>
        );
    },

    WarningCard: ErrorBoundary.wrap(() => (
        <ErrorCard id="vc-experiments-warning-card" className={Margins.bottom16}>
            <HeadingPrimary>Hold on!!</HeadingPrimary>

            <Paragraph>
                Experiments are unreleased Discord features. They might not work, or even break your client or get your account disabled.
            </Paragraph>

            <Paragraph className={Margins.top8}>
                Only use experiments if you know what you're doing. Equicord is not responsible for any damage caused by enabling experiments.

                If you don't know what an experiment does, ignore it. Do not ask us what experiments do either, we probably don't know.
            </Paragraph>

            <Paragraph className={Margins.top8}>
                No, you cannot use server-side features like checking the "Send to Client" box.
            </Paragraph>
        </ErrorCard>
    ), { noop: true })
});
