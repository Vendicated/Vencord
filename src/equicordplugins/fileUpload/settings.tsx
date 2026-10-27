/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Switch } from "@components/Switch";
import { classNameFactory } from "@utils/css";
import { useForceUpdater } from "@utils/react";
import { OptionType, PluginNative } from "@utils/types";
import { React, Select, showToast, TextArea, TextInput } from "@webpack/common";

import { CORS_PROXY } from "./constants";
import { fallbackServiceOrder, serviceLabels, ServiceType } from "./types";
import { parseShareXConfig } from "./utils/sharex";

const Native = IS_DISCORD_DESKTOP
    ? VencordNative.pluginHelpers.FileUpload as PluginNative<typeof import("./native")>
    : null;

const defaultFallbackOrder = fallbackServiceOrder.join(",");
const cl = classNameFactory("vc-file-upload-settings-");

const serviceOptions = [
    { label: "Zipline", value: ServiceType.ZIPLINE, default: true },
    { label: "E-Z Host", value: ServiceType.EZHOST },
    { label: "Nest", value: ServiceType.NEST },
    { label: "Encrypting.host", value: ServiceType.ENCRYPTINGHOST },
    { label: "S3-Compatible", value: ServiceType.S3 },
    { label: "Catbox.moe", value: ServiceType.CATBOX },
    ...(IS_DISCORD_DESKTOP ? [{ label: "0x0.st", value: ServiceType.ZEROX0 }] : []),
    { label: "Litterbox", value: ServiceType.LITTERBOX },
    { label: "GoFile", value: ServiceType.GOFILE },
    { label: "tmpfiles.org", value: ServiceType.TMPFILES },
    { label: "buzzheavier.com", value: ServiceType.BUZZHEAVIER },
    { label: "temp.sh", value: ServiceType.TEMPSH },
    { label: "filebin.net", value: ServiceType.FILEBIN },
    { label: "PixelVault", value: ServiceType.PIXELVAULT },
    { label: "PixelDrain", value: ServiceType.PIXELDRAIN },
    { label: "ShareX Custom Uploader", value: ServiceType.SHAREX },
    { label: "WebDAV (Nextcloud/Owncloud)", value: ServiceType.WEBDAV }
];

const litterboxOptions = [
    { label: "1 hour", value: "1h" },
    { label: "12 hours", value: "12h" },
    { label: "24 hours", value: "24h", default: true },
    { label: "72 hours", value: "72h" }
];

const embedProxyOptions = [
    { label: "CORS Proxy", value: "cors", default: true },
    { label: "discord.nfp.is", value: "nfp" }
];

const encryptingHostUrlStyleOptions = [
    { label: "Query", value: "query", default: true },
    { label: "Param", value: "param" },
    { label: "Fake Link", value: "fakelink" },
    { label: "Embed", value: "embed" }
];

