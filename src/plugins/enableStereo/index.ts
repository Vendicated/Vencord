import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";

const settings = definePluginSettings({
    stereochannel: {
        description: "Stereo Channel",
        type: OptionType.SELECT,
        options: [
            { label: "1.0 Mono", value: 1 },
            { label: "2.0 Stereo", value: 2 },
            { label: "7.1 Surround", value: 7.1, default: true },
        ],
    }
});

export default definePlugin({
    name: "EnableStereo",
    description: "Enables Stereo in Voice Calls. Note: Requires restart after every change. Noise supression Krisp and Echo Cancelation must be disabled for it to work correctly.",
    authors: [Devs.Rattles],
    settings,

    patches: [
        {
            find: "Audio codecs",
            replacement: {
                match: /channels\:1\,/,
                replace: `channels:1,prams:{stereo:\"1\"},`,
                predicate: () => settings.store.stereochannel === 1
            }
        },
        {
            find: "Audio codecs",
            replacement: {
                match: /channels\:1\,/,
                replace: `channels:2,prams:{stereo:\"2\"},`,
                predicate: () => settings.store.stereochannel === 2
            }
        },
        {
            find: "Audio codecs",
            replacement: {
                match: /channels\:1\,/,
                replace: `channels:7.1,prams:{stereo:\"7.1\"},`,
                predicate: () => settings.store.stereochannel === 7.1
            }
        }
    ]
});
