/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ImageIcon } from "@components/Icons";
import { StickerFormatType } from "@vencord/discord-types/enums";
import { GuildMemberStore, GuildRoleStore, GuildStore, Menu, showToast, Toasts, UserProfileStore, UserStore } from "@webpack/common";
import { JSX } from "react";

import { settings } from "../settings";
import { ASSET_TYPE_EXTRACTOR, assetAvailability, AssetInfo, AssetSource, AttachmentFlags, CDN_BASE, CustomizedMember, CustomizedUser, d, defaultAssets, DownloadIcon, DownloadifyLogger, DownloadifyNative, ExpandedModalDownloadProps, GDMContextMenuProps, GuildContextMenuProps, HoverDownloadProps, IMAGE_EXT_1_DOMAIN_BASE, IMAGE_EXT_2_DOMAIN_BASE, MEDIA_PROXY_BASE, MessageContextMenuProps, ParsedURL, PRIMARY_DOMAIN_BASE, TENOR_BASE, TENOR_GIF_ID, TENOR_MP4_ID, unknownAttachmentMediaProxy, unknownCDN, unknownExternal, unknownExternalImageProxy, unknownPrimaryDomain, UserContextMenuProps, VoiceMessageDownloadButtonProps } from "./definitions";
import { getFormattedNow, joinOrCreateContextMenuGroup, parseFile, parseURL, sanitizeFilename } from "./misc";