export const settings = definePluginSettings({
    serviceType: {
        type: OptionType.SELECT,
        description: "Selected uploader service",
        options: serviceOptions,
        hidden: true
    },
    serviceUrl: {
        type: OptionType.STRING,
        description: "Zipline service URL",
        default: "",
        hidden: true
    },
    ziplineToken: {
        type: OptionType.STRING,
        description: "Zipline auth token",
        default: "",
        hidden: true
    },
    folderId: {
        type: OptionType.STRING,
        description: "Optional Zipline folder ID",
        default: "",
        hidden: true
    },
    ezHostKey: {
        type: OptionType.STRING,
        description: "E-Z Host API key",
        default: "",
        hidden: true
    },
    nestToken: {
        type: OptionType.STRING,
        description: "Nest API token",
        default: "",
        hidden: true
    },
    encryptingHostKey: {
        type: OptionType.STRING,
        description: "Encrypting.host API key",
        default: "",
        hidden: true
    },
    encryptingHostUrlStyle: {
        type: OptionType.SELECT,
        description: "Encrypting.host URL style",
        options: encryptingHostUrlStyleOptions,
        default: "query",
        hidden: true
    },
    encryptingHostDomains: {
        type: OptionType.STRING,
        description: "Encrypting.host domains JSON list",
        default: "[\"offensive\"]",
        hidden: true
    },
    encryptingHostTitle: {
        type: OptionType.STRING,
        description: "Optional Encrypting.host embed title",
        default: "",
        hidden: true
    },
    encryptingHostColor: {
        type: OptionType.STRING,
        description: "Optional Encrypting.host embed color",
        default: "",
        hidden: true
    },
    encryptingHostFakelink: {
        type: OptionType.STRING,
        description: "Optional Encrypting.host fake link",
        default: "",
        hidden: true
    },
    s3Endpoint: {
        type: OptionType.STRING,
        description: "S3-compatible endpoint URL",
        default: "",
        hidden: true
    },
    s3Bucket: {
        type: OptionType.STRING,
        description: "S3 bucket name",
        default: "",
        hidden: true
    },
    s3Region: {
        type: OptionType.STRING,
        description: "S3 region (use auto for R2)",
        default: "auto",
        hidden: true
    },
    s3AccessKeyId: {
        type: OptionType.STRING,
        description: "S3 access key ID",
        default: "",
        hidden: true
    },
    s3SecretAccessKey: {
        type: OptionType.STRING,
        description: "S3 secret access key",
        default: "",
        hidden: true
    },
    s3SessionToken: {
        type: OptionType.STRING,
        description: "Optional S3 session token",
        default: "",
        hidden: true
    },
    s3PublicUrl: {
        type: OptionType.STRING,
        description: "Optional public base URL",
        default: "",
        hidden: true
    },
    s3Prefix: {
        type: OptionType.STRING,
        description: "Optional S3 object key prefix",
        default: "",
        hidden: true
    },
    s3ForcePathStyle: {
        type: OptionType.BOOLEAN,
        description: "Use path-style S3 URLs",
        default: true,
        hidden: true
    },
    litterboxExpiry: {
        type: OptionType.SELECT,
        description: "Litterbox retention window",
        options: litterboxOptions,
        default: "24h",
        hidden: true
    },
    catboxUserhash: {
        type: OptionType.STRING,
        description: "Catbox userhash for account binding",
        default: "",
        hidden: true
    },
    sharexConfig: {
        type: OptionType.STRING,
        description: "ShareX custom uploader JSON",
        default: "",
        hidden: true
    },
    disableFallbacks: {
        type: OptionType.BOOLEAN,
        description: "Disable fallback upload services",
        default: false,
        hidden: true
    },
    autoSend: {
        type: OptionType.BOOLEAN,
        description: "Insert uploaded URL in chat input",
        default: false,
        hidden: true
    },
    autoFormat: {
        type: OptionType.BOOLEAN,
        description: "Wrap inserted URL in angle brackets",
        default: false,
        hidden: true
    },
    bypassDiscordUpload: {
        type: OptionType.BOOLEAN,
        description: "Bypass Discord uploads and use FileUpload instead.",
        default: true,
        hidden: true
    },
    bypassDiscordUploadOnlyOverLimit: {
        type: OptionType.BOOLEAN,
        description: "Only use FileUpload if the file(s) exceed the file size limit.",
        default: true,
        hidden: true
    },
    customDiscordFileSizeLimitMB: {
        type: OptionType.NUMBER,
        description: "Manual Discord file size limit in MB. 0 means automatic detection.",
        default: 0,
        hidden: true
    },
    gofileToken: {
        type: OptionType.STRING,
        description: "Optional GoFile API token",
        default: "",
        hidden: true
    },
    fallbackOrder: {
        type: OptionType.STRING,
        description: "Fallback uploader order",
        default: defaultFallbackOrder,
        hidden: true
    },
    pixelVaultKey: {
        type: OptionType.STRING,
        description: "PixelVault upload key",
        default: "",
        hidden: true
    },
    pixelDrainKey: {
        type: OptionType.STRING,
        description: "Optional PixelDrain API key",
        default: "",
        hidden: true
    },
    uploadTimeoutMs: {
        type: OptionType.NUMBER,
        description: "Upload timeout in milliseconds",
        default: 300000,
        hidden: true
    },
    stripQueryParams: {
        type: OptionType.BOOLEAN,
        description: "Strip query params from uploaded URLs",
        default: false,
        hidden: true
    },
    embedProxyEnabled: {
        type: OptionType.BOOLEAN,
        description: "Proxy uploaded video links through an embed helper service.",
        default: false,
        hidden: true
    },
    embedProxyService: {
        type: OptionType.SELECT,
        description: "Embed helper service to wrap uploaded video links.",
        options: embedProxyOptions,
        default: "cors",
        hidden: true
    },
    corsProxyUrl: {
        type: OptionType.STRING,
        description: "CORS proxy URL used for browser uploads",
        default: CORS_PROXY,
        hidden: true
    },
    apngToGif: {
        type: OptionType.BOOLEAN,
        description: "Convert APNG uploads to GIF",
        default: false,
        hidden: true
    },
    preserveOriginalFilename: {
        type: OptionType.BOOLEAN,
        description: "Preserve the original filename when uploading.",
        default: true,
        hidden: true
    },
    autoCopy: {
        type: OptionType.BOOLEAN,
        description: "Auto copy upload URL",
        default: true,
        hidden: true
    },
    autoUploadPastedFiles: {
        type: OptionType.BOOLEAN,
        description: "Automatically upload files from clipboard to image host when pasting in chat input.",
        default: false
    },
    webdavUrl: {
        type: OptionType.STRING,
        description: "WebDAV server URL",
        default: "",
        hidden: true
    },
    webdavUsername: {
        type: OptionType.STRING,
        description: "WebDAV username",
        default: "",
        hidden: true
    },
    webdavPassword: {
        type: OptionType.STRING,
        description: "WebDAV password or app token",
        default: "",
        hidden: true
    },
    webdavDirectory: {
        type: OptionType.STRING,
        description: "Optional subdirectory on the WebDAV server",
        default: "",
        hidden: true
    },
    webdavServerType: {
        type: OptionType.SELECT,
        description: "WebDAV server type",
        options: [
            { label: "Nextcloud", value: "nextcloud", default: true },
            { label: "ownCloud", value: "owncloud" },
            { label: "Generic WebDAV", value: "generic" }
        ],
        default: "nextcloud",
        hidden: true
    },
    webdavShareType: {
        type: OptionType.SELECT,
        description: "WebDAV share link format",
        options: [
            { label: "Share Page", value: "share-page", default: true },
            { label: "Direct Download", value: "direct-download" },
            { label: "Markdown Link", value: "markdown" }
        ],
        default: "share-page",
        hidden: true
    },
    uploadAllowedFileTypes: {
        type: OptionType.STRING,
        description: "Comma-separated list of allowed file extensions (e.g. png,jpg,gif,mp4). Leave empty to allow all files.",
        default: "",
        hidden: true
    },
    settingsComponent: {
        type: OptionType.COMPONENT,
        description: "Settings",
        component: SettingsComponent
    }
});

