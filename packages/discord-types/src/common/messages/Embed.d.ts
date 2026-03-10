export interface Embed {
    author?: {
        name: string;
        url: string;
        iconURL: string | undefined;
        iconProxyURL: string | undefined;
    };
    color: string;
    fields: [];
    id: string;
    image?: {
        height: number;
        width: number;
        url: string;
        proxyURL: string;
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
        width: number;
        url: string;
        proxyURL: string | undefined;
    };
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
    type: string;
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