export function MessageContextMenu(children: Array<any>, props: MessageContextMenuProps): void {
    if (!children?.length || !props?.message?.id) {
        return;
    }

    const { allowUnicode } = settings.store;
    let { favoriteableId, favoriteableName, favoriteableType } = props;
    const { itemSrc, itemSafeSrc, message, channel, mediaItem, contextMenuAPIArguments } = props;
    const target = contextMenuAPIArguments?.[0]?.target;
    let targetURL = itemSafeSrc ?? itemSrc;

    const emojiTarget = target.dataset?.type === "emoji"
        ? target
        : target.children?.[1]?.firstChild?.dataset?.type === "emoji"
            ? target.children[1].firstChild
            : target.parentElement?.children?.[1]?.firstChild?.dataset?.type === "emoji"
                ? target.parentElement.children[1].firstChild
                : null;

    if (!!emojiTarget?.dataset?.id) {
        favoriteableType = "emoji";
        favoriteableId = emojiTarget.dataset.id;
        targetURL = emojiTarget.src;
    } else if (!!emojiTarget?.dataset?.name) {
        favoriteableType = "emoji";
        favoriteableName = emojiTarget.alt ?? emojiTarget.dataset.name;
        favoriteableId = null;
        targetURL = emojiTarget.src;
    }

    const roleIconTarget = target.classList && (Array.from(target.classList) as string[]).some(cls => cls.includes("roleIcon"))
        ? target
        : target.firstChild?.classList && (Array.from(target.firstChild.classList) as string[]).some(cls => cls.includes("roleIcon"))
            ? target.firstChild
            : null;

    const clanBadgeTarget = target.classList && (Array.from(target.classList) as string[]).some(cls => cls.includes("badge"))
        ? target
        : target.parentElement?.firstChild?.classList && (Array.from(target.parentElement.firstChild.classList) as string[]).some(cls => cls.includes("badge"))
            ? target.parentElement.firstChild
            : target.firstChild?.firstChild?.classList && (Array.from(target.firstChild.firstChild.classList) as string[]).some(cls => cls.includes("badge"))
                ? target.firstChild.firstChild
                : null;

    if (target.tagName === "VIDEO" && !!target.src) {
        targetURL = contextMenuAPIArguments[0].target.src;
    } else if (target.parentElement?.parentElement?.firstChild?.tagName === "VIDEO" && !!target.parentElement?.parentElement?.firstChild?.src) {
        targetURL = contextMenuAPIArguments[0].target.parentElement.parentElement.firstChild.src;
    } else if (target.parentElement?.parentElement?.parentElement?.firstChild?.tagName === "VIDEO" && !!target.parentElement?.parentElement?.parentElement?.firstChild?.src) {
        targetURL = contextMenuAPIArguments[0].target.parentElement.parentElement.parentElement.firstChild.src;
    } else if (target.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.firstChild?.tagName === "VIDEO" && !!target.parentElement?.parentElement?.parentElement?.parentElement?.parentElement?.firstChild?.src) {
        targetURL = contextMenuAPIArguments[0].target.parentElement.parentElement.parentElement.parentElement.parentElement.firstChild.src;
    }

    const isRoleIcon = !!roleIconTarget;
    const isCustomEmoji = favoriteableType === "emoji" && !!favoriteableId;
    const isUnicodeEmoji = favoriteableType === "emoji" && !favoriteableId;
    const isSticker = favoriteableType === "sticker";
    const isAttachment = !!mediaItem;
    const emojiRegex = favoriteableId ? new RegExp(`<(a)?:(\\w+):(${favoriteableId})>`) : null;
    let emojiName = isUnicodeEmoji ? (favoriteableName?.replaceAll(":", "") || null) : (favoriteableName ?? (emojiRegex?.exec(message.content || "")?.[2] || null));
    let emojiAnimated = isCustomEmoji ? emojiRegex?.exec(message.content || "")?.[1] === "a" : false;
    const emojiURL = (isCustomEmoji || isUnicodeEmoji) ? parseURL(targetURL.replace(CDN_BASE, MEDIA_PROXY_BASE)) : null;
    const sticker = isSticker ? message.stickerItems?.find(sticker => sticker.id === favoriteableId) : null;
    const downloadifyItems: any[] = [];

    function findNestedComponent(components: any[], checkFor: string): any {
        for (const innerComponent of components) {
            if (innerComponent.emoji?.id === checkFor || innerComponent.emoji?.name === checkFor) {
                return innerComponent;
            }

            if (innerComponent.components?.length) {
                const found = findNestedComponent(innerComponent.components, checkFor);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    if (isRoleIcon) {
        const parsedURL = parseURL(roleIconTarget.src.replace(CDN_BASE, MEDIA_PROXY_BASE));
        const isUnicodeRoleIcon = itemSrc.startsWith(PRIMARY_DOMAIN_BASE);
        const isCustomRoleIcon = !isUnicodeRoleIcon;
        const roleID = GuildMemberStore.getMember(channel.guild_id, message.author.id)?.iconRoleId;
        const role = roleID ? GuildRoleStore.getRole(channel.guild_id, roleID) : null;
        const sanitizedRoleName = role ? sanitizeFilename(role.name, allowUnicode) : null;

        downloadifyItems.push(
            <Menu.MenuItem
                id="downloadify-role-icon"
                label={`Download ${role?.name ?? "Role"} Icon`}
                submenuItemLabel={` ${role?.name ?? "Role"} Icon`}
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        parsedURL,
                        sanitizedRoleName ? `${sanitizedRoleName}-icon` : null,
                        isCustomRoleIcon ? assetAvailability["role-icon-custom"] : assetAvailability["role-icon-unicode-emoji"],
                        false
                    );
                }}
            />
        );
    } else if (clanBadgeTarget && !!(message.author as any).primaryGuild) {
        const { primaryGuild } = (message.author as any);
        const sanitizedGuildTag = sanitizeFilename(primaryGuild.tag, allowUnicode);

        downloadifyItems.push(
            <Menu.MenuItem
                id="downloadify-clan-badge"
                label={`Download ${primaryGuild.tag} Clan Badge`}
                submenuItemLabel={`${primaryGuild.tag} Clan Badge`}
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        parseURL(clanBadgeTarget.src.replace(CDN_BASE, MEDIA_PROXY_BASE)),
                        sanitizedGuildTag ? `${sanitizedGuildTag}-clan-badge` : null,
                        assetAvailability["clan-badge"],
                        false
                    );
                }}
            />
        );
    } else if (isCustomEmoji) {
        const reaction = message.reactions?.find(reaction => reaction.emoji.id === favoriteableId)?.emoji;
        const component = message.components?.length ? findNestedComponent(message.components, favoriteableId as string) : null;
        emojiAnimated = component?.emoji?.animated || reaction?.animated || emojiAnimated;
        emojiName = component?.emoji?.name || reaction?.name || emojiName;

        downloadifyItems.push(
            <Menu.MenuItem
                id="downloadify-custom-emoji"
                label={`Download ${emojiName || "Custom Emoji"}`}
                submenuItemLabel={`${emojiName || "Custom Emoji"}`}
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        emojiURL as ParsedURL,
                        emojiName,
                        assetAvailability["custom-emoji"],
                        emojiAnimated
                    );
                }}
            />
        );
    } else if (isUnicodeEmoji) {
        const reaction = message.reactions?.find(reaction => reaction.emoji.name === favoriteableName)?.emoji;
        const component = message.components?.length ? findNestedComponent(message.components, favoriteableName as string) : null;
        emojiName = component?.emoji?.name || reaction?.name || emojiName;
        emojiAnimated = false;

        downloadifyItems.push(
            <Menu.MenuItem
                id="downloadify-unicode-emoji"
                label={`Download ${emojiName || "Unicode Emoji"}`}
                submenuItemLabel={`${emojiName || "Unicode Emoji"}`}
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        emojiURL as ParsedURL,
                        emojiName,
                        assetAvailability["unicode-emoji"],
                        emojiAnimated
                    );
                }}
            />
        );
    } else if (isSticker) {
        let stickerURL;
        let stickerSource;
        let stickerAnimated;

        if (sticker?.format_type === StickerFormatType.PNG) {
            stickerURL = parseURL(`${MEDIA_PROXY_BASE}/stickers/${sticker.id}.png`);
            stickerSource = assetAvailability.sticker.PNG;
            stickerAnimated = false;
        } else if (sticker?.format_type === StickerFormatType.GIF) {
            stickerURL = parseURL(`${MEDIA_PROXY_BASE}/stickers/${sticker.id}.gif`);
            stickerSource = assetAvailability.sticker.GIF;
            stickerAnimated = true;
        } else if (sticker?.format_type === StickerFormatType.APNG) {
            stickerURL = parseURL(`${MEDIA_PROXY_BASE}/stickers/${sticker.id}.png`);
            stickerSource = assetAvailability.sticker.APNG;
            stickerAnimated = true;
        } else if (sticker?.format_type === StickerFormatType.LOTTIE) {
            stickerURL = parseURL(`${CDN_BASE}/stickers/${sticker.id}.json`);
            stickerSource = assetAvailability.sticker.LOTTIE;
            stickerAnimated = true;
        } else {
            return;
        }

        downloadifyItems.push(
            <Menu.MenuItem
                id="downloadify-sticker"
                label={`Download ${sticker.name || "Sticker"}`}
                submenuItemLabel={`${sticker.name || "Sticker"}`}
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        stickerURL,
                        sticker.name,
                        stickerSource,
                        stickerAnimated
                    );
                }}
            />
        );
    } else if (isAttachment) {
        const assetInfo = assetAvailability.attachment[mediaItem.contentType] ?? unknownCDN;
        const attachment = message.attachments?.find(attachment => attachment.proxy_url === mediaItem.proxyUrl || attachment.url === mediaItem.url);

        if (!attachment) {
            return;
        }

        downloadifyItems.push(
            <Menu.MenuItem
                id="downloadify-attachment"
                label="Download Media"
                submenuItemLabel="Media"
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        parseURL(assetInfo.source === AssetSource.CDN ? mediaItem.url : mediaItem.proxyUrl),
                        (attachment as any)?.title || null,
                        assetInfo,
                        !!((attachment as any).flags & AttachmentFlags.IS_ANIMATED)
                    );
                }}
            />
        );
    } else if (targetURL) {
        let isTenor = false;

        const embedImage = message.embeds?.find(embed => {
            const images = (embed as any).images ? (embed as any).images : embed.image ? [embed.image] : [];
            return images.some(image => targetURL.startsWith(image.url) || targetURL.startsWith(image.proxyURL));
        });

        const embedVideo = embedImage ? undefined : message.embeds?.find(embed => {
            isTenor = embed.provider?.name === "Tenor";
            const videos = (embed as any).videos ? (embed as any).videos : embed.video ? [embed.video] : [];
            return videos.some(video => targetURL.startsWith(video.url) || targetURL.startsWith(video.proxyURL));
        });

        const embedThumbnail = message.embeds?.find(embed => {
            return (embed.thumbnail?.url && targetURL.startsWith(embed.thumbnail.url)) || (embed.thumbnail?.proxyURL && targetURL.startsWith(embed.thumbnail.proxyURL));
        });

        const embedAuthor = message.embeds?.find(embed => {
            return (embed.author?.iconURL && targetURL.startsWith(embed.author.iconURL)) || (embed.author?.iconProxyURL && targetURL.startsWith(embed.author.iconProxyURL));
        });

        const embedFooter = (message.embeds?.find(embed => {
            return ((embed as any).footer?.iconURL && targetURL.startsWith((embed as any).footer.iconURL)) || ((embed as any).footer?.iconProxyURL && targetURL.startsWith((embed as any).footer.iconProxyURL));
        }) as any);

        const targetEmbed = (embedImage || embedVideo || embedThumbnail || embedAuthor || embedFooter);
        const targetEmbedItem = (embedImage?.image || embedVideo?.video || embedThumbnail?.thumbnail || embedAuthor?.author || embedFooter?.footer);
        const labelEmbedMedia = embedFooter?.footer
            ? "Footer Icon"
            : embedAuthor?.author
                ? "Author Icon"
                : embedThumbnail?.thumbnail
                    ? "Thumbnail Image"
                    : targetEmbed?.type === "rich" || !!targetEmbed?.provider
                        ? "Embed Media"
                        : "Media";

        downloadifyItems.push(
            <Menu.MenuItem
                id="downloadify-attachment"
                label={isTenor ? "Download Tenor GIF" : `Download ${labelEmbedMedia}`}
                submenuItemLabel={isTenor ? "Tenor GIF" : labelEmbedMedia}
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    let srcIsAnimated = !!(targetEmbedItem as any)?.srcIsAnimated;
                    let aliasBasename: string | null = null;
                    let assetInfo: any;

                    const contentType = ((targetEmbedItem as any)?.contentType || await DownloadifyNative.queryURL(itemSrc));
                    const isMediaProxy = targetURL?.startsWith(MEDIA_PROXY_BASE);
                    const isPrimaryDomain = targetURL?.startsWith(PRIMARY_DOMAIN_BASE);
                    const isCDN = targetURL?.startsWith(CDN_BASE);
                    const isImageExt1 = targetURL?.startsWith(IMAGE_EXT_1_DOMAIN_BASE);
                    const isImageExt2 = targetURL?.startsWith(IMAGE_EXT_2_DOMAIN_BASE);
                    const isImageExt = isImageExt1 || isImageExt2;

                    if (isTenor && embedVideo) {
                        targetURL = embedVideo.url ?? targetURL;
                    }

                    const parsedURL = parseURL(targetURL);

                    if (isTenor) {
                        assetInfo = assetAvailability.tenor;
                        srcIsAnimated = true;
                    } else if (isImageExt) {
                        assetInfo = assetAvailability.attachment[contentType]
                            ?? assetAvailability.external[contentType]
                            ?? unknownExternalImageProxy;
                    } else if (isMediaProxy || isCDN) {
                        const guestimate = guesstimateAsset(parsedURL, contentType);
                        assetInfo = guestimate.assetInfo ?? (isCDN ? unknownCDN : (isImageExt ? unknownExternalImageProxy : unknownExternal));
                        aliasBasename = guestimate.aliasBasename ?? aliasBasename;
                        srcIsAnimated = guestimate.srcIsAnimated ?? srcIsAnimated;
                    } else {
                        assetInfo = isPrimaryDomain ? unknownPrimaryDomain : unknownExternal;
                    }

                    await handleDownload(
                        parsedURL,
                        aliasBasename,
                        assetInfo,
                        srcIsAnimated
                    );
                }}
            />
        );
    }

    if (!downloadifyItems.length) {
        return;
    }

    joinOrCreateContextMenuGroup(
        children,
        downloadifyItems,
        "message-content-group",
        "downloadify-submenu",
        "Download",
        [{
            id: { child: "devmode-copy-id" },
            type: "WITH_GROUP",
            position: "START"
        }]
    );
}