function SettingTextInput(props: {
    description: string;
    name: string;
    onChange: (value: string) => void;
    placeholder: string;
    value: string;
}) {
    const { description, name, onChange, placeholder, value } = props;

    return (
        <SettingsSection id={name} name={name} description={description ?? ""}>
            <TextInput
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        </SettingsSection>
    );
}

function SettingGroup(props: {
    children: React.ReactNode;
    description?: string;
    name: string;
}) {
    const { children, description, name } = props;

    return (
        <SettingsSection id={name} name={name} description={description ?? ""}>
            <div className={cl("group")}>
                {children}
            </div>
        </SettingsSection>
    );
}

function SettingSwitch(props: {
    checked: boolean;
    description: string;
    name: string;
    onChange: (value: boolean) => void;
}) {
    const { checked, description, name, onChange } = props;

    return (
        <SettingsSection id={name} tag="label" name={name} description={description} inlineSetting>
            <Switch checked={checked} onChange={onChange} />
        </SettingsSection>
    );
}

function ServicePicker(props: {
    onChange: (service: ServiceType) => void;
    value: ServiceType;
}) {
    const { onChange, value } = props;

    return (
        <div className={cl("service-grid")}>
            {serviceOptions.map(option => (
                <button
                    key={option.value}
                    type="button"
                    className={cl("service-option")}
                    data-selected={option.value === value}
                    onClick={() => onChange(option.value)}
                >
                    <span className={cl("service-option-label")}>{option.label}</span>
                </button>
            ))}
        </div>
    );
}

