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

import { DataStore } from "../api";
import { lazyWebpack } from "../utils";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { filters } from "../webpack";

interface MatchAndReplace {
    match: RegExp;
    replace: string;
}

/** Used to re-render the Registered Games tab to update how our button looks like */
const RunningGameStoreModule = lazyWebpack(filters.byProps("IgnoreActivities_reRenderGames"));

let ignoredActivitiesCache: string[] = [];

export default definePlugin({
    name: "IgnoreActivities",
    authors: [Devs.Nuckyz],
    description: "Ignore certain activities (like games) from showing up on your status. You can configure which ones are ignored from the Registered Games tab.",
    patches: [{
        find: ".Messages.SETTINGS_GAMES_OVERLAY_ON",
        replacement: [{
            match: /;(.\.renderOverlayToggle=function\(\).+?\)\)\)};)/,
            replace: (_, mod) => {
                /** Modify the renderOverlayToggle button to remove unneded stuff and render the component the way we want */
                const renderIgnoreActivitiesToggle = ([
                    /** Remove overlay warn related stuff */
                    { match: /,.{1,2}=.{1,2}\.overlayWarn/, replace: "" },
                    { match: /,.{1,2}=.{1,2}\?.{1,2}\.createElement\(.{1,20}Messages\.SETTINGS_GAMES_OVERLAY_WARNING.{1,100}null/, replace: "" },
                    /** Remove overlay status related stuff */
                    { match: /,.{1,2}=.{1,2}\?.{1,50}Messages\.SETTINGS_GAMES_OVERLAY_OFF/, replace: "" },
                    { match: /[^,]{1,2},[^,]{1,2}\.createElement\("div".{1,20}\(\)\.overlayStatusText.{1,5},.{1,5},/, replace: "" },
                    /** Change the method name to renderIgnoreActivitiesToggle */
                    { match: /renderOverlayToggle/, replace: "renderIgnoreActivitiesToggle" },
                    /** Create an easily accessable variable to use the game props and then replace the boolean to determine if the button is activated or not with our custom function  */
                    { match: /((.)=this\.props\.game)(.{1,70})=.{1,2}overlay/, replace: "$1,IgnoreActivities_gameProps=$2$3=Vencord.Plugins.plugins.IgnoreActivities.isActivityEnabled(IgnoreActivities_gameProps)" },
                    /** Change the handler for clicking the button */
                    { match: /.\.handleOverlayToggle/, replace: "() => Vencord.Plugins.plugins.IgnoreActivities.handleActivityToggle(IgnoreActivities_gameProps)" },
                    /** Change the button on component to our custom */
                    { match: /(\.createElement\()(.{2})\..(.{1,50}\.overlayToggleIconOn)/, replace: "$1$2.IgnoreActivities_toggleOn$3" },
                    /** Change the button off component to our custom */
                    { match: /(\.createElement\()(.{2})\..{1}(.{1,50}\.overlayToggleIconOff)/, replace: "$1$2.IgnoreActivities_toggleOff$3" },
                    /** Change the tooltip text */
                    { match: /text:.{2}\..\.Messages\.SETTINGS_GAMES_TOGGLE_OVERLAY/, replace: 'text:"Toggle Activity"' }
                ] as MatchAndReplace[])
                    .reduce((current, { match, replace }) => current.replace(match, replace), mod);

                /** Return the default renderOverlayToggle and our custom one */
                return `;${mod}${renderIgnoreActivitiesToggle}`;

            }
        }, {
            /** Render our ignore activity component */
            match: /(this.renderLastPlayed\(\)\),this.renderOverlayToggle\(\))/,
            replace: "$1,this.renderIgnoreActivitiesToggle()"
        }]
    }, {
        /** Patch the RunningGameStore to export the method to re-render the Registered Games tab */
        find: '.displayName="RunningGameStore"',
        replacement: {
            match: /(.:\(\)=>.{2})(.+function (.{2})\(\){.+\.dispatch\({type:"RUNNING_GAMES_CHANGE")/,
            replace: "$1,IgnoreActivities_reRenderGames:()=>$3$2"
        }
    }, {
        find: "M8.67872 19H11V21H7V23H17V21H13V19H20C21.103 19 22 18.104 22 17V6C22 5.89841 21.9924 5.79857 21.9777 5.70101L20 7.67872V15H12.6787L8.67872 19ZM13.1496 6H4V15H4.14961L2.00515 17.1445C2.00174 17.0967 2 17.0486 2 17V6C2 4.897 2.897 4 4 4H15.1496L13.1496 6Z",
        replacement: {
            match: /(.:\(\)=>.)(.+)(function (.)\(.{1,10}\.width.+\)\)\)})/,
            replace: (_, exports, restOfFunction, component) => {
                /** Modify the overlayToggleOff component to how we want */
                const renderIgnoreActivitiesToggleOff = ([
                    /** Change the method name to IgnoreActivities_toggleOffToExport */
                    { match: /function ./, replace: "function IgnoreActivities_toggleOffToExport" },
                    /** Change the svg path to our custom one */
                    { match: /M8.67872 19H11V21H7V23H17V21H13V19H20C21.103 19 22 18.104 22 17V6C22 5.89841 21.9924 5.79857 21.9777 5.70101L20 7.67872V15H12.6787L8.67872 19ZM13.1496 6H4V15H4.14961L2.00515 17.1445C2.00174 17.0967 2 17.0486 2 17V6C2 4.897 2.897 4 4 4H15.1496L13.1496 6Z/, replace: "M 16 8 C 7.664063 8 1.25 15.34375 1.25 15.34375 L 0.65625 16 L 1.25 16.65625 C 1.25 16.65625 7.097656 23.324219 14.875 23.9375 C 15.246094 23.984375 15.617188 24 16 24 C 16.382813 24 16.753906 23.984375 17.125 23.9375 C 24.902344 23.324219 30.75 16.65625 30.75 16.65625 L 31.34375 16 L 30.75 15.34375 C 30.75 15.34375 24.335938 8 16 8 Z M 16 10 C 18.203125 10 20.234375 10.601563 22 11.40625 C 22.636719 12.460938 23 13.675781 23 15 C 23 18.613281 20.289063 21.582031 16.78125 21.96875 C 16.761719 21.972656 16.738281 21.964844 16.71875 21.96875 C 16.480469 21.980469 16.242188 22 16 22 C 15.734375 22 15.476563 21.984375 15.21875 21.96875 C 11.710938 21.582031 9 18.613281 9 15 C 9 13.695313 9.351563 12.480469 9.96875 11.4375 L 9.9375 11.4375 C 11.71875 10.617188 13.773438 10 16 10 Z M 16 12 C 14.34375 12 13 13.34375 13 15 C 13 16.65625 14.34375 18 16 18 C 17.65625 18 19 16.65625 19 15 C 19 13.34375 17.65625 12 16 12 Z M 7.25 12.9375 C 7.09375 13.609375 7 14.285156 7 15 C 7 16.753906 7.5 18.394531 8.375 19.78125 C 5.855469 18.324219 4.105469 16.585938 3.53125 16 C 4.011719 15.507813 5.351563 14.203125 7.25 12.9375 Z M 24.75 12.9375 C 26.648438 14.203125 27.988281 15.507813 28.46875 16 C 27.894531 16.585938 26.144531 18.324219 23.625 19.78125 C 24.5 18.394531 25 16.753906 25 15 C 25 14.285156 24.90625 13.601563 24.75 12.9375 Z" },
                    /** Modify the view box to not cut our svg */
                    { match: /viewBox:"0 0 24 24"/, replace: 'viewBox:"0 0 32 26"' },
                    /** Change the rectangle coordinates to match the middle of our svg */
                    { match: /x:"2"/, replace: 'x:"3"' },
                    { match: /y:"20"/, replace: 'y:"26"' },
                ] as MatchAndReplace[])
                    .reduce((current, { match, replace }) => current.replace(match, replace), component);

                /** Export our custom svg */
                return `${exports},IgnoreActivities_toggleOff:()=>IgnoreActivities_toggleOffToExport${restOfFunction}${component}${renderIgnoreActivitiesToggleOff}`;
            }
        }
    }, {
        find: "M4 2.5C2.897 2.5 2 3.397 2 4.5V15.5C2 16.604 2.897 17.5 4 17.5H11V19.5H7V21.5H17V19.5H13V17.5H20C21.103 17.5 22 16.604 22 15.5V4.5C22 3.397 21.103 2.5 20 2.5H4ZM20 4.5V13.5H4V4.5H20Z",
        replacement: {
            match: /(.:\(\)=>.)(.+)(function (.)\(.{1,10}\.width.+\)\)})/,
            replace: (_, exports, restOfFunction, component) => {
                /** Modify the overlayToggleOn svg to how we want */
                const renderIgnoreActivitiesToggleOn = ([
                    /** Change the method name to IgnoreActivities_toggleOnToExport */
                    { match: /function ./, replace: "function IgnoreActivities_toggleOnToExport" },
                    /** Change the svg path to our custom one */
                    { match: /M4 2.5C2.897 2.5 2 3.397 2 4.5V15.5C2 16.604 2.897 17.5 4 17.5H11V19.5H7V21.5H17V19.5H13V17.5H20C21.103 17.5 22 16.604 22 15.5V4.5C22 3.397 21.103 2.5 20 2.5H4ZM20 4.5V13.5H4V4.5H20Z/, replace: "M 16 8 C 7.664063 8 1.25 15.34375 1.25 15.34375 L 0.65625 16 L 1.25 16.65625 C 1.25 16.65625 7.097656 23.324219 14.875 23.9375 C 15.246094 23.984375 15.617188 24 16 24 C 16.382813 24 16.753906 23.984375 17.125 23.9375 C 24.902344 23.324219 30.75 16.65625 30.75 16.65625 L 31.34375 16 L 30.75 15.34375 C 30.75 15.34375 24.335938 8 16 8 Z M 16 10 C 18.203125 10 20.234375 10.601563 22 11.40625 C 22.636719 12.460938 23 13.675781 23 15 C 23 18.613281 20.289063 21.582031 16.78125 21.96875 C 16.761719 21.972656 16.738281 21.964844 16.71875 21.96875 C 16.480469 21.980469 16.242188 22 16 22 C 15.734375 22 15.476563 21.984375 15.21875 21.96875 C 11.710938 21.582031 9 18.613281 9 15 C 9 13.695313 9.351563 12.480469 9.96875 11.4375 L 9.9375 11.4375 C 11.71875 10.617188 13.773438 10 16 10 Z M 16 12 C 14.34375 12 13 13.34375 13 15 C 13 16.65625 14.34375 18 16 18 C 17.65625 18 19 16.65625 19 15 C 19 13.34375 17.65625 12 16 12 Z M 7.25 12.9375 C 7.09375 13.609375 7 14.285156 7 15 C 7 16.753906 7.5 18.394531 8.375 19.78125 C 5.855469 18.324219 4.105469 16.585938 3.53125 16 C 4.011719 15.507813 5.351563 14.203125 7.25 12.9375 Z M 24.75 12.9375 C 26.648438 14.203125 27.988281 15.507813 28.46875 16 C 27.894531 16.585938 26.144531 18.324219 23.625 19.78125 C 24.5 18.394531 25 16.753906 25 15 C 25 14.285156 24.90625 13.601563 24.75 12.9375 Z" },
                    /** Change the rectangle coordinates to match the middle of our svg */
                    { match: /viewBox:"0 0 24 24"/, replace: 'viewBox:"0 0 32 26"' },
                ] as MatchAndReplace[])
                    .reduce((current, { match, replace }) => current.replace(match, replace), component);

                /** Export our custom svg */
                return `${exports},IgnoreActivities_toggleOn:()=>IgnoreActivities_toggleOnToExport${restOfFunction}${component}${renderIgnoreActivitiesToggleOn}`;
            }
        }
    }, {
        /** Patch the LocalActivityStore to filter our ignored activities before they get pushed into the array */
        find: '.displayName="LocalActivityStore"',
        replacement: {
            match: /((.)\.push\(.\({type:.\..{1,3}\.LISTENING.+?;)/,
            replace: "$1$2=$2.filter(Vencord.Plugins.plugins.IgnoreActivities.isActivityEnabled);"
        }
    }],

    async start() {
        ignoredActivitiesCache = (await DataStore.get<string[]>("IgnoreActivities_ignoredActivities")) ?? [];

        if (ignoredActivitiesCache.length !== 0) {
            const gamesSeen: Record<string, any>[] = RunningGameStoreModule.Z.getGamesSeen();

            for (const [index, ignoredActivity] of ignoredActivitiesCache.entries()) {
                if (!gamesSeen.some(game => (game.id !== undefined && game.id === ignoredActivity) || game.exePath === ignoredActivity)) {
                    ignoredActivitiesCache.splice(index, 1);
                }
            }

            await DataStore.set("IgnoreActivities_ignoredActivities", ignoredActivitiesCache);
        }
    },

    isActivityEnabled(props: Record<string, any>) {
        /** LocalActivityStore games have a "type" prop */
        if ("type" in props) {
            if (props.application_id !== undefined) return !ignoredActivitiesCache.includes(props.application_id);
            else {
                const exePath = RunningGameStoreModule.Z.getRunningGames().find(game => game.name === props.name)?.exePath;
                if (exePath) return !ignoredActivitiesCache.includes(exePath);
            }
        }
        /** Registered Games tab games have an "exePath" prop */
        else if ("exePath" in props) {
            if (props.id !== undefined) return !ignoredActivitiesCache.includes(props.id);
            else return !ignoredActivitiesCache.includes(props.exePath);
        }
        return true;
    },

    async handleActivityToggle(props: Record<string, any>) {
        const id = props.id ?? props.exePath;
        if (id === undefined) return;

        if (ignoredActivitiesCache.includes(id)) ignoredActivitiesCache.splice(ignoredActivitiesCache.indexOf(id, 1));
        else ignoredActivitiesCache.push(id);
        RunningGameStoreModule.IgnoreActivities_reRenderGames();
        await DataStore.set("IgnoreActivities_ignoredActivities", ignoredActivitiesCache);
    }
});
