/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ErrorBoundary, PencilIcon } from "@components/index";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { Channel, DisplayProfile, Message, User } from "@vencord/discord-types";
import { IconUtils, Menu, useEffect, useMemo } from "@webpack/common";

import { CosmeticOverride, getDecorationData, getName, getUserOverride, hasFlag, OverrideFlags, settings, UserTag,useUserOverride } from "./data";
import { loadImageKeys, useLocalImage } from "./images";
import { ImageBackup, openUserEditModal } from "./modal";
import { getShopProduct } from "./shop";

function keepGuildAvatar(user: User, guildId?: string | null) {
    const { avatarUrl, flags } = getUserOverride(user.id);
    return guildId != null && user.hasAvatarForGuild(guildId)
        && !hasFlag(flags, OverrideFlags.DisableServerAvatars)
        && !hasFlag(flags, OverrideFlags.UseDefaultAvatar)
        && (!avatarUrl || hasFlag(flags, OverrideFlags.KeepServerAvatar));
}

function keepGuildBanner(profile: DisplayProfile) {
    const { bannerUrl, flags } = getUserOverride(profile.userId);
    return profile.isUsingGuildMemberBanner()
        && !hasFlag(flags, OverrideFlags.DisableServerBanners)
        && (!bannerUrl || hasFlag(flags, OverrideFlags.KeepServerBanner));
}

const addEditUser: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user) {
        return;
    }

    children.push(
        <Menu.MenuItem
            id="vc-edit-user"
            label="Edit User"
            action={() => openUserEditModal(user)}
            icon={PencilIcon}
            leadingAccessory={{ type: "icon", icon: PencilIcon }}
        />
    );
};

interface NameColors {
    colorString?: string | null;
    colorStrings?: { primaryColor?: string | null; } | null;
}

interface MessageNameContext {
    author: NameColors & { guildId?: string; };
    message?: Message;
    userOverride?: User;
    channel?: Channel;
}

function useNameColors(userId: string | undefined, guildId: string | undefined, original: NameColors) {
    const { usernameColor, flags } = useUserOverride(userId);
    if (!usernameColor) {
        return;
    }

    const hasRoleColor = guildId && (original.colorString || original.colorStrings?.primaryColor);
    if (hasRoleColor && !hasFlag(flags, OverrideFlags.OverrideRoleColor)) {
        return original;
    }

    return { colorString: `#${usernameColor}`, colorStrings: undefined, forceNameColor: true };
}

