import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { Settings } from "../Vencord";

export default definePlugin({
    name: "Experiments",
    authors: [Devs.Ven, Devs.Megu],
    description: "Enable Experiments",
    patches: [{
        find: "Object.defineProperties(this,{isDeveloper",
        replacement: {
            match: /(?<={isDeveloper:\{[^}]+,get:function\(\)\{return )\w/,
            replace: "true"
        }
    }, {
        find: 'type:"user",revision',
        replacement: {
            match: /(\w)\|\|"CONNECTION_OPEN".+?;/g,
            replace: "$1=!0;"
        }
    }, {
        find: ".isStaff=function(){",
        predicate: () => Settings.plugins["Experiments"]?.enableIsStaff === true,
        replacement: [
            {
                match: /return\s*(\w+)\.hasFlag\((.+?)\.STAFF\)}/,
                replace: "return Vencord.Webpack.Common.UserStore.getCurrentUser().id===$1.id||$1.hasFlag($2.STAFF)}"
            },
            {
                match: /hasFreePremium=function\(\){return this.is Staff\(\)\s*\|\|/,
                replace: "hasFreePremium=function(){return ",
            },
        ],
    },],
    settings: [
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
        {
            key: "enableIsStaff",
            name: "Enable isStaff (requires restart)",
            type: "boolean",
            default: false,
            restartNeeded: true,
        },
    ]
});