export function GDMContextMenu(children: Array<any>, props: GDMContextMenuProps): void {
    if (!children?.length || !props?.channel?.id) {
        return;
    }

    const { channel } = props;
    const channelIconHash = channel.icon || null;
    const channelIconURL = channelIconHash ? parseURL(`${MEDIA_PROXY_BASE}/channel-icons/${channel.id}/${channelIconHash}.png`) : null;
    const channelTimestamp = Number(BigInt(channel.id) >> 22n);
    const defaultChannelIconURL = channelTimestamp ? parseURL(`${PRIMARY_DOMAIN_BASE}${defaultAssets.DEFAULT_GROUP_DM_AVATARS[channelTimestamp % 8]}`) : null;

    const downloadifyItems = [
        channelIconURL ? (
            <Menu.MenuItem
                id="downloadify-gdm-channel-icon"
                label="Download Group Icon"
                submenuItemLabel="Group Icon"
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        channelIconURL,
                        channel.name ? `${channel.name}-group-icon` : null,
                        assetAvailability["guild-icon"],
                        false
                    );
                }}
            />
        ) : null,
        defaultChannelIconURL ? (
            <Menu.MenuItem
                id="downloadify-default-gdm-channel-icon"
                label="Download Default Icon"
                submenuItemLabel="Default Icon"
                icon={() => ImageIcon({ width: 20, height: 20 })}
                action={async () => {
                    await handleDownload(
                        defaultChannelIconURL,
                        channel.name ? `${channel.name}-default-group-icon` : null,
                        assetAvailability["default-group-icon"],
                        false
                    );
                }}
            />
        ) : null
    ].filter(Boolean);

    joinOrCreateContextMenuGroup(
        children,
        downloadifyItems,
        "channel-content-group",
        "downloadify-submenu",
        "Download",
        [{
            id: { child: "devmode-copy-id" },
            type: "WITH_GROUP",
            position: "START"
        }]
    );
}

