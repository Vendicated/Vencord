/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { Channel, Guild, GuildMember, Message, User } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { JSX } from "react";

export const d = classNameFactory("downloadify-");
export const CDN_BASE = "https://cdn.discordapp.com";
export const MEDIA_PROXY_BASE = "https://media.discordapp.net";
export const PRIMARY_DOMAIN_BASE = "https://discord.com";
export const IMAGE_EXT_1_DOMAIN_BASE = "https://images-ext-1.discordapp.net";
export const IMAGE_EXT_2_DOMAIN_BASE = "https://images-ext-2.discordapp.net";
export const TENOR_BASE = "https://c.tenor.com";
export const TENOR_GIF_ID = "Ad";
export const TENOR_MP4_ID = "Po";
export const ASSET_TYPE_EXTRACTOR = new RegExp(/^https:\/\/(?:cdn\.discordapp\.com|media.discordapp.net)\/([a-z-]+(?:\/[a-z-]+){0,2})(?:(?:\/\d+\/[a-z-]+\/\d+\/([a-z-]+))|(?:\/([a-z-]+(?:\/[a-z-_]+)?)))?/i);
export const DownloadifyLogger = new Logger("Downloadify");
export const DownloadifyNative = VencordNative.pluginHelpers.Downloadify as PluginNative<typeof import("../native")>;
export const defaultAssets = findByPropsLazy("DEFAULT_GROUP_DM_AVATARS") as DefaultAssets;

interface DefaultAssets {
    BOT_AVATARS: Record<string, string>;
    DEFAULT_AVATARS: string[];
    DEFAULT_CHANNEL_ICON: string;
    DEFAULT_GROUP_DM_AVATARS: string[];
    DEFAULT_PROVISIONAL_AVATARS: string[];
}

export interface AssetInfo {
    source: AssetSource;
    static: string[];
    animated: string[];
    type?: string;
    forceAnimated?: boolean;
}

export enum AssetSource {
    CDN = "cdn",
    EXTERNAL_IMAGE_PROXY = "external_image_proxy",
    ATTACHMENT_MEDIA_PROXY = "attachment_media_proxy",
    ASSET_MEDIA_PROXY = "asset_media_proxy",
    PRIMARY_DOMAIN = "primary_domain",
    EXTERNAL = "external",
    TENOR = "tenor"
}

export const unknownExternal = {
    source: AssetSource.EXTERNAL,
    static: [],
    animated: []
};

export const unknownPrimaryDomain = {
    source: AssetSource.PRIMARY_DOMAIN,
    static: [],
    animated: []
};

export const unknownCDN = {
    source: AssetSource.CDN,
    static: [],
    animated: []
};

export const unknownAssetMediaProxy = {
    source: AssetSource.ASSET_MEDIA_PROXY,
    static: [],
    animated: []
};

export const unknownAttachmentMediaProxy = {
    source: AssetSource.ATTACHMENT_MEDIA_PROXY,
    static: [],
    animated: []
};

export const unknownExternalImageProxy = {
    source: AssetSource.EXTERNAL_IMAGE_PROXY,
    static: [],
    animated: []
};

export const defaultResourceAvailability = {
    source: AssetSource.PRIMARY_DOMAIN,
    static: ["png"],
    animated: []
};

export const APNGAvailability = {
    source: AssetSource.ASSET_MEDIA_PROXY,
    static: ["png", "webp", "jpg"],
    animated: ["apng", "png", "webp", "jpg"]
};

export const hashableAvailability = {
    source: AssetSource.ASSET_MEDIA_PROXY,
    static: ["png", "webp", "jpg"],
    animated: ["gif", "awebp", "png", "webp", "jpg"]
};

