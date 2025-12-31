import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";

const settings = definePluginSettings({
    voiceBitrate: {
        type: OptionType.SLIDER,
        description: "Voice Bitrate",
        markers: [8, 64, 256, 384, 512],
        default: 512,
        stickToMarkers: false,
        componentProps: {
            // This will skip the save, but oh well, im too lazy to figure out how to properly math floor this b4 saving
            onValueChange: (v: number) => settings.store.voiceBitrate = Math.floor(v),
            onValueRender: (v: number): string => `${v.toFixed(0)}kbps`,
            onMarkerRender: (v: number): string => `${v.toFixed(0)}kbps`
        }
    },
    enableFec: {
        type: OptionType.BOOLEAN,
        description: "Enable Forward Error Corretion",
        default: false
    }
});

export default definePlugin({
    name: "10 Stereo Mic",
    description: "2 channels... scawwy",
    authors:[{
        name: "rz30",
        id: 786315593963536415n
    }],

    // These regexes probably could be better, idk regex c:
    patches: [{
        find: "...this.getAttenuationOptions()",
        replacement: [
            {
                match: /freq:48e3,pacsize:960,channels:1,rate:64e3/,
                replace: "freq:48e3,pacsize:960,channels:2,params:{stereo:\"1\"},rate:64e3"
            },
            {
                match: /setBitRate\(\i\){this\.setVoiceBitRate\(\i\)}/,
                replace: "setBitRate($1){$self.setVoiceBitratePatch(this, $1)}"
            },
            {
                match: /fec:!0/,
                replace: "fec:$self.isFecEnabled()"
            }
        ]
    }],

    settings,

    isFecEnabled() {
        console.log(`[StereoMic] Overriding FEC`)
        return settings.store.enableFec
    },

    setVoiceBitratePatch(moduleContext: any, orgBitrate: number) {
        console.log(`[StereoMic] Overriding Voice Bitrate (From ${orgBitrate/1000}kbps to ${settings.store.voiceBitrate}kbps)`)

        moduleContext.setVoiceBitRate(settings.store.voiceBitrate*1000)
    }
});