export function GuildContextMenu(children: Array<any>, props: GuildContextMenuProps): void {
    if (!children?.length || !props?.guild?.id) {
        return;
    }

    const { guild } = props;
    const guildIconHash = guild.icon || null;
    const guildBannerHash = guild.banner || null;
    const guildInviteHash = guild.splash !== guildBannerHash ? guild.splash || null : null;
    const guildDiscoveryHash = guild.discoverySplash !== guildInviteHash && guild.discoverySplash !== guildBannerHash ? guild.discoverySplash || null : null;
    const guildIconHashAnimated = guildIconHash?.startsWith("a_");
    const guildBannerHashAnimated = guildBannerHash?.startsWith("a_");
    const guildIconURL = guildIconHash ? parseURL(`${MEDIA_PROXY_BASE}/icons/${guild.id}/${guildIconHash}.${guildIconHashAnimated ? "gif" : "png"}`) : null;
    const guildBannerURL = guildBannerHash ? parseURL(`${MEDIA_PROXY_BASE}/banners/${guild.id}/${guildBannerHash}.${guildBannerHashAnimated ? "gif" : "png"}`) : null;
    const guildInviteURL = guildInviteHash ? parseURL(`${MEDIA_PROXY_BASE}/splashes/${guild.id}/${guildInviteHash}.png`) : null;
    const guildDiscoveryURL = guildDiscoveryHash ? parseURL(`${MEDIA_PROXY_BASE}/discovery-splashes/${guild.id}/${guildDiscoveryHash}.png`) : null;

    if (!guildIconURL && !guildBannerURL && !guildInviteURL && !guildDiscoveryURL) {
        return;
    }

    const downloadifyItems = [guildIconURL ? (
        <Menu.MenuItem
            id="downloadify-guild-icon"
            label="Download Icon"
            submenuItemLabel="Icon"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                guildIconURL,
                guild.name ? `${guild.name}-icon` : null,
                assetAvailability["guild-icon"],
                !!guildIconHash?.startsWith("a_")
            )}
        />
    ) : null,
    guildBannerURL ? (
        <Menu.MenuItem
            id="downloadify-guild-banner"
            label="Download Banner"
            submenuItemLabel="Banner"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                guildBannerURL,
                guild.name ? `${guild.name}-banner` : null,
                assetAvailability["guild-banner"],
                !!guildBannerHash?.startsWith("a_")
            )}
        />
    ) : null,
    guildInviteURL ? (
        <Menu.MenuItem
            id="downloadify-guild-invite-splash"
            label="Download Invite Splash"
            submenuItemLabel="Invite Splash"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                guildInviteURL,
                guild.name ? `${guild.name}-invite-splash` : null,
                assetAvailability["guild-invite-splash"],
                !!guildInviteHash?.startsWith("a_")
            )}
        />
    ) : null,
    guildDiscoveryURL ? (
        <Menu.MenuItem
            id="downloadify-guild-discovery-splash"
            label="Download Discovery Splash"
            submenuItemLabel="Discovery Splash"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                guildDiscoveryURL,
                guild.name ? `${guild.name}-discovery-splash` : null,
                assetAvailability["guild-discovery-splash"],
                !!guildDiscoveryHash?.startsWith("a_")
            )}
        />
    ) : null].filter(Boolean);

    joinOrCreateContextMenuGroup(
        children,
        downloadifyItems,
        "guild-content-group",
        "downloadify-submenu",
        "Download",
        [{
            id: { child: "devmode-copy-id" },
            type: "WITH_GROUP",
            position: "START"
        },
        {
            id: { child: "privacy" },
            type: "WITH_GROUP",
            position: "END"
        }]
    );
}

