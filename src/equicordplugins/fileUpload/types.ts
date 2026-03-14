/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export enum ServiceType {
    ZIPLINE = "zipline",
    NEST = "nest",
    EZHOST = "ezhost",
    S3 = "s3",
    CATBOX = "catbox",
    ZEROX0 = "0x0",
    LITTERBOX = "litterbox",
    SHAREX = "sharex",
    GOFILE = "gofile",
    TMPFILES = "tmpfiles",
    BUZZHEAVIER = "buzzheavier",
    TEMPSH = "tempsh",
    FILEBIN = "filebin"
}

export const serviceLabels: Record<ServiceType, string> = {
    [ServiceType.ZIPLINE]: "Zipline",
    [ServiceType.NEST]: "Nest",
    [ServiceType.EZHOST]: "E-Z Host",
    [ServiceType.S3]: "S3-Compatible",
    [ServiceType.CATBOX]: "Catbox",
    [ServiceType.ZEROX0]: "0x0.st",
    [ServiceType.LITTERBOX]: "Litterbox",
    [ServiceType.SHAREX]: "ShareX Custom Uploader",
    [ServiceType.GOFILE]: "GoFile",
    [ServiceType.TMPFILES]: "tmpfiles.org",
    [ServiceType.BUZZHEAVIER]: "buzzheavier.com",
    [ServiceType.TEMPSH]: "temp.sh",
    [ServiceType.FILEBIN]: "filebin.net"
};

export interface UploadResponse {
    files: {
        id: string;
        type: string;
        url: string;
    }[];
}

export interface NestUploadResponse {
    fileURL: string;
}

export interface NativeUploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

export interface ShareXUploaderConfig {
    Version?: string;
    Name?: string;
    DestinationType?: string;
    RequestMethod?: string;
    RequestURL?: string;
    Headers?: Record<string, string | number | boolean>;
    Body?: string;
    FileFormName?: string;
    Arguments?: Record<string, string | number | boolean>;
    URL?: string;
    ErrorMessage?: string;
}
