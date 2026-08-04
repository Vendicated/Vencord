import { definePluginSettings } from "@api/Settings";
import { LinkButton } from "@components/Button";
import definePlugin, { OptionType } from "@utils/types";

const API_URL = "https://usrbg.is-hardly.online/users";

interface UsrbgApiReturn {
	endpoint: string;
	bucket: string;
	prefix: string;
	users: Record<string, string>;
}

const settings = definePluginSettings({
	myBannerUrl: {
		description: "Your custom banner URL (overrides USRBG for your account)",
		type: OptionType.STRING,
		default: "",
		placeholder: "https://files.catbox.moe/XXXXXX.gif"
	},
	myAvatarUrl: {
		description: "Your custom avatar URL (client-side only — only you see this)",
		type: OptionType.STRING,
		default: "",
		placeholder: "https://files.catbox.moe/XXXXXX.gif"
	},
	nitroFirst: {
		description: "Prefer Nitro banner/avatar over custom if you have Nitro",
		type: OptionType.BOOLEAN,
		default: false
	},
	voiceBackground: {
		description: "Use banners as voice chat backgrounds",
		type: OptionType.BOOLEAN,
		default: true,
		restartNeeded: true
	}
});

export default definePlugin({
	name: "BannerFromHoster",
	description: "Banner and animated profile picture from an image hoster, compatible with USRBG",
	tags: ["Appearance", "Customisation"],
	authors: [{ name: "Jonttex", id: 571800335757082624 }],
	settings,

	settingsAboutComponent: () => (
		<>
			<LinkButton href="https://catbox.moe" variant="primary">
				Upload image to Catbox
			</LinkButton>
		</>
	),

	patches: [
		{
			find: ':"SHOULD_LOAD");',
			replacement: {
				match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
				replace: "$self.patchBannerUrl(arguments[0])||$&"
			}
		},
		{
			find: "\"data-selenium-video-tile\":",
			predicate: () => settings.store.voiceBackground,
			replacement: [
				{
					match: /(?<=function\((\i),\i\)\{)(?=let.{20,40},style:)/,
					replace: "$1.style=$self.getVoiceBackgroundStyles($1);"
				}
			]
		},
		{
			find: '"VideoBackground-web"',
			predicate: () => settings.store.voiceBackground,
			replacement: {
				match: /backgroundColor:.{0,25},\{style:(?=\i\?)/,
				replace: "$&$self.userHasBackground(arguments[0]?.userId)?null:",
			}
		},
		{
			find: "getUserAvatarURL:",
			replacement: {
				match: /(getUserAvatarURL:)(\i),/,
				replace: "$1$self.getAvatarHook($2),"
			}
		}
	],

	data: null as UsrbgApiReturn | null,

	getVoiceBackgroundStyles({ className, participantUserId }: any) {
		if (!className?.includes("tile")) return;
		
		const url = this.getBannerForUser(participantUserId);
		if (!url) return;

		return {
			backgroundImage: `url(${url})`,
			backgroundSize: "cover",
			backgroundPosition: "center",
			backgroundRepeat: "no-repeat"
		};
	},

	patchBannerUrl({ displayProfile }: any) {
		if (displayProfile?.banner && settings.store.nitroFirst) return;
		
		const userId = displayProfile?.userId;
		if (!userId) return;

		return this.getBannerForUser(userId);
	},

	// Only override for current user
	getAvatarHook(original: Function) {
		return (user: any, animated: boolean, size: number) => {
			const currentUser = Vencord.Webpack.Common.UserStore.getCurrentUser();
			if (user?.id !== currentUser?.id) return original(user, animated, size);

			if (settings.store.nitroFirst && user?.avatar?.startsWith("a_")) {
				return original(user, animated, size);
			}

			if (settings.store.myAvatarUrl) {
				return settings.store.myAvatarUrl;
			}

			return original(user, animated, size);
		};
	},

	getBannerForUser(userId: string): string | null {
		const currentUser = Vencord.Webpack.Common.UserStore.getCurrentUser();
		if (userId === currentUser?.id && settings.store.myBannerUrl) {
			return settings.store.myBannerUrl;
		}

		if (!this.data?.users[userId]) return null;

		const { endpoint, bucket, prefix, users: { [userId]: etag } } = this.data;
		return `${endpoint}/${bucket}/${prefix}${userId}?${etag}`;
	},

	userHasBackground(userId: string) {
		const currentUser = Vencord.Webpack.Common.UserStore.getCurrentUser();
		const isMe = userId === currentUser?.id;
		return (isMe && !!settings.store.myBannerUrl) || !!this.data?.users[userId];
	},

	async start() {
		const res = await fetch(API_URL);
		if (res.ok) {
			this.data = await res.json();
		}
	}
});