export function UserContextMenu(children: Array<any>, props: UserContextMenuProps): void {
    if (!children?.length || !props.user?.id) {
        return;
    }

    const user = UserStore.getUser(props.user.id) as CustomizedUser;
    const member = (props.guildId ? GuildMemberStore.getMember(props.guildId, props.user.id) : null) as CustomizedMember | null;
    const guild = props.guildId ? GuildStore.getGuild(props.guildId) : null;
    const userAvatarHash = user.avatar || null;
    const memberAvatarHash = member?.avatar || null;
    const userBannerHash = UserProfileStore.getUserProfile(user.id)?.banner || null;
    const memberBannerHash = UserProfileStore.getGuildMemberProfile(user.id, props.guildId)?.banner || null;
    const userAvatarDecorationHash = user.avatarDecorationData?.asset || null;
    const memberAvatarDecorationHash = member?.avatarDecoration?.asset || null;
    const userNameplatePath = user.collectibles?.nameplate?.asset || null;
    const userAvatarURL = userAvatarHash ? parseURL(`${MEDIA_PROXY_BASE}/avatars/${user.id}/${userAvatarHash}.png`) : null;
    const memberAvatarURL = memberAvatarHash ? parseURL(`${MEDIA_PROXY_BASE}/guilds/${props.guildId}/users/${user.id}/avatars/${memberAvatarHash}.png`) : null;
    const userBannerURL = userBannerHash ? parseURL(`${MEDIA_PROXY_BASE}/banners/${user.id}/${userBannerHash}.png`) : null;
    const memberBannerURL = memberBannerHash ? parseURL(`${MEDIA_PROXY_BASE}/guilds/${props.guildId}/users/${user.id}/banners/${memberBannerHash}.png`) : null;
    const userAvatarDecorationURL = userAvatarDecorationHash ? parseURL(`${MEDIA_PROXY_BASE}/avatar-decoration-presets/${userAvatarDecorationHash}.png`) : null;
    const memberAvatarDecorationURL = memberAvatarDecorationHash ? parseURL(`${MEDIA_PROXY_BASE}/avatar-decoration-presets/${memberAvatarDecorationHash}.png`) : null;
    const userNameplateURL = userNameplatePath ? parseURL(`${CDN_BASE}/assets/collectibles/${userNameplatePath}static.png`) : null;
    const defaultUserAvatarURL = parseURL(`${PRIMARY_DOMAIN_BASE}${defaultAssets.DEFAULT_AVATARS[user.discriminator === "0" ? (Math.floor(Number(BigInt(user.id) >> 22n)) % 6) : (Number(user.discriminator) % 5)]}`);

    const downloadifyItems = [userAvatarURL ? (
        <Menu.MenuItem
            id="downloadify-user-avatar"
            label="Download User Avatar"
            submenuItemLabel="User Avatar"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                userAvatarURL,
                `${user.username}-avatar`,
                assetAvailability["user-avatar"],
                !!userAvatarHash?.startsWith("a_")
            )}
        />
    ) : null,
    userBannerURL ? (
        <Menu.MenuItem
            id="downloadify-user-banner"
            label="Download User Banner"
            submenuItemLabel="User Banner"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                userBannerURL,
                `${user.username}-banner`,
                assetAvailability["user-banner"],
                !!userBannerHash?.startsWith("a_")
            )}
        />
    ) : null,
    userAvatarDecorationURL ? (
        <Menu.MenuItem
            id="downloadify-user-avatar-decoration"
            label="Download User Avatar Decoration"
            submenuItemLabel="User Avatar Decoration"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                userAvatarDecorationURL,
                `${user.username}-avatar-decoration`,
                assetAvailability["avatar-decoration"],
                true
            )}
        />
    ) : null,
    memberAvatarURL ? (
        <Menu.MenuItem
            id="downloadify-member-avatar"
            label="Download Member Avatar"
            submenuItemLabel="Member Avatar"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                memberAvatarURL,
                guild ? `${guild.name}-${user.username}-avatar` : `${user.username}-avatar`,
                assetAvailability["user-avatar"],
                !!memberAvatarHash?.startsWith("a_")
            )}
        />
    ) : null,
    memberBannerURL ? (
        <Menu.MenuItem
            id="downloadify-member-banner"
            label="Download Member Banner"
            submenuItemLabel="Member Banner"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                memberBannerURL,
                guild ? `${guild.name}-${user.username}-banner` : `${user.username}-banner`,
                assetAvailability["user-banner"],
                !!memberBannerHash?.startsWith("a_")
            )}
        />
    ) : null,
    memberAvatarDecorationURL ? (
        <Menu.MenuItem
            id="downloadify-member-avatar-decoration"
            label="Download Member Avatar Decoration"
            submenuItemLabel="Member Avatar Decoration"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                memberAvatarDecorationURL,
                guild ? `${guild.name}-${user.username}-avatar-decoration` : `${user.username}-avatar-decoration`,
                assetAvailability["avatar-decoration"],
                true
            )}
        />
    ) : null,
    defaultUserAvatarURL ? (
        <Menu.MenuItem
            id="downloadify-default-user-avatar"
            label="Download Default Avatar"
            submenuItemLabel="Default Avatar"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                defaultUserAvatarURL,
                `${user.username}-default-avatar`,
                assetAvailability["default-user-avatar"],
                false
            )}
        />
    ) : null,
    userNameplateURL ? (
        <Menu.MenuItem
            id="downloadify-user-nameplate"
            label="Download Nameplate"
            submenuItemLabel="Nameplate"
            icon={() => ImageIcon({ width: 20, height: 20 })}
            action={async () => await handleDownload(
                userNameplateURL,
                `${user.username}-nameplate`,
                assetAvailability.nameplate,
                true
            )}
        />
    ) : null].filter(Boolean);

    joinOrCreateContextMenuGroup(
        children,
        downloadifyItems,
        "user-content-group",
        "downloadify-submenu",
        "Download",
        [{
            id: { child: "devmode-copy-id" },
            type: "WITH_GROUP",
            position: "START"
        },
        {
            id: { child: "user-profile" },
            type: "WITH_GROUP",
            position: "END"
        }]
    );
}

