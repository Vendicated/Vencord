export type EmbedType =
    | "image"
    | "video"
    | "link"
    | "article"
    | "tweet"
    | "rich"
    | "gifv"
    | "application_news"
    | "auto_moderation_message"
    | "auto_moderation_notification"
    | "text"
    | "post_preview"
    | "gift"
    | "safety_policy_notice"
    | "safety_system_notification"
    | "age_verification_system_notification"
    | "voice_channel"
    | "gaming_profile"
    | "poll_result";

export interface EmbedMedia {
    height: number;
    width: number;
    url: string;
    proxyURL: string;
    placeholder: string;
    placeholderVersion: number;
    description: string;
    srcIsAnimated: boolean;
    flags: number;
    contentType: string;
}

export interface EmbedField {
    rawName: string;
    rawValue: string;
    inline: boolean;
}

export interface Embed {
    id: string;
    url: string;
    type: EmbedType;
    rawTitle: string;
    rawDescription: string;
    referenceId: string | undefined;
    flags: number | undefined;
    contentScanVersion: number;
    author?: {
        name: string;
        url: string;
        iconURL: string | undefined;
        iconProxyURL: string | undefined;
    };
    footer?: {
        text: string;
        iconURL: string | undefined;
        iconProxyURL: string | undefined;
    };
    provider?: {
        name: string;
        url: string | undefined;
    };
    timestamp?: Date;
    color: string;
    thumbnail?: EmbedMedia;
    image?: EmbedMedia;
    images?: EmbedMedia[];
    video?: EmbedMedia;
    fields: EmbedField[];
}

export interface EmbedJSON {
    author?: {
        name: string;
        url: string;
        icon_url: string;
        proxy_icon_url: string;
    };
    title: string;
    color: string;
    description: string;
    type: EmbedType;
    url: string | undefined;
    provider?: {
        name: string;
        url: string;
    };
    timestamp: string;
    thumbnail?: {
        height: number;
        width: number;
        url: string;
        proxy_url: string | undefined;
    };
    video?: {
        height: number;
        width: number;
        url: string;
        proxy_url: string | undefined;
    };
}