function FallbackOrderSettings() {
    const update = useForceUpdater();
    const [dragIndex, setDragIndex] = React.useState<number | null>(null);
    const [order, setOrder] = React.useState<ServiceType[]>(() => {
        const configured = (settings.store.fallbackOrder || defaultFallbackOrder)
            .split(/[\n,]/)
            .map(entry => entry.trim())
            .filter((entry): entry is ServiceType => Object.values(ServiceType).includes(entry as ServiceType));

        return configured.length === fallbackServiceOrder.length && new Set(configured).size === fallbackServiceOrder.length
            ? configured
            : fallbackServiceOrder;
    });

    const commitOrder = (nextOrder: ServiceType[]) => {
        setOrder(nextOrder);
        settings.store.fallbackOrder = nextOrder.join(",");
        update();
    };

    return (
        <SettingsSection id="fallback-order" name="Fallback Order" description="Drag hosts to reorder fallback attempts. The selected host is tried first, then this order is used.">
            <div className={cl("fallback-order-list")}>
                {order.map((service, index) => (
                    <div
                        key={service}
                        className={cl("fallback-order-item")}
                        draggable
                        onDragStart={event => {
                            setDragIndex(index);
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(index));
                        }}
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                            event.preventDefault();
                            const sourceIndex = dragIndex ?? Number(event.dataTransfer.getData("text/plain"));
                            if (!Number.isInteger(sourceIndex) || sourceIndex === index || sourceIndex < 0 || sourceIndex >= order.length) {
                                setDragIndex(null);
                                return;
                            }

                            const nextOrder = [...order];
                            const [moved] = nextOrder.splice(sourceIndex, 1);
                            nextOrder.splice(index, 0, moved);
                            setDragIndex(null);
                            commitOrder(nextOrder);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        data-dragging={dragIndex === index}
                    >
                        <span className={cl("fallback-order-label")}>{serviceLabels[service]}</span>
                        <span className={cl("fallback-order-handle")}>Drag</span>
                    </div>
                ))}
            </div>
            <div className={cl("fallback-order-actions")}>
                <Button size="small" onClick={() => commitOrder(fallbackServiceOrder)}>
                    Reset to default
                </Button>
            </div>
        </SettingsSection>
    );
}

