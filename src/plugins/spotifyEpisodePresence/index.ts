/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Settings } from "Vencord";

let accountId: string = "";
let accessToken: string = "";
let SpotifyAPI: any = null;
let delay = Settings.plugins.SpotifyEpisodePresence.requestDelay;

export default definePlugin({
	name: "SpotifyEpisodePresence",
	description: "Show Spotify episode presence in your profile and listen along with episodes!",
	authors: [Devs.prasefia],
	options: {
		requestDelay: {
			type: OptionType.NUMBER,
			description: "Delay in milliseconds before getting playback state.",
			default: 1000,
			onChange: (value: number) => {
				delay = value;
			}
		}
	},
	patches: [
		{
			find: 'case"PLAYER_STATE_CHANGED":',
			replacement: [
				{
					match: /null!=(\i)&&null!=(\i).state&&(\i)\(/,
					replace: 'null!=$1&&null!=$2.state&&$self.handlePlayerStateChange($1,$3,',
				},
				{
					match: /\(0,(\i\.\i)\)\((\i)\.accountId\,(\i)\.accessToken\,(\i)\,(\i)\,\{position\:\+(\i)\,deviceId:(\i)\.id\,repeat:(\i)\}\)/,
					replace: `$self.checkIfEpisode($4).then((resp) => { $5=resp;$& })`
				}
			],
		},
		{
			find: ".PLAYER_DEVICES",
			replacement: [
				{
					// Taken from SpotifyControls
					match: /get:(\i)\.bind\(null,(\i\.\i)\.get\)/,
					replace: "post:$1.bind(null,$2.post),vcSpotifyMarker:1,$&"
				},
				{
					match: /return (\i).get\((\i),(\i),\{url:(\i\.\i)\.PLAYER_DEVICES\}\)/,
					replace: '$self.setAccessTokenAndAccountId($2,$3);$&'
				}
			]
		}
	],
	setAccessTokenAndAccountId(id: string, token: string) {
		accessToken = token;
		accountId = id;
	},
	checkIfEpisode(spotifyId: string): Promise<string> {
		return new Promise((resolve) => {
			if (!SpotifyAPI)
				SpotifyAPI = findByPropsLazy("vcSpotifyMarker");
			SpotifyAPI["get"](accountId, accessToken, {
				url: "https://api.spotify.com/v1/episodes/" + spotifyId
			})
				.then((response: any) => {
					if (response.status === 200)
						resolve("episode");
					else
						resolve("track");
				})
				.catch(() => resolve("track"));
		});
	},
	handlePlayerStateChange(data: any, callback: Function, accountId: string, accessToken: string, _: any) {
		if (!SpotifyAPI)
			SpotifyAPI = findByPropsLazy("vcSpotifyMarker");
		const getPlaybackState = function () {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					SpotifyAPI["get"](accountId, accessToken, {
						url: "https://api.spotify.com/v1/me/player",
						query: { additional_types: "track,episode" }
					}).then((response) => {
						resolve(response);
					});
				}, delay); // for some reason, Vencord didn't like Settings.plugins here
			});
		};
		if (data.state.currently_playing_type == "episode") {
			getPlaybackState().then((state: any) => {
				data.state = state.body;
				callback(accountId, accessToken, data.state);
			});
		} else callback(accountId, accessToken, data.state);
	},
});