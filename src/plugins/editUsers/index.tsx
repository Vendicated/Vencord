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
import { Channel, DisplayProfile, Message, ReferencedMessage, User } from "@vencord/discord-types";
import { Menu, React, useEffect, useMemo } from "@webpack/common";

import {
    CosmeticOverride,
    getDecorationUrl,
    getName,
    getNameColor,
    getUserOverride,
    hasFlag,
    logger,
    OverrideFlags,
    settings,
    UserOverride,
    UserTag,
    useUserOverride
} from "./data";
import { getLocalImage, loadImages, useLocalImage, useUserAvatarURL } from "./images";
import { ImageBackup, openUserEditModal } from "./modal";
import { getShopProduct } from "./shop";

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

export const customColorOverride = Symbol("EditUsers.customColor");

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

function useNameColor(userId: string | undefined, guildId: string | undefined, original: NameColors) {
    settings.use(["users"]);
    const roleColor = guildId && (original.colorString || original.colorStrings?.primaryColor);
    return getNameColor(userId, roleColor);
}

function getCosmeticOverride(value?: CosmeticOverride | string) {
    if (!value) {
        return;
    }
    return typeof value === "string" ? { skuId: value } : value;
}

function useDecorationUrl(userId: string | undefined, size: number, canAnimate = false) {
    try {
        const { decoration } = useUserOverride(userId);
        return useMemo(() => getDecorationUrl(decoration, size, canAnimate), [decoration, size, canAnimate]);
    } catch (error) {
        logger.error("Could not get decoration URL", error);
        return;
    }
}

interface EditableProfile extends DisplayProfile {
    profileFrame?: CosmeticOverride;
    getPreviewPronouns(pending?: string | null): string | undefined;
}

const profileCache = new WeakMap<DisplayProfile, {
    override: Partial<UserOverride>;
    profile: DisplayProfile;
}>();