function getCosmeticOverride(value?: CosmeticOverride | string) {
    if (!value) {
        return;
    }
    return typeof value === "string" ? { skuId: value } : value;
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
        "user-context": addEditUser,
        "user-profile-overflow-menu": addEditUser
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
            find: '="SYSTEM_TAG"',
            group: true,
            replacement: [
                {
                    match: /colorString:(\i),colorStrings:(\i),(colorRoleName:\i,displayNameStyles:\i\}=\i),/,
                    replace: "colorString:vcNativeColor,colorStrings:vcNativeColors,$3,{colorString:$1,colorStrings:$2,forceNameColor:vcForceNameColor}=$self.useMessageColors(arguments[0],vcNativeColor,vcNativeColors),"
                },
                {
                    match: /(?<==)\i&&\i(?=,\i=\i\?\.isPrivate\(\)&&null!=\i;)/,
                    replace: "!vcForceNameColor&&($&)"
                },
                {
                    match: /(?<==)\i\?\.isPrivate\(\)&&null!=\i(?=;)/,
                    replace: "!vcForceNameColor&&($&)"
                },
                {
                    match: /style:function\(\)\{(?=if\(\i\)return \i&&null!=\i\?\{\.\.\.\i,textDecorationColor:).{0,200}?\{color:(\i)\}/,
                    replace: (match, color) => match.replace("style:function(){", `style:function(){if(vcForceNameColor)return{color:${color}};`)
                }
            ]
        },
        {
            find: ".MEMBER_LIST_ITEM_AVATAR_DECORATION_PADDING)",
            replacement: [
                {
                    match: /name:(\i)\?\?(\i)(?=,(?:quest|colorStrings):)/g,
                    replace: "name:$self.getName(arguments[0].user?.id,$1)??$2"
                },
                {
                    match: /(?<=guildId:\i,isHovering:\i\}=\i,)(?=\i=.{0,110}userId:\i\?\.id,guildId:)/,
                    replace: "vcNameColors=$self.useMemberColors(arguments[0]),"
                },
                {
                    match: /(?<=colorStrings:\i,name:\i,)(?=className:\i\.\i,displayNameStylesFont:)/,
                    replace: "...vcNameColors,"
                },
                {
                    match: /(?<==)null==\i&&null!=\i(?=;return\(0,\i\.jsxs\)\(\i\.Fragment,\{children:\[\i\?.{0,100}userName:)/,
                    replace: "!vcNameColors?.forceNameColor&&($&)"
                }
            ]
        },
        {
            find: /dotAlignment:\i="left",className:\i,nameTextClassName:/,
            replacement: {
                match: /(?<=\.jsx\)\(\i,\{\.\.\.(\i),roleStyle:)\i(?=\}\)\}\}\)\})/,
                replace: '$1.forceNameColor?"username":$&'
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
            replacement: [
                {
                    match: /(?<=function \i\((\i)\)\{)(?=let .{0,330}?return \i\(\1,\i,\i,\i,\i\)\?\?\i\(\1\.id,\1\.discriminator,\1\.isProvisional,\i\))/,
                    replace: "const vcAvatar=$self.getAvatarUrl($1);if(vcAvatar)return vcAvatar;"
                },
                {
                    match: /(?<=return )(\i\((\i),\i,\i,\i,\i\))(?=\?\?\i\(\2\.id,\2\.discriminator,\2\.isProvisional,\i\))/,
                    replace: "($self.shouldUseDefaultAvatar($2.id)?null:$1)"
                },
                {
                    match: /\i\(\{skuId:(\i)\.skuId,assetFormat:\i\}\)(?=;if\(null!=\i\)return \i)/,
                    replace: "$1.skuId?$&:null"
                }
            ]
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
                    replace: "const vcAvatar=$self.useAccountAvatar($1),vcDecoration=$self.useDecorationUrl($1?.id,40);"
                },
                {
                    match: /(?<=src:)(\i\.getAvatarURL\(void 0,\d+,!1\)),avatarDecoration:(\i)(?=,status:.{0,65}voiceStatus:)/,
                    replace: "vcAvatar??$1,avatarDecoration:vcDecoration??$2"
                }
            ]
        },
        {
            find: "isAvatarDecorationAnimating:",
            group: true,
            replacement: [
                {
                    match: /(?<=user:(\i),guildId:\i,size:(\i),avatarDecorationOverride:\i,.{0,180}\{canAnimate:(\i)\}=.{0,140},)(?=\i=\(0,\i\.\i\)\(\[\i\.\i\],)/,
                    replace: "vcEditUsersDecoration=$self.useDecorationUrl($1?.id,$2,$3),"
                },
                {
                    match: /(?<=avatarDecorationSrc:)\i(?=,isAvatarDecorationAnimating:)/,
                    replace: "vcEditUsersDecoration??$&"
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
                    replace: "const vcOverride=$self.useProfileOverride($1);"
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
                },
                {
                    match: /this\.profileFrame=(\i\?\.profileFrame\?\?\i\.profileFrame)/,
                    replace: "this.profileFrame=$self.getProfileFrame(this.userId)??($1)"
                }
            ]
        },
        {
            find: "?.collectibles?.nameplate)??",
            group: true,
            replacement: [
                {
                    match: /(?<=let\{user:(\i),guildId:\i\}=\i,)(?=\i=\(0,)/,
                    replace: "vcNameplate=$self.useNameplate($1?.id),"
                },
                {
                    match: /\i\?\.collectibles\?\.nameplate(?=\)\?\?\i\.nameplate)/,
                    replace: "vcNameplate??$&"
                },
                {
                    match: /(?<=\.nameplate\},\[)/,
                    replace: "vcNameplate,"
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
    useProfileOverride(userId?: string) {
        const override = useUserOverride(userId);
        const skuId = getCosmeticOverride(override.profileFrame)?.skuId;
        useEffect(() => {
            if (skuId) {
                void getShopProduct(skuId).catch(() => {});
            }
        }, [skuId]);
        return override;
    },

    useNameplate(userId?: string) {
        const { nameplate } = useUserOverride(userId);
        return typeof nameplate === "object" && nameplate.asset ? nameplate : undefined;
    },

    keepGuildAvatar,
    keepGuildBanner,
    getUsername: (userId?: string) => getUserOverride(userId).username || undefined,
    useUsername: (userId?: string) => useUserOverride(userId).username || undefined,
    getPronouns: (userId: string) => getUserOverride(userId).pronouns || undefined,
    getTag: (userId?: string): UserTag | undefined => getUserOverride(userId).tag || undefined,

    shouldUseDefaultAvatar: (userId: string) => hasFlag(getUserOverride(userId).flags, OverrideFlags.UseDefaultAvatar),

    getAvatarUrl(user?: User) {
        const { avatarUrl, flags } = getUserOverride(user?.id);
        if (!hasFlag(flags, OverrideFlags.UseDefaultAvatar)) {
            return avatarUrl || undefined;
        }
    },

    useMessageColors(
        { author, message, userOverride, channel }: MessageNameContext,
        colorString: NameColors["colorString"],
        colorStrings: NameColors["colorStrings"]
    ) {
        return useNameColors(userOverride?.id ?? message?.author?.id, channel?.guild_id ?? author.guildId, author)
            ?? { colorString, colorStrings };
    },

    useMemberColors({ user, guildId, colorString, colorStrings }: NameColors & { user?: User; guildId?: string; }) {
        return useNameColors(user?.id, guildId, { colorString, colorStrings });
    },

    useAvatar(user: User | undefined, member: { avatar?: string | null; } | null, preview: unknown, getSrc: () => string | undefined) {
        const { flags } = useUserOverride(user?.id);
        const preferGuildAvatar = member?.avatar
            && !hasFlag(flags, OverrideFlags.DisableServerAvatars)
            && hasFlag(flags, OverrideFlags.KeepServerAvatar);
        const useLocalAvatar = preview === undefined && !preferGuildAvatar && !hasFlag(flags, OverrideFlags.UseDefaultAvatar);
        const userId = useLocalAvatar ? user?.id : undefined;
        return useLocalImage(userId, "avatar") ?? getSrc();
    },

    useAccountAvatar(user?: User) {
        const { avatarUrl, flags } = useUserOverride(user?.id);
        const useDefault = hasFlag(flags, OverrideFlags.UseDefaultAvatar);
        const local = useLocalImage(useDefault ? undefined : user?.id, "avatar");
        if (useDefault && user) {
            return IconUtils.getDefaultAvatarURL(user.id, user.discriminator);
        }
        return local ?? (avatarUrl || undefined);
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

    useDecorationUrl(userId: string | undefined, size: number, canAnimate = false) {
        const { decoration } = useUserOverride(userId);
        return useMemo(() => {
            const avatarDecoration = getDecorationData(decoration);
            if (!avatarDecoration) {
                return;
            }

            try {
                return IconUtils.getAvatarDecorationURL({ avatarDecoration, size, canAnimate });
            } catch {
                return;
            }
        }, [decoration, size, canAnimate]);
    },

    getProfileEffect: (userId: string) => getCosmeticOverride(getUserOverride(userId).profileEffect),
    getProfileFrame: (userId: string) => getCosmeticOverride(getUserOverride(userId).profileFrame)
});