export async function handleHoverDownloadButtonClicked(props: HoverDownloadProps): Promise<void> {
    let { contentType } = props.item;
    const { type, downloadUrl, srcIsAnimated, originalItem } = props.item;
    const { displayStatus, statusDuration } = settings.store;

    if (!originalItem) {
        // Fallback to default behavior.
        DownloadifyLogger.info(`[${getFormattedNow()}] [UNRECOGNIZED HOVER DOWNLOAD ITEM]`, props.item);
        displayStatus && showToast("Unknown Media Item. Falling Back to Default Behavior", Toasts.Type.MESSAGE, { duration: statusDuration * 1250 });
        window.open(downloadUrl, "_blank");
    } else {
        contentType ??= (await DownloadifyNative.queryURL(downloadUrl) || "");
        const assetInfo = (type === "IMAGE" ? (assetAvailability.attachment[contentType]) : null) ?? unknownCDN;

        await handleDownload(
            parseURL(assetInfo.source === AssetSource.CDN ? downloadUrl : originalItem.proxy_url),
            originalItem.title || null,
            assetInfo,
            !!srcIsAnimated
        );
    }
}

export async function handleExpandedModalDownloadButtonClicked(props: ExpandedModalDownloadProps, fallback: () => Promise<void>): Promise<void> {
    let { contentType, srcIsAnimated } = props.item;
    const { url, original, proxyUrl, sourceMetadata } = props.item;
    const { displayStatus, statusDuration } = settings.store;

    if (!url && !original) {
        // Fallback to default behavior.
        DownloadifyLogger.info(`[${getFormattedNow()}] [UNRECOGNIZED EXPANDED MODAL DOWNLOAD ITEM]`, props.item);
        displayStatus && showToast("Unknown Media Item. Falling Back to Default Behavior", Toasts.Type.MESSAGE, { duration: statusDuration * 1250 });
        await fallback();
    } else {
        contentType ??= (await DownloadifyNative.queryURL(url) || "");
        let aliasBasename = sourceMetadata?.identifier.title ?? null;
        const isAttachment = sourceMetadata?.identifier.type === "attachment";
        const urlIsMediaProxy = url?.startsWith(MEDIA_PROXY_BASE);
        const originalIsMediaProxy = original?.startsWith(MEDIA_PROXY_BASE);
        const isMediaProxy = urlIsMediaProxy || originalIsMediaProxy;
        const isPrimaryDomain = original?.startsWith(PRIMARY_DOMAIN_BASE);
        const isCDN = original?.startsWith(CDN_BASE);
        const isImageExt1 = url?.startsWith(IMAGE_EXT_1_DOMAIN_BASE);
        const isImageExt2 = url?.startsWith(IMAGE_EXT_2_DOMAIN_BASE);
        const isImageExt = isImageExt1 || isImageExt2;
        let parsedURL: ParsedURL;
        let assetInfo: any;

        if (isAttachment) {
            parsedURL = parseURL(proxyUrl || url);
            assetInfo = assetAvailability.attachment[contentType] ?? unknownAttachmentMediaProxy;
        } else if (isImageExt) {
            parsedURL = parseURL(url);
            assetInfo = assetAvailability.attachment[contentType] ?? assetAvailability.external[contentType] ?? unknownExternalImageProxy;
        } else if (isMediaProxy || isCDN) {
            parsedURL = parseURL(urlIsMediaProxy ? url : original);
            const guestimate = guesstimateAsset(parsedURL, contentType);
            assetInfo = guestimate.assetInfo ?? (isCDN ? unknownCDN : unknownExternal);
            aliasBasename = guestimate.aliasBasename ?? aliasBasename;
            srcIsAnimated = guestimate.srcIsAnimated ?? srcIsAnimated;
        } else {
            parsedURL = parseURL(original ?? url);
            assetInfo = isPrimaryDomain ? unknownPrimaryDomain : unknownExternal;
        }

        await handleDownload(
            parsedURL,
            aliasBasename,
            assetInfo,
            !!srcIsAnimated,
        );
    }
}