export default definePlugin({
    name: "EditUsers",
    description: "Customize how users appear in your Discord client.",
    authors: [Devs.Ven],
    tags: ["Appearance", "Customisation"],

    settings,
    settingsAboutComponent: ErrorBoundary.wrap(ImageBackup, { noop: false }),
    startAt: StartAt.Init,
    async start() {
        await loadImages();
    },

    contextMenus: {
        "user-context": addEditUser,
        "user-profile-overflow-menu": addEditUser
    },

    patches: [
        {
            find: "getUserTag:",
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
                match: /(?<=\bnick:)(\i\.nick)\b/,
                replace: "$self.getName(arguments[0]?.user?.id,$1)"
            }
        },
        {
            find: '"data-username-has-gradient"',
            replacement: {
                match: /(?<=function \i\((\i)\)\{)(?=let\{author:\i,message:\i,channel:\i,userOverride:)/,
                replace: "$1=$self.useMessageNameProps($1);"
            }
        },
        {
            find: ".MEMBER_LIST_ITEM_AVATAR_DECORATION_PADDING)",
            replacement: [
                {
                    match: /name:(\i)\?\?(\i)(?=,(?:quest|colorStrings):)/g,
                    replace: "name:$self.getName(arguments[0]?.user?.id,$1)??$2"
                },
                {
                    match: /(?<=children:\[)(\i\?.{0,80}?userName:.{0,200}?\}\)):(.{0,50}?roleName:[^}]*?animateRoleGradient:\i\}\))/,
                    replace: "$self.MemberName({member:arguments[0],styledName:$1:null,roleName:$2})"
                }
            ]
        },
        {
            find: "this.guildMemberAvatars[",
            replacement: {
                match: /this\.guildMemberAvatars\[\i\](?=.{0,150}?\.getGuildMemberAvatarURLSimple)/g,
                replace: "($self.shouldUseGuildAvatar(this.id)?$&:null)"
            }
        },
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
            replacement: {
                match: /(?<=isReplyAuthorBlocked:\i,repliedAuthor:\i,.{0,150}?onPopoutRequestClose:\i\}=)\i/,
                replace: "$self.useReplyAvatarProps($&)"
            }
        },
        {
            find: "if(!this.props.showDefaultAvatarsForNullUsers)",
            replacement: {
                match: /"img",\{src:(\i)\.getAvatarURL\((\i),(\i)\)(?=,alt:\1\.username)/,
                replace: "$self.SummaryAvatar,{user:$1,guildId:$2,size:$3"
            }
        },
        {
            find: "getUserAvatarURL:",
            replacement: {
                match: /\i\((\i)(?:,\i)+\)(?=\?\?\i\(\1\.id,\1\.discriminator)/,
                replace: "$self.getAvatarUrl($1,$&)"
            }
        },
        {
            find: /avatarOverride:\i\}=.{0,50}?shouldAnimate:/,
            replacement: {
                match: /(?<=avatarSrc:)(?=.{0,80}?\((\i),(\i),(\i),\{).{1,200}?(?=,isAvatarAnimating:)/,
                replace: "$self.useAvatar($3,$2,$1,$&)"
            }
        },
        {
            find: 'type:"account_popout"',
            replacement: {
                // The account panel renders its avatar inside a popout callback.
                match: /(\i),\{(size:\i\.\i\.SIZE_32),src:(\i)\.getAvatarURL(?=\(.{0,40}?\),avatarDecoration:)/,
                replace: "$self.AccountAvatar,{Component:$1,$2,user:$3,getSrc:()=>$3.getAvatarURL"
            }
        },
        {
            find: "isAvatarDecorationAnimating:",
            replacement: {
                match: /(?<=avatarDecorationSrc:)(\i)(?=,isAvatarDecorationAnimating:(\i))/,
                replace: "$self.useDecorationUrl(arguments[0]?.user?.id,arguments[0]?.size,$2)??$1"
            }
        },
        {
            find: "this.isUsingGuildMemberBanner()",
            replacement: [
                {
                    // Recompute the Flux selector when this user's profile overrides change.
                    match: /(?<=\(\)=>.{0,50}?\(\i,\i,\[\i\.\i,\i\.\i\]\))(?=\))/,
                    replace: ",[$self.useProfileOverride(arguments[0])]"
                },
                {
                    match: /(?<=\.getGuildMemberProfile\(\i,\i\);return .{0,60}?null:)\i\(\i,\i\)/,
                    replace: "$self.applyProfile($&)"
                }
            ]
        },
        {
            find: ".collectibles?.nameplate)??",
            replacement: {
                match: /(?<=return )\i\.useMemo\(.{0,160}?\.collectibles\?\.nameplate.{0,100}?\]\)/,
                replace: "$self.useNameplate(arguments[0]?.user?.id,$&)"
            }
        },
        {
            find: '"SHOULD_LOAD"',
            replacement: {
                match: /(\i)\?\.getPreviewBanner\((\i),\i,\i\)(?=,\[)/,
                replace: "$self.useBanner($1,$2,()=>$&)"
            }
        },
        {
            find: ".Types.ORIGINAL_POSTER",
            replacement: {
                match: /(?<=(\i\.\i\.Types)\.ORIGINAL_POSTER\),)\i/,
                replace: "$self.getTag(arguments[0]?.user?.id,$1,$&)"
            }
        }
    ],

    getName,
    useProfileOverride(userId?: string) {
        try {
            const override = useUserOverride(userId);
            const skuId = getCosmeticOverride(override.profileFrame)?.skuId;
            useEffect(() => {
                if (skuId) {
                    void getShopProduct(skuId).catch(error => logger.error("Could not load profile frame", error));
                }
            }, [skuId]);
            return override;
        } catch (error) {
            logger.error("Could not read profile override", error);
            return;
        }
    },

    applyProfile(original: EditableProfile) {
        try {
            const override = getUserOverride(original.userId);
            const { pronouns, profileEffect, profileFrame, bannerColor, bannerUrl, flags } = override;
            const disableGuildBanner = hasFlag(flags, OverrideFlags.DisableServerBanners);
            if (!(pronouns || profileEffect || profileFrame || bannerColor || bannerUrl || disableGuildBanner)) {
                return original;
            }

            const cached = profileCache.get(original);
            if (cached?.override === override) {
                return cached.profile;
            }

            const profile: EditableProfile = Object.assign(
                Object.create(Object.getPrototypeOf(original)),
                original
            );
            if (pronouns) {
                profile.pronouns = pronouns;
                profile.getPreviewPronouns = pending => {
                    try {
                        return pending === undefined ? pronouns : original.getPreviewPronouns(pending);
                    } catch (error) {
                        logger.error("Could not get preview pronouns", error);
                        return pending ?? undefined;
                    }
                };
            }
            if (profileEffect) {
                profile.profileEffect = getCosmeticOverride(profileEffect);
            }
            if (profileFrame) {
                profile.profileFrame = getCosmeticOverride(profileFrame);
            }
            if (bannerColor) {
                Object.defineProperty(profile, "primaryColor", { value: Number.parseInt(bannerColor, 16) });
            }
            if (disableGuildBanner && original._guildMemberProfile) {
                profile._guildMemberProfile = { ...original._guildMemberProfile, banner: null };
                profile.banner = original._userProfile.banner;
            }
            const keepGuildBanner = profile._guildMemberProfile?.banner && hasFlag(flags, OverrideFlags.KeepServerBanner);
            if (bannerUrl && !keepGuildBanner) {
                profile.getBannerURL = () => bannerUrl;
            }

            profileCache.set(original, { override, profile });
            return profile;
        } catch (error) {
            logger.error("Could not apply profile override", error);
            return original;
        }
    },

    useNameplate(userId: string | undefined, fallback: unknown) {
        const { nameplate } = useUserOverride(userId);
        return typeof nameplate === "object" && nameplate?.asset ? nameplate : fallback;
    },

    getUsername: (userId?: string) => getUserOverride(userId).username || undefined,
    useUsername: (userId?: string) => useUserOverride(userId).username || undefined,
    getTag(userId: string | undefined, types: Record<Exclude<UserTag, "" | "NONE">, number>, fallback?: number) {
        const { tag } = getUserOverride(userId);
        if (tag === "NONE") {
            return;
        }
        return tag ? types?.[tag] ?? fallback : fallback;
    },

    shouldUseGuildAvatar(userId: string) {
        const { flags, avatarUrl } = getUserOverride(userId);
        return !hasFlag(flags, OverrideFlags.DisableServerAvatars)
            && !hasFlag(flags, OverrideFlags.UseDefaultAvatar)
            && (hasFlag(flags, OverrideFlags.KeepServerAvatar) || !(avatarUrl || getLocalImage(userId, "avatar")));
    },

    useReplyAvatarProps(props: {
        referencedMessage: ReferencedMessage;
        repliedAuthor: { guildMemberAvatar?: string | null; } | null;
    }) {
        try {
            const userId = props.referencedMessage.message?.author.id;
            settings.use(["users"]);
            useLocalImage(userId, "avatar");
            if (userId && props.repliedAuthor?.guildMemberAvatar && !this.shouldUseGuildAvatar(userId)) {
                return {
                    ...props,
                    repliedAuthor: { ...props.repliedAuthor, guildMemberAvatar: null }
                };
            }
        } catch (error) {
            logger.error("Could not apply reply avatar", error);
        }
        return props;
    },

    getAvatarUrl(user: User, fallback?: string) {
        const { avatarUrl, flags } = getUserOverride(user?.id);
        if (!hasFlag(flags, OverrideFlags.UseDefaultAvatar)) {
            return getLocalImage(user?.id, "avatar") ?? (avatarUrl || fallback);
        }
    },

    useMessageNameProps(context: MessageNameContext) {
        try {
            const { author, channel, message, userOverride } = context;
            const userId = userOverride?.id ?? message?.author?.id;
            const guildId = channel?.guild_id ?? author.guildId;
            const color = useNameColor(userId, guildId, author);
            if (color) {
                return {
                    ...context,
                    author: {
                        ...author,
                        colorString: color,
                        colorStrings: null,
                        [customColorOverride]: true,
                        ...channel?.isPrivate() && { displayNameStyles: null }
                    }
                };
            }
        } catch (error) {
            logger.error("Could not apply message author colour", error);
        }
        return context;
    },

    MemberName: ErrorBoundary.wrap(function MemberName({ member, styledName, roleName }: {
        member: NameColors & { user?: User; guildId?: string; };
        styledName: React.ReactElement | null;
        roleName: React.ReactElement<NameColors>;
    }) {
        const color = useNameColor(member.user?.id, member.guildId, member);
        if (color) {
            return React.cloneElement(roleName, { colorString: color, colorStrings: null });
        }
        return styledName ?? roleName;
    }, { fallback: ({ wrappedProps }) => wrappedProps.styledName ?? wrappedProps.roleName }),

    useAvatar(
        user: User | undefined,
        member: { avatar?: string | null; } | null,
        preview: unknown,
        fallback: string | undefined
    ) {
        try {
            const userId = user?.id;
            const { flags } = useUserOverride(userId);
            const keepGuildAvatar = member?.avatar
                && !hasFlag(flags, OverrideFlags.DisableServerAvatars)
                && hasFlag(flags, OverrideFlags.KeepServerAvatar);
            const useLocal = preview === undefined && !keepGuildAvatar && !hasFlag(flags, OverrideFlags.UseDefaultAvatar);
            return useLocalImage(useLocal ? userId : undefined, "avatar") ?? fallback;
        } catch (error) {
            logger.error("Could not get avatar", error);
            return fallback;
        }
    },

    SummaryAvatar: ErrorBoundary.wrap(function SummaryAvatar({ user, guildId, size, ...props }: {
        user: User;
        guildId?: string;
        size: number;
        alt: string;
        className: string;
    }) {
        const src = useUserAvatarURL(user, guildId, size);
        return <img {...props} src={src} />;
    }, { noop: true }),

    AccountAvatar: ErrorBoundary.wrap(function AccountAvatar({ Component, user, getSrc, ...props }: {
        Component: React.ComponentType<{ src?: string; avatarDecoration?: string; }>;
        user: User;
        getSrc(): string;
        avatarDecoration?: string;
    }) {
        const { flags } = useUserOverride(user.id);
        const useDefault = hasFlag(flags, OverrideFlags.UseDefaultAvatar);
        const local = useLocalImage(useDefault ? undefined : user.id, "avatar");
        const decoration = useDecorationUrl(user.id, 40);
        return (
            <Component
                {...props}
                src={local ?? getSrc()}
                avatarDecoration={decoration ?? props.avatarDecoration}
            />
        );
    }, { noop: true }),

    useBanner(profile: DisplayProfile | undefined, preview: unknown, getSrc: () => string | undefined) {
        try {
            const userId = profile?.userId;
            const { flags } = useUserOverride(userId);
            const keepGuildBanner = profile?._guildMemberProfile?.banner != null
                && !hasFlag(flags, OverrideFlags.DisableServerBanners)
                && hasFlag(flags, OverrideFlags.KeepServerBanner);
            const useLocal = preview === undefined && !keepGuildBanner;
            return useLocalImage(useLocal ? userId : undefined, "banner") ?? getSrc();
        } catch (error) {
            logger.error("Could not get banner", error);
            return;
        }
    },

    useDecorationUrl
});
