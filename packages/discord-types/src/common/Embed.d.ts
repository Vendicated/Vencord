export interface Embed {
    author?: {
        iconProxyURL: string | undefined;
        iconURL: string | undefined;
        name: string;
        url: string;
    };
    color: string;
    fields: [];
    id: string;
    image?: {
        height: number;
        proxyURL: string;
        url: string;
        width: number;
    };
    provider?: {
        name: string;
        url: string | undefined;
    };
    rawDescription: string;
    rawTitle: string;
    referenceId: unknown;
    timestamp: string;
    thumbnail?: {
        height: number;
        proxyURL: string | undefined;
        url: string;
        width: number;
    };
    type: string;
    url: string | undefined;
    video?: {
        height: number;
        proxyURL: string | undefined;
        url: string;
        width: number;
    };
}

export interface EmbedJSON {
    author?: {
        icon_url: string;
        name: string;
        proxy_icon_url: string;
        url: string;
    };
    title: string;
    color: string;
    description: string;
    type: string;
    url: string | undefined;
    provider?: {
        name: string;
        url: string;
    };
    timestamp: string;
    thumbnail?: {
        height: number;
        proxy_url: string | undefined;
        url: string;
        width: number;
    };
    video?: {
        height: number;
        proxy_url: string | undefined;
        url: string;
        width: number;
    };
}
