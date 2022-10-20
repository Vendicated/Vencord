import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";

export default definePlugin({
    name: "Ify",
    description: "Disables Spotify auto-pausing, allows activity to continue playing when idling and bypasses premium checks, allowing you to listen along with others.",
    authors: [
        Devs.Cyn,
        Devs.Nuckyz
    ],

    patches: [{
        find: 'dispatch({type:"SPOTIFY_PROFILE_UPDATE"',
        replacement: [{
            match: /(function\((.{1,2})\){)(.{1,6}dispatch\({type:"SPOTIFY_PROFILE_UPDATE")/,
            replace: (_, functionStart, data, functionBody) => `${functionStart}${data}.body.product="premium";${functionBody}`
        }],
    }, {
        find: '.displayName="SpotifyStore"',
        predicate: () => Settings.plugins.Ify.noSpotifyAutoPause,
        replacement: {
            match: /function (.{1,2})\(\).{0,200}SPOTIFY_AUTO_PAUSED\);.{0,}}}}/,
            replace: "function $1(){}"
        }
    }, {
        find: '.displayName="SpotifyStore"',
        predicate: () => Settings.plugins.Ify.keepSpotifyActivityOnIdle,
        replacement: {
            match: /(shouldShowActivity=function\(\){.{1,50})&&!.{1,6}\.isIdle\(\)(.{0,}?})/,
            replace: (_, functionDeclarationAndExpression, restOfFunction) => `${functionDeclarationAndExpression}${restOfFunction}`
        }
    }],

    options: {
        noSpotifyAutoPause: {
            description: "Disable Spotify auto-pause",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        keepSpotifyActivityOnIdle: {
            description: "Keep Spotify activity playing when idling",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        }
    }
});