// Defines known asset type availability. Unknown types which may be
// encountered are AssetSource.EXTERNAL which are present in some embeds,
// as well as OTHER attachment types.
export const assetAvailability = {
    "user-avatar": hashableAvailability,
    "user-banner": hashableAvailability,
    "avatar-decoration": APNGAvailability,
    "clan-badge": {
        source: AssetSource.ASSET_MEDIA_PROXY,
        static: ["png"],
        animated: []
    },
    "nameplate": {
        source: AssetSource.CDN,
        static: ["png"],
        animated: ["webm", "apng", "png"],
        type: "nameplate"
    },
    "default-user-avatar": defaultResourceAvailability,
    "default-group-icon": defaultResourceAvailability,
    "role-icon-custom": {
        source: AssetSource.ASSET_MEDIA_PROXY,
        static: ["png", "webp", "jpg"],
        animated: [],
    },
    "role-icon-unicode-emoji": {
        source: AssetSource.PRIMARY_DOMAIN,
        static: ["svg"],
        animated: [],
    },
    "guild-icon": hashableAvailability,
    "guild-banner": hashableAvailability,
    "guild-invite-splash": hashableAvailability,
    "guild-discovery-splash": hashableAvailability,
    "custom-emoji": hashableAvailability,
    "unicode-emoji": {
        source: AssetSource.PRIMARY_DOMAIN,
        static: ["svg"],
        animated: []
    },
    "sticker": {
        "APNG": APNGAvailability,
        "PNG": {
            source: AssetSource.ASSET_MEDIA_PROXY,
            static: ["png", "webp", "jpg"],
            animated: []
        },
        "GIF": {
            source: AssetSource.ASSET_MEDIA_PROXY,
            static: [],
            animated: ["gif", "awebp", "png", "webp", "jpg"],
            forceAnimated: true
        },
        "LOTTIE": {
            source: AssetSource.CDN,
            static: ["json"],
            animated: ["json"]
        },
    },
    "tenor": {
        source: AssetSource.TENOR,
        static: [],
        animated: ["gif", "mp4"],
        forceAnimated: true
    },
    "external": {
        "image/png": {
            source: AssetSource.EXTERNAL_IMAGE_PROXY,
            static: ["png", "webp", "jpg"],
            animated: []
        },
        "image/webp": {
            source: AssetSource.EXTERNAL_IMAGE_PROXY,
            static: ["png", "webp", "jpg"],
            animated: []
        },
        "image/jpeg": {
            source: AssetSource.EXTERNAL_IMAGE_PROXY,
            static: ["png", "webp", "jpg"],
            animated: []
        },
        "video/mp4": {
            source: AssetSource.EXTERNAL,
            static: [],
            animated: ["mp4"],
            forceAnimated: true
        },
    },
    "attachment": {
        // Image attachments over a certain size and/or resolution are treated as
        // non-image files and are therefore not available in alternative formats.
        // This is designated by an attachment type of OTHER instead of IMAGE.
        "image/png": {
            source: AssetSource.ATTACHMENT_MEDIA_PROXY,
            static: ["png", "webp", "jpg"],
            // APNG attachments are technically supported, but appear to get
            // broken by Discord squashing them into static PNGs. APNG is kept
            // here in case it is fixed some day.
            animated: ["apng", "png", "webp", "jpg"]
        },
        "image/webp": {
            source: AssetSource.ATTACHMENT_MEDIA_PROXY,
            static: ["webp", "png", "jpg"],
            animated: ["awebp", "webp", "png", "jpg"]
        },
        "image/avif": {
            source: AssetSource.ATTACHMENT_MEDIA_PROXY,
            static: ["avif", "png", "webp"],
            animated: ["avif", "awebp", "png", "webp"]
        },
        "image/jpeg": {
            source: AssetSource.ATTACHMENT_MEDIA_PROXY,
            static: ["jpg", "png", "webp"],
            animated: []
        },
        "image/gif": {
            source: AssetSource.ATTACHMENT_MEDIA_PROXY,
            static: [],
            animated: ["gif", "awebp", "png", "webp", "jpg"],
            forceAnimated: true
        },
    }
};

export function DownloadIcon({ width, height }: { width: number; height: number; }): JSX.Element {
    return (
        <svg
            className={d("-download-icon")}
            role="img"
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path
                d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1ZM3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z"
            />
        </svg>
    );
}

export interface ParsedFile {
    path: string;
    baseName: string;
    extension: string | null;
    twitterExtra: string | null;
}

export interface ParsedURL {
    url: string;
    host: string;
    path: string;
    baseName: string;
    extension: string | null;
    params: { expiry: Record<string, string>, other: Record<string, string>; };
    twitterExtra: string | null;
}

export interface InsertGroup {
    id: { group?: string, child?: string; };
    type: "WITH_GROUP" | "BEFORE_GROUP" | "AFTER_GROUP";
    position?: "START" | "END";
}

export interface VoiceMessageDownloadButtonProps {
    message: Message;
    item: {
        type: "AUDIO";
        originalItem: {
            filename: string;
            proxy_url: string;
        };
    };
}

export interface HoverDownloadProps {
    item: {
        type: "AUDIO" | "IMAGE" | "VIDEO" | "OTHER";
        downloadUrl: string;
        contentType: string;
        srcIsAnimated: boolean;
        originalItem: {
            title?: string;
            filename: string;
            proxy_url: string;
            url: string;
        };
    };
}

export interface ExpandedModalDownloadProps {
    item: {
        type: "AUDIO" | "IMAGE" | "VIDEO" | "OTHER";
        url: string;
        original: string;
        proxyUrl?: string;
        contentType?: string;
        srcIsAnimated: boolean;
        sourceMetadata?: {
            identifier: {
                type: "attachment" | "embed";
                title?: string;
            },
        };
    };
}

export interface MessageContextMenuProps {
    message: Message;
    channel: Channel;
    itemSrc: string;
    itemSafeSrc?: string;
    favoriteableType: "sticker" | "emoji" | null;
    favoriteableName: string | null;
    favoriteableId: string | null;
    contextMenuAPIArguments: any[];
    mediaItem?: {
        contentType: string;
        proxyUrl: string;
        url: string;
    };
}

export interface GDMContextMenuProps {
    channel: Channel & {
        icon: string | null;
    };
}

export interface GuildContextMenuProps {
    guild: Guild;
}

export interface UserContextMenuProps {
    user: User;
    guildId?: string;
}

export interface CustomizedUser extends User {
    avatarDecorationData: null | {
        asset: string;
    };
    collectibles: null | Record<"nameplate", {
        asset: string;
        label: string;
        palette: string;
    }>;
}

export interface CustomizedMember extends Omit<GuildMember, "avatarDecoration"> {
    avatarDecoration: null | {
        asset: string;
    };
}

export const AttachmentFlags = {
    IS_CLIP: 1 << 0,
    IS_THUMBNAIL: 1 << 1,
    IS_REMIX: 1 << 2,
    IS_SPOILER: 1 << 3,
    CONTAINS_EXPLICIT_MEDIA: 1 << 4,
    IS_ANIMATED: 1 << 5,
    CONTAINS_GORE_CONTENT: 1 << 6
};
