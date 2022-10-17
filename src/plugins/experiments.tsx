import { lazyWebpack } from "../utils";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { filters } from "../webpack";
import { Forms, React } from "../webpack/common";

const KbdStyles = lazyWebpack(filters.byProps(["key", "removeBuildOverride"]));

export default definePlugin({
    name: "Experiments",
    authors: [
        Devs.Megu,
        Devs.Ven,
        { name: "Nickyux", id: 427146305651998721n },
        { name: "BanTheNons", id: 460478012794863637n },
    ],
    description: "Enable Access to Experiments in Discord!",
    patches: [{
        find: "Object.defineProperties(this,{isDeveloper",
        replacement: {
            match: /(?<={isDeveloper:\{[^}]+,get:function\(\)\{return )\w/,
            replace: "true"
        },
    }, {
        find: 'type:"user",revision',
        replacement: {
            match: /(\w)\|\|"CONNECTION_OPEN".+?;/g,
            replace: "$1=!0;"
        },
    }, {
        find: ".isStaff=function(){",
        predicate: () => Settings.plugins["Experiments"].enableIsStaff === true,
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
    }],
    options: {
        enableIsStaff: {
            name: "Enable isStaff (requires restart)",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        }
    },

    settingsAboutComponent: () => {
        const isMacOS = navigator.platform.includes("Mac");
        const modKey = isMacOS ? "cmd" : "ctrl";
        const altKey = isMacOS ? "opt" : "alt";
        return (
            <React.Fragment>
                <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
                <Forms.FormText variant="text-md/normal">
                    You can enable client DevTools{" "}
                    <kbd className={KbdStyles.key}>{modKey}</kbd> +{" "}
                    <kbd className={KbdStyles.key}>{altKey}</kbd> +{" "}
                    <kbd className={KbdStyles.key}>O</kbd>{" "}
                    after enabling <code>isStaff</code> below
                </Forms.FormText>
                <Forms.FormText>
                    and then toggling <code>Enable DevTools</code> in the <code>Developer Options</code> tab in settings.
                </Forms.FormText>
            </React.Fragment>
        );
    }
});