function guesstimateAsset(parsedURL: ParsedURL, contentType: string): {
    assetInfo?: AssetInfo;
    aliasBasename?: string;
    srcIsAnimated?: boolean;
} {
    // Check if the URL is a known asset type. The only defined member
    // of assetAvailability that we can't completely check for here are stickers
    // due to their format information not being present in the URL. We can make
    // accurate guesses based on certain extensions, but not for every format.
    let assetInfo: AssetInfo | undefined;
    let aliasBasename: string | undefined;
    let srcIsAnimated: boolean | undefined;
    const detected = parsedURL.url.match(ASSET_TYPE_EXTRACTOR);
    const detectedPrimary = detected?.[1] ?? "";
    const detectedSecondary = detected?.[2] ?? "";
    const detectedTertiary = detected?.[3] ?? "";

    if (detectedPrimary === "attachments") {
        assetInfo = assetAvailability.attachment[contentType];
    } else if (detectedPrimary === "emojis") {
        assetInfo = assetAvailability["custom-emoji"];
    } else if (detectedPrimary === "clan-badges") {
        assetInfo = assetAvailability["clan-badge"];
    } else if (detectedPrimary === "role-icons") {
        assetInfo = assetAvailability["role-icon-custom"];
    } else if (detectedPrimary === "discovery-splashes") {
        assetInfo = assetAvailability["guild-discovery-splash"];
    } else if (detectedPrimary === "splashes") {
        assetInfo = assetAvailability["guild-invite-splash"];
    } else if (detectedPrimary === "banners") {
        assetInfo = assetAvailability["guild-banner"];
    } else if (detectedPrimary === "icons") {
        assetInfo = assetAvailability["guild-icon"];
    } else if (detectedPrimary === "avatar-decoration-presets") {
        assetInfo = assetAvailability["avatar-decoration"];
        srcIsAnimated = true; // Avatar decorations always have animated variants.
    } else if (detectedPrimary === "avatars" || (detectedPrimary === "guilds" && detectedSecondary === "avatars")) {
        assetInfo = assetAvailability["user-avatar"];
    } else if (detectedPrimary === "banners" || (detectedPrimary === "guilds" && detectedSecondary === "banners")) {
        assetInfo = assetAvailability["user-banner"];
    } else if (detectedPrimary === "assets/collectibles/nameplates") {
        assetInfo = assetAvailability.nameplate;
        aliasBasename = detectedTertiary ?? "nameplate";
        srcIsAnimated = true; // Nameplates always have animated variants.
    } else if (detectedPrimary === "stickers") {
        if (parsedURL.extension === "gif") {
            assetInfo = assetAvailability.sticker.GIF;
        } else if (parsedURL.extension === "webp") {
            if (srcIsAnimated) {
                assetInfo = assetAvailability.sticker.GIF;
            } else {
                // There is no way to know if a static WEBP sticker
                // link is sourced from an APNG, PNG, or GIF sticker.
            }
        } else if (parsedURL.extension === "png") {
            if (srcIsAnimated) {
                assetInfo = assetAvailability.sticker.PNG;
            } else {
                // There is no way to know if a static PNG sticker
                // link is sourced from an APNG, PNG, or GIF sticker.
            }
        } else if (parsedURL.extension === "jpg") {
            // There is no way to know if a JPG sticker link
            // is sourced from an APNG, PNG, or GIF sticker.
        }
    }

    return {
        assetInfo,
        aliasBasename,
        srcIsAnimated
    };
}

export function VoiceMessageDownloadButton(props: VoiceMessageDownloadButtonProps): JSX.Element {
    async function voiceMessageDownloadClicked(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        const { item, message } = props;
        const { proxy_url } = item.originalItem;
        const baseName = `voice-message-${message.id}`;
        const parsedURL = parseURL(proxy_url);

        await handleDownload(
            parsedURL,
            baseName,
            { source: AssetSource.ATTACHMENT_MEDIA_PROXY, static: [], animated: [] },
            false,
        );
    }

    const { voiceMessages } = settings.use(["voiceMessages"]);

    return (
        <>
            {voiceMessages && <div className={d("voice-message-container")}>
                <button
                    onClick={voiceMessageDownloadClicked}
                    className={d("voice-message-button")}
                    aria-label="Download Voice Message"
                    rel="noreferrer noopener"
                >
                    {DownloadIcon({ width: 20, height: 20 })}
                </button>
            </div>}
        </>
    );
}

/**
 * Common download handler for all other handlers.
 */
