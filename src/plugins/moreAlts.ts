import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
const settings = definePluginSettings({
    amtOfAcounts: {
        default: 10,
        type: OptionType.NUMBER,
        description: "Amount of alts to allow."
    },
});

export default definePlugin({
    name: "MoreAlts",
    description: "Allows you to have more alts in the account switcher. قول الصدق ما جربته بس احسه يفيد ",
    authors: [Devs.rz30],
    settings,
    patches: [
        {
            find: "\"multiaccount_cta_tooltip_seen\"",
            replacement: [{
                // the first export seems to always be the amount of alts, we should find a better way to do this in the future
                match: /(.{0,2}):function\(\){return .{1,2}\}/,
                replace: `$1:function(){return $self.settings.amtOfAcounts}`
            }]
        }
    ]
});
