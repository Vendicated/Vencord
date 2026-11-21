/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ErrorBoundary } from "@components/index";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { DisplayProfile, User } from "@vencord/discord-types";
import { Menu, useMemo } from "@webpack/common";

import { getName, getUserOverride, hasFlag, OverrideFlags, settings, UserTag,useUserOverride } from "./data";
import { loadImageKeys, useLocalImage } from "./images";
import { ImageBackup, openUserEditModal } from "./modal";

function keepGuildAvatar(user: User, guildId?: string | null) {
    const { avatarUrl, flags } = getUserOverride(user.id);
    return guildId != null && user.hasAvatarForGuild(guildId)
        && !hasFlag(flags, OverrideFlags.DisableServerAvatars)
        && (!avatarUrl || hasFlag(flags, OverrideFlags.KeepServerAvatar));
}

function keepGuildBanner(profile: DisplayProfile) {
    const { bannerUrl, flags } = getUserOverride(profile.userId);
    return profile.isUsingGuildMemberBanner()
        && !hasFlag(flags, OverrideFlags.DisableServerBanners)
        && (!bannerUrl || hasFlag(flags, OverrideFlags.KeepServerBanner));
}

export default definePlugin({
    name: "EditUsers",
    description: "Customize how users appear in your Discord client.",
    authors: [Devs.Ven],
    tags: ["Appearance", "Customisation"],

    settings,
    settingsAboutComponent: ErrorBoundary.wrap(ImageBackup, { noop: false }),
    startAt: StartAt.Init,
    async start() {
        await loadImageKeys();
    },

    contextMenus: {
        "user-context"(children, { user }: { user?: User; }) {
            if (!user) {
                return;
            }

            children.push(
                <Menu.MenuItem
                    id="vc-edit-user"
                    label="Edit User"
                    action={() => openUserEditModal(user)}
                />
            );
        }
    },

    patches: [
        {
            find: ",getUserTag:",
            replacement: [
                {
                    match: /(?<=function \i\((\i)\)\{)(?=return \i\(\1\.global_name\))/,
                    replace: "const vcName=$self.getUsername($1?.id);if(vcName)return vcName;"
                },
                {
                    match: /(?<=function \i\((\i)\)\{)(?=if\(null!=\1\)if\(\i\(\1\.globalName\)\))/,
                    replace: "const vcName=$self.getUsername($1?.id);if(vcName)return vcName;"
                },
                {
                    match: /(?<=hidePersonalInformation\);)if\(null==(\i)\)return;let (\i)=(\i\(\1\))/,
                    replace: "const vcName=$self.useUsername($1?.id);if(null==$1)return;let $2=vcName??$3"
                }
            ]
        },
        {
            find: '"GuildMemberStore"',
            replacement: {
                match: /(?<=getNick\(\i,(\i)\)\{.{0,150})return null!=\i\?(\i)\.nick:null/,
                replace: "return $self.getName($1,$2?.nick)??null"
            }
        },
        {
            find: '"Result cannot be null because the message is not null"',
            replacement: {
                match: /(?<=friendNickname:\i,displayNameStyles:\i\}=\i,\i=null==(\i)\?"\?\?\?":.{0,300}?\{nick:)(\i\.nick)\?\?(\i)(?=,colorString:)/,
                replace: "$self.getName($1.id,$2)??$3"
            }
        },
        {
            find: ".MEMBER_LIST_ITEM_AVATAR_DECORATION_PADDING)",
            replacement: {
                match: /name:(\i)\?\?(\i)(?=,(?:quest|colorStrings):)/g,
                replace: "name:$self.getName(arguments[0].user?.id,$1)??$2"
            }
        },
        {
            find: "=this.guildMemberAvatars[",
            replacement: {
                match: /(?<=getAvatarURL\((\i),\i\)\{.{0,350}?return )null!=\i&&null!=\1(?=\?\i\.\i\.getGuildMemberAvatarURLSimple)/,
                replace: "$self.keepGuildAvatar(this,$1)"
            }
        },
        {
            find: "getUserAvatarURL:",
            replacement: {
                match: /(?<=function \i\((\i)\)\{)(?=let .{0,330}?return \i\(\1,\i,\i,\i,\i\)\?\?\i\(\1\.id,\1\.discriminator,\1\.isProvisional,\i\))/,
                replace: "const vcAvatar=$self.getAvatarUrl($1);if(vcAvatar)return vcAvatar;"
            }
        },
        {
            find: /avatarSrc:\i\.useMemo\(.{0,160}?,isAvatarAnimating:/,
            replacement: {
                match: /(?<=avatarSrc:)\i\.useMemo\((\(\)=>.{0,120}?),\[(\i),(\i),(\i),\i,\i\]\)(?=,isAvatarAnimating:)/,
                replace: "$self.useAvatar($4,$3,$2,$1)"
            }
        },
        {
            find: '{type:"account_popout",withMutualGuilds:',
            group: true,
            replacement: [
                {
                    match: /(?=return null==(\i)\?null:.{0,350}type:"account_popout",withMutualGuilds:)/,
                    replace: "const vcAvatar=$self.useAccountAvatar($1);"
                },
                {
                    match: /(?<=src:)\i\.getAvatarURL\(void 0,\d+,!1\)(?=,avatarDecoration:\i,status:.{0,65}voiceStatus:)/,
                    replace: "vcAvatar??$&"
                }
            ]
        },
        {
            find: "isAvatarDecorationAnimating:",
            group: true,
            replacement: [
                {
                    match: /(?<=userValue:(\i)\?\.avatarDecoration,guildValue:\i\?\.avatarDecoration,guildId:\i\}\)\),)/,
                    replace: "vcEditUsersDecoration=$self.useDecoration($1?.id),"
                },
                {
                    match: /(?<=avatarDecoration:void 0!==\i\?\i:)(\i)(?=,canAnimate:)/,
                    replace: "vcEditUsersDecoration??$1"
                },
                {
                    match: /(?<=,canAnimate:\i,size:\i\}\),\[)/,
                    replace: "vcEditUsersDecoration,"
                }
            ]
        },
        {
            find: "this.isUsingGuildMemberBanner()",
            replacement: [
                {
                    match: /(?<=getBannerURL\(\i\)\{)(?=let\{canAnimate:)/,
                    replace: "const vcBanner=$self.getBannerUrl(this);if(vcBanner)return vcBanner;"
                },
                {
                    match: /(?<=getBannerURL\(\i\)\{.{0,250}?return )null!=this\.guildId&&this\.isUsingGuildMemberBanner\(\)/,
                    replace: "$self.keepGuildBanner(this)"
                },
                {
                    match: /(?<=getBannerURL\(\i\)\{.{0,400}?id:this\.userId,banner:)this\.banner/,
                    replace: "this._userProfile.banner"
                },
                {
                    match: /(?<=get primaryColor\(\)\{return )(?=this\.themeColors)/,
                    replace: "$self.getBannerColor(this.userId)??"
                },
                {
                    match: /(?<=function \i\((\i),\i\)\{)(?=return\(0,\i\.\i\)\(\[\i\.default,\i\.\i\],\(\)=>null==\1\?null:)/,
                    replace: "const vcOverride=$self.useUserOverride($1);"
                },
                {
                    match: /(?<=\(\)=>null==\i\?null:\i\(\i,\i,\[\i\.default,\i\.\i\]\))(?=\)\})/,
                    replace: ",[vcOverride]"
                },
                {
                    match: /(?<=return null==\i\|\|null==\i\?null:)\i\(\i,\i(?=\)\}\}\s*$)/,
                    replace: "$&,$self.getUserOverride(arguments[0])"
                },
                {
                    match: /this\.pronouns=(\i\(\i\.pronouns,\i\?\.pronouns\))/,
                    replace: "this.pronouns=$self.getPronouns(this.userId)??$1"
                },
                {
                    match: /(?<=getPreviewPronouns\((\i)\)\{return)(?=\(0,)/,
                    replace: " $1===undefined&&$self.getPronouns(this.userId)||"
                },
                {
                    match: /this\.profileEffect=(\i\?\.profileEffect\?\?\i\.profileEffect)/,
                    replace: "this.profileEffect=$self.getProfileEffect(this.userId)??($1)"
                }
            ]
        },
        {
            find: /\?\.getPreviewBanner\(\i,\i,\i\),\[\i,\i\]=\(0,/,
            replacement: {
                match: /(\i)\?\.getPreviewBanner\((\i),\i,\i\)(?=,\[\i,\i\]=\(0,)/,
                replace: "$self.useBanner($1,$2,()=>$&)"
            }
        },
        {
            find: ".Types.ORIGINAL_POSTER",
            replacement: {
                match: /(?<=function \i\(\i\)\{let \i,\{message:\i,channel:\i,user:(\i),isRepliedMessage:\i\}=\i;)(?=return \i\?\.isSystemDM\(\)\?\i=(\i\.\i\.Types)\.SYSTEM_DM)/,
                replace: "const vcTag=$self.getTag($1?.id);if(vcTag!==undefined)return vcTag===\"NONE\"?undefined:$2[vcTag];"
            }
        }
    ],

    getName,
    getUserOverride,
    useUserOverride,
    keepGuildAvatar,
    keepGuildBanner,
    getUsername: (userId?: string) => getUserOverride(userId).username || undefined,
    useUsername: (userId?: string) => useUserOverride(userId).username || undefined,
    getPronouns: (userId: string) => getUserOverride(userId).pronouns || undefined,
    getTag: (userId?: string): UserTag | undefined => getUserOverride(userId).tag || undefined,

    getAvatarUrl: (user?: User) => getUserOverride(user?.id).avatarUrl || undefined,

    useAvatar(user: User | undefined, member: { avatar?: string | null; } | null, preview: unknown, getSrc: () => string | undefined) {
        const { flags } = useUserOverride(user?.id);
        const preferGuildAvatar = member?.avatar
            && !hasFlag(flags, OverrideFlags.DisableServerAvatars)
            && hasFlag(flags, OverrideFlags.KeepServerAvatar);
        const userId = preview === undefined && !preferGuildAvatar ? user?.id : undefined;
        return useLocalImage(userId, "avatar") ?? getSrc();
    },

    useAccountAvatar(user?: User) {
        const { avatarUrl } = useUserOverride(user?.id);
        return useLocalImage(user?.id, "avatar") ?? (avatarUrl || undefined);
    },

    getBannerColor(userId: string) {
        const { bannerColor } = getUserOverride(userId);
        return bannerColor ? Number.parseInt(bannerColor, 16) : undefined;
    },

    getBannerUrl(profile: DisplayProfile) {
        if (keepGuildBanner(profile)) {
            return;
        }
        return getUserOverride(profile.userId).bannerUrl || undefined;
    },

    useBanner(profile: DisplayProfile | undefined, preview: unknown, getSrc: () => string | undefined) {
        const { flags } = useUserOverride(profile?.userId);
        const preferGuildBanner = profile?.isUsingGuildMemberBanner()
            && !hasFlag(flags, OverrideFlags.DisableServerBanners)
            && hasFlag(flags, OverrideFlags.KeepServerBanner);
        const userId = preview === undefined && !preferGuildBanner ? profile?.userId : undefined;
        return useLocalImage(userId, "banner") ?? getSrc();
    },

    useDecoration(userId?: string) {
        const { decoration } = useUserOverride(userId);
        return useMemo(() => decoration ? { asset: decoration, skuId: "" } : undefined, [decoration]);
    },

    getProfileEffect(userId: string) {
        const { profileEffect } = getUserOverride(userId);
        return profileEffect ? { skuId: profileEffect } : undefined;
    }
});