async function handleDownload(
    url: ParsedURL,
    alias: string | null,
    asset: AssetInfo,
    animated: boolean,
) {
    const extensions = animated || !!asset.forceAnimated ? asset.animated : asset.static;
    extensions.length < 1 && url.extension && extensions.push(url.extension);
    const { defaultDirectory, overwriteFiles, displayStatus, allowUnicode, statusDuration } = settings.store;
    const baseName = alias
        ? sanitizeFilename(alias, allowUnicode, "discord-download")
        : url.baseName
            ? sanitizeFilename(url.baseName, allowUnicode, "discord-download")
            : "discord-download";

    let chosenExtension = extensions[0] ?? "";
    let resolvedExtension = (chosenExtension).replace("apng", "png").replace("awebp", "webp");
    let resolvedPath: string | null = null;
    let resolvedURL = url.url;

    if (defaultDirectory) {
        const resolvedDirectory = defaultDirectory.trim().replace(/^["']|["']$/g, "").replace(/[/\\]+$/, "").replace(/\\/g, "/");
        resolvedPath = `${resolvedDirectory}/${baseName}${resolvedExtension ? `.${resolvedExtension}` : ""}`;
        displayStatus && showToast("Download Started", Toasts.Type.MESSAGE, { duration: statusDuration * 1000 });

        if (!overwriteFiles) {
            for (let num = 1; await DownloadifyNative.fileExists(resolvedPath); num++) {
                resolvedPath = `${resolvedDirectory}/${baseName}-${num}${resolvedExtension ? `.${resolvedExtension}` : ""}`;
            }
        }
    } else {
        try {
            resolvedPath = await DownloadifyNative.getFilePath(baseName, extensions);

            if (!resolvedPath) {
                DownloadifyLogger.info(`[${getFormattedNow()}] [SAVE DIALOGUE CLOSED / DOWNLOAD CANCELED]`);
                displayStatus && showToast("Download Canceled", Toasts.Type.MESSAGE, { duration: statusDuration * 1000 });
                return;
            }

            const chosenFile = parseFile(resolvedPath);
            chosenExtension = chosenFile.extension || "";
            resolvedExtension = (chosenExtension || "").replace("apng", "png").replace("awebp", "webp");

            if (url.extension) {
                const extReplacer = new RegExp(`\\.${chosenExtension}(?!.*\\.${chosenExtension})`, "i");
                resolvedPath = resolvedPath.replace(extReplacer, `.${resolvedExtension}`);
            }
        } catch (error) {
            DownloadifyLogger.error(`[${getFormattedNow()}] [ERROR OPENING SAVE DIALOGUE]:`, error);
            displayStatus && showToast("Error Opening Save Dialogue", Toasts.Type.FAILURE, { duration: statusDuration * 1000 });
            return;
        }
    }

    try {
        let success = false;

        if ([AssetSource.ASSET_MEDIA_PROXY, AssetSource.ATTACHMENT_MEDIA_PROXY, AssetSource.EXTERNAL_IMAGE_PROXY].includes(asset.source)) {
            let baseURL;

            if (asset.source === AssetSource.ASSET_MEDIA_PROXY) {
                baseURL = url.host + url.path + url.baseName + (resolvedExtension ? `.${resolvedExtension}` : "");
            } else {
                // Attachments on the media proxy use the `format` query parameter (seen below) to retrieve alternate
                // formats instead of changing the file extension directly like assets on the media proxy do.
                baseURL = url.host + url.path + url.baseName +
                    (url.extension ? `.${url.extension}` : "") +
                    (url.twitterExtra ? encodeURIComponent(url.twitterExtra) : "");
            }

            const authParams = url.params.expiry;
            const newURL = new URL(baseURL);

            Object.entries(authParams).forEach(([key, value]) => {
                newURL.searchParams.append(key, value);
            });

            if ([AssetSource.ATTACHMENT_MEDIA_PROXY, AssetSource.EXTERNAL_IMAGE_PROXY].includes(asset.source)) {
                if (url.extension !== resolvedExtension) {
                    newURL.searchParams.append("format", resolvedExtension.replace("jpg", "jpeg"));
                }
            } else {
                // Attachments on the media proxy do not support
                // resizing but assets on the media proxy do.
                newURL.searchParams.append("size", "4096");
            }

            if (chosenExtension === "awebp" && animated) {
                newURL.searchParams.append("animated", "true");
            } else if (chosenExtension === "png" && animated) {
                newURL.searchParams.append("passthrough", "false");
            }

            if (resolvedExtension === "webp") {
                newURL.searchParams.append("lossless", "true");
            }

            resolvedURL = newURL.href;
        } else if (asset.source === AssetSource.CDN) {
            if (asset.type === "nameplate") {
                resolvedURL = url.host + url.path + (
                    chosenExtension === "apng"
                        ? "img.png"
                        : chosenExtension === "webm"
                            ? "asset.webm"
                            : "static.png"
                );
            } else {
                // Currently only the LOTTIE sticker.
                resolvedURL = url.url;
            }
        } else if (asset.source === AssetSource.TENOR) {
            const tenorID = url.path.replaceAll("/", "").slice(0, -2);

            if (chosenExtension === "gif") {
                resolvedURL = `${TENOR_BASE}/${tenorID}${TENOR_GIF_ID}/tenor.gif`;
            } else if (chosenExtension === "mp4") {
                resolvedURL = `${TENOR_BASE}/${tenorID}${TENOR_MP4_ID}/tenor.mp4`;
            } else {
                DownloadifyLogger.warn(`[${getFormattedNow()}] [UNSUPPORTED TENOR EXTENSION]\n${chosenExtension}\n${resolvedPath}\n${resolvedURL}`);
                displayStatus && showToast("Unsupported Tenor Extension", Toasts.Type.FAILURE, { duration: statusDuration * 1000 });
                return;
            }
        } else if ([AssetSource.EXTERNAL, AssetSource.PRIMARY_DOMAIN].includes(asset.source)) {
            resolvedURL = url.url;
        }

        DownloadifyLogger.info(`[${getFormattedNow()}] [STARTING DOWNLOAD]\n${resolvedPath}\n${resolvedURL}`);
        success = await DownloadifyNative.downloadURL(resolvedURL, resolvedPath);

        if (success) {
            DownloadifyLogger.info(`[${getFormattedNow()}] [DOWNLOAD SUCCESS]\n${resolvedPath}\n${resolvedURL}`);
            displayStatus && showToast("File Downloaded", Toasts.Type.SUCCESS, { duration: statusDuration * 1000 });
        } else {
            DownloadifyLogger.error(`[${getFormattedNow()}] [DOWNLOAD FAILED]\n${resolvedPath}\n${resolvedURL}`);
            displayStatus && showToast("File Download Failed", Toasts.Type.FAILURE, { duration: statusDuration * 1000 });
        }
    } catch (error) {
        DownloadifyLogger.error(`[${getFormattedNow()}] [DOWNLOAD ERRORED]\n${resolvedPath}\n${resolvedURL}`, error);
        displayStatus && showToast("Error Downloading File", Toasts.Type.FAILURE, { duration: statusDuration * 1000 });
    }
}
