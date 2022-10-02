import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "Ify",
    description: "Disabes Spotify auto-pausing and premium checks",
    authors: [Devs.Cyn],
    patches: [
        {
            find: '.displayName="SpotifyStore"',
            replacement: [{
                match: /\.isPremium=.;/,
                replace: ".isPremium=true;",
            }, /* ...["SPEAKING", "VOICE_STATE_UPDATES", "MEDIA_ENGINE_SET_DESKTOP_SOURCE"].map(event => ({
                match: new RegExp(`${event}:function\\(.\\){.+?}(,|}\\))`),
                replace: (_, ending) => `${event}:function(){}${ending}`,
            })), */
            ],
        },
		{
			find: "Playback auto paused",
			replacement: {
				match: /.{1,2}\.default\.track\(.{1,2}\..{1,3}\.SPOTIFY_AUTO_PAUSED\)/,
                replace: ""
			}
		}
    ]
});
