import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Menu, UserStore } from "@webpack/common";
import { openEditor, settings } from "./settings";
import {
    applyProfileChanges,
    clearBadges,
    getAvatarDecorationForUser as resolveAvatarDecorationForUser,
    getCustomDisplayNameForUser,
    installCreationDateOverride,
    installAvatarDecorationUrlHook,
    patchUser,
    patchUserProfile,
    pickAvatarDecoration,
    queuePrefetch,
    registerBadgeProvider,
    uninstallCreationDateOverride,
    uninstallAvatarDecorationUrlHook,
    getNativeBadgesOverride,
} from "./utils";
import { resolveCustomProfileDecorationURL } from "./decorations";
import {
    getCustomBannerUrl,
    getCustomProfilePictureUrl,
} from "./profileAppearance";

const SelfContextMenu: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || user.id !== UserStore.getCurrentUser()?.id) return;

    children.push(
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="vc-custom-profile-open"
                label="Custom Profile"
                action={openEditor}
            />
        </Menu.MenuGroup>,
    );
};

export default definePlugin({
    name: "CustomProfile",
    description: "Customize your profile and share custom usernames/badges.",
    authors: [{ name: "moat.", id: 1058070604227559606 }],
    tags: ["Fun", "Profile"],
    dependencies: ["BadgeAPI"],

    settings,

    toolboxActions: {
        "Open Custom Profile": openEditor,
    },

    contextMenus: {
        "user-context": SelfContextMenu,
    },

    patches: [
        {
            find: ".getCurrentUser()",
            replacement: {
                match: /getUser\((\i)\)\{([\s\S]+?)return (\i);/,
                replace: "getUser($1){$2return $self.patchUserResult($3);",
            },
        },
        {
            find: ".getCurrentUser()",
            replacement: {
                match: /getCurrentUser\(\)\{([\s\S]+?)return (\i);/,
                replace: "getCurrentUser(){$1return $self.patchUserResult($2);",
            },
        },
        {
            find: ".useName(",
            replacement: {
                match: /(?<=function \i\(\i\)\{)(?=let)/,
                replace:
                    "const _vcCpName=$self.getDisplayNameOverride(arguments[0]);if(_vcCpName!=null)return _vcCpName;",
            },
        },
        {
            find: ".getGlobalName(",
            replacement: {
                match: /getGlobalName\((\i)\)\{/,
                replace:
                    "getGlobalName($1){const _vcCp=$self.getDisplayNameOverride($1);if(_vcCp!=null)return _vcCp;",
            },
        },
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                replace: "$self.profilePatchHook($1)",
            },
        },
        {
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBadges\(\)\{/,
                replace:
                    "getBadges(){const _vcCpOnly=$self.getBadgesOverride(this);if(_vcCpOnly!=null)return _vcCpOnly;",
            },
        },
        {
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /(?<=function \i\(\i\){)(?=let{avatarDecoration)/,
                replace:
                    "const _vcCpDecoUrl=$self.getCustomProfileDecorationURL(arguments[0]);if(_vcCpDecoUrl!=null&&_vcCpDecoUrl!=='')return _vcCpDecoUrl;",
            },
        },
        {
            find: "getAvatarDecorationURL(",
            all: true,
            replacement: {
                match: /getAvatarDecorationURL\((\i)\)\{/,
                replace:
                    "getAvatarDecorationURL($1){const _vcCpDecoUrl=$self.getCustomProfileDecorationURL($1);if(_vcCpDecoUrl!=null&&_vcCpDecoUrl!=='')return _vcCpDecoUrl;",
            },
        },
        {
            find: "isAvatarDecorationAnimating:",
            group: true,
            replacement: [
                {
                    match: /(?<=\.avatarDecoration,guildId:\i\}\)\),)(?<=user:(\i).+?)/,
                    replace:
                        "vcCustomProfileDecoration=$self.getAvatarDecorationHook($1),",
                },
                {
                    match: /(?<={avatarDecoration:).{1,20}?(?=,)(?<=avatarDecorationOverride:(\i).+?)/,
                    replace: "$1??vcCustomProfileDecoration??($&)",
                },
                {
                    match: /(?<=size:\i}\),\[)/,
                    replace: "vcCustomProfileDecoration,",
                },
            ],
        },
        {
            find: ".DISPLAY_NAME_STYLES_COACHMARK)",
            replacement: {
                match: /(?<=\i\)\({avatarDecoration:)\i(?=,)(?<=currentUser:(\i).+?)/,
                replace: "$self.getAvatarDecorationHook($1)??$&",
            },
        },
        ...[
            "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
            "#{intl::COLLECTIBLES_NAMEPLATE_PREVIEW_A11Y}",
            "#{intl::COLLECTIBLES_PROFILE_PREVIEW_A11Y}",
        ].map((find) => ({
            find,
            replacement: {
                match: /(?<=userValue:)((\i(?:\.author)?)\?\.avatarDecoration)/,
                replace: "$self.getAvatarDecorationHook($2)??$1",
            },
        })),
        {
            find: "#{intl::PREMIUM_UPSELL_PROFILE_AVATAR_DECO_INLINE_UPSELL_DESCRIPTION}",
            replacement: {
                match: /(?<=\i\)\({user:(\i),guildId:\i,avatarDecoration:)(\i)/,
                replace: "$self.getAvatarDecorationHook($1)??$2",
            },
        },
        {
            find: ':"SHOULD_LOAD");',
            replacement: {
                match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
                replace: "$self.patchBannerUrl(arguments[0])||$&",
            },
        },
        {
            find: "getUserAvatarURL(",
            all: true,
            replacement: {
                match: /getUserAvatarURL\((\i)(?:,(\i))?(?:,(\i))?(?:,(\i))?\)\{/,
                replace:
                    "getUserAvatarURL($1,$2,$3,$4){const _vcCpAvatar=$self.getCustomAvatarURL($1);if(_vcCpAvatar)return _vcCpAvatar;",
            },
        },
        {
            find: ".MODAL_V2,onClose:",
            replacement: {
                match: /(?<=\i\)\({user:(\i),guildId:\i,avatarDecoration:)(\i)/,
                replace: "$self.getAvatarDecorationHook($1)??$2",
            },
        },
        {
            find: '"UserProfilePopout");',
            replacement: {
                match: /(?<=\i\)\({user:(\i),guildId:\i,avatarDecoration:)(\i)/,
                replace: "$self.getAvatarDecorationHook($1)??$2",
            },
        },
    ],

    flux: {
        CONNECTION_OPEN() {
            void applyProfileChanges();
        },
        USER_PROFILE_MODAL_OPEN(data: { userId?: string }) {
            if (data?.userId) queuePrefetch(data.userId);
        },
        MESSAGE_CREATE(data: { message?: { author?: { id?: string } } }) {
            const authorId = data?.message?.author?.id;
            if (authorId) queuePrefetch(authorId);
        },
        LOAD_MESSAGES_SUCCESS(data: {
            messages?: { author?: { id?: string } }[];
        }) {
            for (const msg of data?.messages ?? []) {
                if (msg.author?.id) queuePrefetch(msg.author.id);
            }
        },
    },

    start() {
        registerBadgeProvider();
        installCreationDateOverride();
        installAvatarDecorationUrlHook();
        applyProfileChanges();
    },

    stop() {
        clearBadges();
        uninstallCreationDateOverride();
        uninstallAvatarDecorationUrlHook();
    },

    patchUserResult<T extends { id?: string } | null | undefined>(user: T): T {
        const me = UserStore.getCurrentUser()?.id;
        if (user?.id && user.id !== me) queuePrefetch(user.id);
        return patchUser(user as any) as T;
    },

    getAvatarDecorationHook(user: { id?: string }) {
        return resolveAvatarDecorationForUser(user?.id);
    },

    pickAvatarDecoration,

    getCustomProfileDecorationURL(
        data: Parameters<typeof resolveCustomProfileDecorationURL>[0],
    ) {
        return resolveCustomProfileDecorationURL(data);
    },

    getCustomAvatarURL(user: { id?: string }) {
        if (!user?.id) return null;
        return getCustomProfilePictureUrl(user.id);
    },

    patchBannerUrl({
        displayProfile,
    }: {
        displayProfile?: { userId?: string };
    }) {
        return getCustomBannerUrl(displayProfile?.userId) ?? undefined;
    },

    getDisplayNameOverride(user: { id?: string }) {
        if (!user?.id) return null;
        const name = getCustomDisplayNameForUser(user.id);
        return name || null;
    },

    getGlobalNameOverride(user: { id?: string }) {
        return this.getDisplayNameOverride(user);
    },

    profilePatchHook(profile: Parameters<typeof patchUserProfile>[0]) {
        return patchUserProfile(profile);
    },

    getBadgesOverride(profile: { userId?: string }) {
        return getNativeBadgesOverride(profile);
    },
});