export function SettingsComponent() {
    const update = useForceUpdater();
    const sharexFileInputRef = React.useRef<HTMLInputElement>(null);
    const { serviceType } = settings.store;

    const validateShareXConfig = () => {
        try {
            parseShareXConfig(settings.store.sharexConfig || "");
            showToast({ text: "ShareX config is valid", variant: "success" });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid ShareX config";
            showToast({ text: message, variant: "critical" });
        }
    };

    const triggerShareXFileUpload = () => {
        sharexFileInputRef.current?.click();
    };

    const handleShareXFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const content = String(e.target?.result || "");
                const parsed = parseShareXConfig(content);
                settings.store.sharexConfig = JSON.stringify(parsed, null, 2);
                update();
                showToast({ text: "Imported ShareX config", variant: "success" });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to import ShareX config";
                showToast({ text: message, variant: "critical" });
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };

    return (
        <>
            <SettingsSection id="upload-service" name="Upload Service" description="Choose where FileUpload sends new files.">
                <ServicePicker
                    value={settings.store.serviceType as ServiceType}
                    onChange={service => {
                        settings.store.serviceType = service;
                        update();
                    }}
                />
            </SettingsSection>

            {serviceType === ServiceType.ZIPLINE && (
                <SettingGroup name="Zipline" description="Connection details for your Zipline instance.">
                    <SettingTextInput
                        name="Service URL"
                        description="The URL of your Zipline instance"
                        value={settings.store.serviceUrl}
                        onChange={v => settings.store.serviceUrl = v}
                        placeholder="https://your-zipline-instance.com"
                    />
                    <SettingTextInput
                        name="Zipline Token"
                        description="Your Zipline API authorization token"
                        value={settings.store.ziplineToken}
                        onChange={v => settings.store.ziplineToken = v}
                        placeholder="Your Zipline API token"
                    />
                    <SettingTextInput
                        name="Folder ID"
                        description="Folder ID for uploads (leave empty for no folder)"
                        value={settings.store.folderId}
                        onChange={v => settings.store.folderId = v}
                        placeholder="Leave empty for no folder"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.EZHOST && (
                <SettingGroup name="E-Z Host" description="Connection details for E-Z Host uploads.">
                    <SettingTextInput
                        name="E-Z Host API Key"
                        description="Your E-Z Host API key"
                        value={settings.store.ezHostKey}
                        onChange={v => settings.store.ezHostKey = v}
                        placeholder="Your E-Z Host API key"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.NEST && (
                <SettingGroup name="Nest" description="Connection details for Nest uploads.">
                    <SettingTextInput
                        name="Nest Token"
                        description="Your Nest API authorization token"
                        value={settings.store.nestToken}
                        onChange={v => settings.store.nestToken = v}
                        placeholder="Your Nest API token"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.ENCRYPTINGHOST && (
                <SettingGroup name="Encrypting.host" description="Connection details for Encrypting.host uploads.">
                    <SettingTextInput
                        name="Encrypting.host API Key"
                        description="Your Encrypting.host API key"
                        value={(settings.store as { encryptingHostKey?: string; }).encryptingHostKey || ""}
                        onChange={v => (settings.store as { encryptingHostKey?: string; }).encryptingHostKey = v}
                        placeholder="Your Encrypting.host API key"
                    />
                    <SettingsSection id="url-style" name="URL Style" description="How Encrypting.host should format returned links.">
                        <Select
                            options={encryptingHostUrlStyleOptions}
                            isSelected={v => v === (settings.store as { encryptingHostUrlStyle?: string; }).encryptingHostUrlStyle}
                            select={v => {
                                (settings.store as { encryptingHostUrlStyle?: string; }).encryptingHostUrlStyle = v;
                                update();
                            }}
                            serialize={v => v}
                            placeholder="Select URL style"
                        />
                    </SettingsSection>
                    <SettingsSection id="domains-json" name="Domains JSON" description={"JSON array of domains to use, for example [\"offensive\"]."}>
                        <TextArea
                            value={(settings.store as { encryptingHostDomains?: string; }).encryptingHostDomains || ""}
                            rows={3}
                            placeholder='["offensive"]'
                            onChange={v => (settings.store as { encryptingHostDomains?: string; }).encryptingHostDomains = v}
                        />
                    </SettingsSection>
                    <SettingTextInput
                        name="Embed Title"
                        description="Optional title for embed style responses."
                        value={(settings.store as { encryptingHostTitle?: string; }).encryptingHostTitle || ""}
                        onChange={v => (settings.store as { encryptingHostTitle?: string; }).encryptingHostTitle = v}
                        placeholder="Optional title"
                    />
                    <SettingTextInput
                        name="Embed Color"
                        description="Optional color for embed style responses."
                        value={(settings.store as { encryptingHostColor?: string; }).encryptingHostColor || ""}
                        onChange={v => (settings.store as { encryptingHostColor?: string; }).encryptingHostColor = v}
                        placeholder="Optional color"
                    />
                    <SettingTextInput
                        name="Fake Link"
                        description="Optional fake link value for fakelink style responses."
                        value={(settings.store as { encryptingHostFakelink?: string; }).encryptingHostFakelink || ""}
                        onChange={v => (settings.store as { encryptingHostFakelink?: string; }).encryptingHostFakelink = v}
                        placeholder="Optional fake link"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.S3 && (
                <SettingGroup name="S3-Compatible Storage" description="Connection details and object naming for your bucket.">
                    <SettingTextInput
                        name="S3 Endpoint URL"
                        description="S3-compatible endpoint (e.g. https://<accountid>.r2.cloudflarestorage.com)"
                        value={settings.store.s3Endpoint}
                        onChange={v => settings.store.s3Endpoint = v}
                        placeholder="https://your-endpoint.example.com"
                    />
                    <SettingTextInput
                        name="Bucket Name"
                        description="Bucket to upload into"
                        value={settings.store.s3Bucket}
                        onChange={v => settings.store.s3Bucket = v}
                        placeholder="my-bucket"
                    />
                    <SettingTextInput
                        name="Region"
                        description="AWS region or auto for Cloudflare R2"
                        value={settings.store.s3Region}
                        onChange={v => settings.store.s3Region = v}
                        placeholder="auto"
                    />
                    <SettingTextInput
                        name="Access Key ID"
                        description="S3-compatible access key"
                        value={settings.store.s3AccessKeyId}
                        onChange={v => settings.store.s3AccessKeyId = v}
                        placeholder="Your access key ID"
                    />
                    <SettingTextInput
                        name="Secret Access Key"
                        description="S3-compatible secret key"
                        value={settings.store.s3SecretAccessKey}
                        onChange={v => settings.store.s3SecretAccessKey = v}
                        placeholder="Your secret access key"
                    />
                    <SettingTextInput
                        name="Session Token"
                        description="Optional temporary credential token"
                        value={settings.store.s3SessionToken}
                        onChange={v => settings.store.s3SessionToken = v}
                        placeholder="Optional session token"
                    />
                    <SettingTextInput
                        name="Public Base URL"
                        description="Optional public URL base to use for returned links"
                        value={settings.store.s3PublicUrl}
                        onChange={v => settings.store.s3PublicUrl = v}
                        placeholder="https://cdn.example.com"
                    />
                    <SettingTextInput
                        name="Object Key Prefix"
                        description="Optional folder/prefix inside the bucket"
                        value={settings.store.s3Prefix}
                        onChange={v => settings.store.s3Prefix = v}
                        placeholder="uploads/discord"
                    />
                    <SettingSwitch
                        name="Use Path-Style Endpoint"
                        description="Use endpoint/bucket/key format, recommended for R2."
                        checked={settings.store.s3ForcePathStyle}
                        onChange={v => settings.store.s3ForcePathStyle = v}
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.CATBOX && (
                <SettingGroup name="Catbox" description="Optional account binding for Catbox uploads.">
                    <SettingTextInput
                        name="Catbox Userhash"
                        description="Your Catbox userhash for account binding, leave empty for anonymous uploads."
                        value={settings.store.catboxUserhash}
                        onChange={v => settings.store.catboxUserhash = v}
                        placeholder="Your Catbox userhash"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.LITTERBOX && (
                <SettingsSection id="litterbox-expiry" name="Litterbox Expiry" description="How long uploads are retained">
                    <Select
                        options={litterboxOptions}
                        isSelected={v => v === settings.store.litterboxExpiry}
                        select={v => {
                            settings.store.litterboxExpiry = v;
                            update();
                        }}
                        serialize={v => v}
                        placeholder="Select expiry"
                    />
                </SettingsSection>
            )}

            {serviceType === ServiceType.GOFILE && (
                <SettingGroup name="GoFile" description="Optional account binding for GoFile uploads.">
                    <SettingTextInput
                        name="GoFile Token"
                        description="Optional GoFile token to upload into your account."
                        value={settings.store.gofileToken}
                        onChange={v => settings.store.gofileToken = v}
                        placeholder="Optional GoFile token"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.PIXELVAULT && (
                <SettingGroup name="PixelVault" description="Connection details for PixelVault uploads.">
                    <SettingTextInput
                        name="PixelVault Upload Key"
                        description="Your PixelVault authorization key."
                        value={settings.store.pixelVaultKey}
                        onChange={v => settings.store.pixelVaultKey = v}
                        placeholder="Your PixelVault upload key"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.PIXELDRAIN && (
                <SettingGroup name="PixelDrain" description="Optional account binding for PixelDrain uploads.">
                    <SettingTextInput
                        name="PixelDrain API Key"
                        description="Optional PixelDrain API key for authenticated uploads. Leave empty for anonymous uploads."
                        value={settings.store.pixelDrainKey}
                        onChange={v => settings.store.pixelDrainKey = v}
                        placeholder="Your PixelDrain API key"
                    />
                </SettingGroup>
            )}

            {serviceType === ServiceType.SHAREX && (
                <SettingGroup name="ShareX Custom Uploader" description="Paste, import, or validate a ShareX custom uploader config.">
                    <SettingsSection
                        id="sharex-custom-uploader-config"
                        name="ShareX Custom Uploader Config"
                        description="Paste your ShareX custom uploader JSON (.sxcu/.json). DestinationType must include FileUploader or ImageUploader."
                    >
                        <TextArea
                            value={settings.store.sharexConfig}
                            rows={10}
                            placeholder='{"RequestMethod":"POST","RequestURL":"https://example.com/api/upload","Body":"MultipartFormData"}'
                            onChange={v => settings.store.sharexConfig = v}
                        />
                    </SettingsSection>
                    <SettingsSection id="sharex-config-actions" name="ShareX Config Actions" description="Import from file or validate pasted config">
                        <div className={cl("actions")}>
                            <Button size="small" onClick={triggerShareXFileUpload}>Import .sxcu/.json</Button>
                            <Button size="small" onClick={validateShareXConfig}>Validate</Button>
                        </div>
                        <input
                            ref={sharexFileInputRef}
                            type="file"
                            accept=".sxcu,.json,application/json,text/plain"
                            style={{ display: "none" }}
                            onChange={handleShareXFileUpload}
                        />
                    </SettingsSection>
                </SettingGroup>
            )}

            {serviceType === ServiceType.WEBDAV && (
                <SettingGroup name="WebDAV" description="Connection details for WebDAV servers (Nextcloud, Owncloud, etc.).">
                    <SettingTextInput
                        name="Server URL"
                        description="Base WebDAV URL (e.g. https://nextcloud.example.com/remote.php/dav/files/username)"
                        value={settings.store.webdavUrl}
                        onChange={v => settings.store.webdavUrl = v}
                        placeholder="https://nextcloud.example.com/remote.php/dav/files/username"
                    />
                    <SettingTextInput
                        name="Username"
                        description="WebDAV username"
                        value={settings.store.webdavUsername}
                        onChange={v => settings.store.webdavUsername = v}
                        placeholder="username"
                    />
                    <SettingTextInput
                        name="Password or App Token"
                        description="WebDAV password or app token"
                        value={settings.store.webdavPassword}
                        onChange={v => settings.store.webdavPassword = v}
                        placeholder="password or app token"
                    />
                    <SettingTextInput
                        name="Upload Directory"
                        description="Optional subdirectory on the server to upload into (e.g. uploads)"
                        value={settings.store.webdavDirectory}
                        onChange={v => settings.store.webdavDirectory = v}
                        placeholder="Leave empty for root directory"
                    />
                    <SettingsSection id="server-type" name="Server Type" description="Select your WebDAV server type. Nextcloud and ownCloud will create a public share link. Generic returns the raw file URL.">
                        <Select
                            options={[
                                { label: "Nextcloud", value: "nextcloud", default: true },
                                { label: "ownCloud", value: "owncloud" },
                                { label: "Generic WebDAV", value: "generic" }
                            ]}
                            isSelected={v => v === settings.store.webdavServerType}
                            select={v => {
                                settings.store.webdavServerType = v;
                                update();
                            }}
                            serialize={v => v}
                            placeholder="Select server type"
                        />
                    </SettingsSection>
                    {settings.store.webdavServerType !== "generic" && (
                        <SettingsSection id="share-link-format" name="Share Link Format" description="How to return the public share link. Share Page links to a web page; Direct Download links straight to the file; Markdown Link wraps the share page in a clickable filename.">
                            <Select
                                options={[
                                    { label: "Share Page", value: "share-page", default: true },
                                    { label: "Direct Download", value: "direct-download" },
                                    { label: "Markdown Link", value: "markdown" }
                                ]}
                                isSelected={v => v === settings.store.webdavShareType}
                                select={v => {
                                    settings.store.webdavShareType = v;
                                    update();
                                }}
                                serialize={v => v}
                                placeholder="Select share link format"
                            />
                        </SettingsSection>
                    )}
                </SettingGroup>
            )}

            <SettingGroup name="Upload Behavior" description="Control what FileUpload does after a host returns a URL.">
                <SettingSwitch
                    name="Strip Query Parameters"
                    description="Strip query parameters from the uploaded file URL."
                    checked={settings.store.stripQueryParams}
                    onChange={v => settings.store.stripQueryParams = v}
                />

                <SettingSwitch
                    name="Use Embed Proxy"
                    description="Wrap uploaded video links with an embed proxy service for better Discord previews."
                    checked={settings.store.embedProxyEnabled}
                    onChange={v => {
                        settings.store.embedProxyEnabled = v;
                        update();
                    }}
                />

                {settings.store.embedProxyEnabled && (
                    <SettingsSection id="embed-proxy-service" name="Embed Proxy Service" description="Choose which embed proxy service to use for uploaded video links">
                        <Select
                            options={embedProxyOptions}
                            isSelected={v => v === settings.store.embedProxyService}
                            select={v => {
                                settings.store.embedProxyService = v;
                                update();
                            }}
                            serialize={v => v}
                            placeholder="Select an embed proxy service"
                        />
                    </SettingsSection>
                )}

                <SettingSwitch
                    name="Convert APNG to GIF"
                    description="Convert APNG files to GIF format."
                    checked={settings.store.apngToGif}
                    onChange={v => settings.store.apngToGif = v}
                />

                <SettingSwitch
                    name="Preserve Original Filename"
                    description="Use the original filename instead of naming uploads as upload.ext."
                    checked={Boolean((settings.store as { preserveOriginalFilename?: boolean; }).preserveOriginalFilename)}
                    onChange={v => (settings.store as { preserveOriginalFilename?: boolean; }).preserveOriginalFilename = v}
                />

                <SettingSwitch
                    name="Auto Copy URL"
                    description="Automatically copy the uploaded file URL to clipboard."
                    checked={settings.store.autoCopy}
                    onChange={v => settings.store.autoCopy = v}
                />

                <SettingSwitch
                    name="Disable Fallback Uploaders"
                    description="Only use the selected uploader without trying fallback hosts."
                    checked={settings.store.disableFallbacks}
                    onChange={v => settings.store.disableFallbacks = v}
                />

                <SettingSwitch
                    name="Insert URL into Chat Input"
                    description="After upload, insert the resulting URL into the current chat input."
                    checked={settings.store.autoSend}
                    onChange={v => settings.store.autoSend = v}
                />

                <SettingSwitch
                    name="Format Inserted URL"
                    description="Wrap inserted URLs in angle brackets to avoid Discord preview embedding."
                    checked={settings.store.autoFormat}
                    onChange={v => settings.store.autoFormat = v}
                />
            </SettingGroup>

            <SettingGroup name="Discord Integration" description="Choose when FileUpload takes over Discord file handling.">
                <SettingSwitch
                    name="Bypass Discord Upload Button"
                    description="Use FileUpload when uploading through Discord's file picker."
                    checked={Boolean((settings.store as { bypassDiscordUpload?: boolean; }).bypassDiscordUpload)}
                    onChange={v => (settings.store as { bypassDiscordUpload?: boolean; }).bypassDiscordUpload = v}
                />

                <SettingSwitch
                    name="Auto Upload Pasted Files"
                    description="Automatically upload files from clipboard to image host when pasting in chat input."
                    checked={settings.store.autoUploadPastedFiles}
                    onChange={v => settings.store.autoUploadPastedFiles = v}
                />

                <SettingSwitch
                    name="Respect Discord File Size Limit"
                    description="Use FileUpload only for files larger than your current Discord upload limit."
                    checked={settings.store.bypassDiscordUploadOnlyOverLimit}
                    onChange={v => settings.store.bypassDiscordUploadOnlyOverLimit = v}
                />

                <SettingTextInput
                    name="Discord Limit Override (MB)"
                    description="Manual Discord file size limit in MB, used when automatic detection is wrong. Leave empty for automatic."
                    value={settings.store.customDiscordFileSizeLimitMB > 0 ? String(settings.store.customDiscordFileSizeLimitMB) : ""}
                    onChange={v => settings.store.customDiscordFileSizeLimitMB = v.trim() === "" ? 0 : Number(v)}
                    placeholder="Auto"
                />

                <SettingTextInput
                    name="Allowed File Types"
                    description="Comma-separated list of extensions (e.g. png,jpg,gif). Leave empty to allow all."
                    value={settings.store.uploadAllowedFileTypes}
                    onChange={v => settings.store.uploadAllowedFileTypes = v}
                    placeholder="png,jpg,gif,mp4,webp"
                />
            </SettingGroup>

            <SettingGroup name="Network" description="Configure browser upload proxying and timeouts.">
                <SettingTextInput
                    name="CORS Proxy URL"
                    description="CORS proxy used for web uploads. Leave empty to use the default proxy."
                    value={settings.store.corsProxyUrl || ""}
                    onChange={v => settings.store.corsProxyUrl = v}
                    placeholder="https://your-cors-proxy.example.com"
                />

                <SettingsSection id="default-cors-proxy-source" name="Default CORS Proxy Source" description="Source code for the default CORS proxy">
                    <a href="https://codeberg.org/key/corsproxy" target="_blank" rel="noreferrer">codeberg.org/key/corsproxy</a>
                </SettingsSection>

                <SettingsSection id="upload-timeout" name="Upload Timeout" description="Maximum time to wait per upload attempt before switching to fallback">
                    <Select
                        options={[
                            { label: "30 seconds", value: 30000 },
                            { label: "1 minute", value: 60000 },
                            { label: "2 minutes", value: 120000 },
                            { label: "5 minutes", value: 300000, default: true },
                            { label: "10 minutes", value: 600000 }
                        ]}
                        isSelected={v => v === (settings.store.uploadTimeoutMs || 300000)}
                        select={v => {
                            settings.store.uploadTimeoutMs = v;
                            update();
                        }}
                        serialize={v => v}
                        placeholder="Select timeout"
                    />
                </SettingsSection>

                {Native && (
                    <SettingsSection id="approved-servers" name="Approved Servers" description="S3 and WebDAV servers you allowed FileUpload to upload to. Resetting will ask again on the next upload.">
                        <Button
                            size="small"
                            onClick={async () => {
                                await Native.clearApprovedOrigins();
                                showToast({ text: "Approved servers reset" });
                            }}
                        >
                            Reset Approved Servers
                        </Button>
                    </SettingsSection>
                )}
            </SettingGroup>

            <FallbackOrderSettings />
        </>
    );
}
