/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Switch } from "@components/Switch";
import { useForceUpdater } from "@utils/react";
import { OptionType } from "@utils/types";
import { React, Select, showToast, TextArea, TextInput, Toasts } from "@webpack/common";

import { ServiceType } from "./types";
import { parseShareXConfig } from "./utils/sharex";

const serviceOptions = [
    { label: "Zipline", value: ServiceType.ZIPLINE, default: true },
    { label: "E-Z Host", value: ServiceType.EZHOST },
    { label: "Nest", value: ServiceType.NEST },
    { label: "S3-Compatible", value: ServiceType.S3 },
    { label: "Catbox.moe", value: ServiceType.CATBOX },
    ...(IS_DISCORD_DESKTOP ? [{ label: "0x0.st", value: ServiceType.ZEROX0 }] : []),
    { label: "Litterbox", value: ServiceType.LITTERBOX },
    { label: "GoFile", value: ServiceType.GOFILE },
    { label: "tmpfiles.org", value: ServiceType.TMPFILES },
    { label: "buzzheavier.com", value: ServiceType.BUZZHEAVIER },
    { label: "temp.sh", value: ServiceType.TEMPSH },
    { label: "filebin.net", value: ServiceType.FILEBIN },
    { label: "ShareX Custom Uploader", value: ServiceType.SHAREX }
];

const litterboxOptions = [
    { label: "1 hour", value: "1h" },
    { label: "12 hours", value: "12h" },
    { label: "24 hours", value: "24h", default: true },
    { label: "72 hours", value: "72h" }
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
    gofileToken: {
        type: OptionType.STRING,
        description: "Optional GoFile API token",
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
    apngToGif: {
        type: OptionType.BOOLEAN,
        description: "Convert APNG uploads to GIF",
        default: false,
        hidden: true
    },
    autoCopy: {
        type: OptionType.BOOLEAN,
        description: "Auto copy upload URL",
        default: true,
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
        <SettingsSection name={name} description={description}>
            <TextInput
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        </SettingsSection>
    );
}

export function SettingsComponent() {
    const update = useForceUpdater();
    const { store } = settings;
    const sharexFileInputRef = React.useRef<HTMLInputElement>(null);
    const isNest = store.serviceType === ServiceType.NEST;
    const isEzHost = store.serviceType === ServiceType.EZHOST;
    const isS3 = store.serviceType === ServiceType.S3;
    const isZipline = store.serviceType === ServiceType.ZIPLINE;
    const isCatbox = store.serviceType === ServiceType.CATBOX;
    const isLitterbox = store.serviceType === ServiceType.LITTERBOX;
    const isGofile = store.serviceType === ServiceType.GOFILE;
    const isShareX = store.serviceType === ServiceType.SHAREX;

    const validateShareXConfig = () => {
        try {
            parseShareXConfig(store.sharexConfig || "");
            showToast("ShareX config is valid", Toasts.Type.SUCCESS);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid ShareX config";
            showToast(message, Toasts.Type.FAILURE);
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
                store.sharexConfig = JSON.stringify(parsed, null, 2);
                update();
                showToast("Imported ShareX config", Toasts.Type.SUCCESS);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to import ShareX config";
                showToast(message, Toasts.Type.FAILURE);
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };

    return (
        <>
            <SettingsSection name="Service Type" description="The upload service to use">
                <Select
                    options={serviceOptions}
                    isSelected={v => v === store.serviceType}
                    select={v => {
                        store.serviceType = v;
                        update();
                    }}
                    serialize={v => v}
                    placeholder="Select a service"
                />
            </SettingsSection>

            {isZipline && (
                <>
                    <SettingTextInput
                        name="Service URL"
                        description="The URL of your Zipline instance"
                        value={store.serviceUrl}
                        onChange={v => store.serviceUrl = v}
                        placeholder="https://your-zipline-instance.com"
                    />
                    <SettingTextInput
                        name="Zipline Token"
                        description="Your Zipline API authorization token"
                        value={store.ziplineToken}
                        onChange={v => store.ziplineToken = v}
                        placeholder="Your Zipline API token"
                    />
                    <SettingTextInput
                        name="Folder ID"
                        description="Folder ID for uploads (leave empty for no folder)"
                        value={store.folderId}
                        onChange={v => store.folderId = v}
                        placeholder="Leave empty for no folder"
                    />
                </>
            )}

            {isEzHost && (
                <SettingTextInput
                    name="E-Z Host API Key"
                    description="Your E-Z Host API key"
                    value={store.ezHostKey}
                    onChange={v => store.ezHostKey = v}
                    placeholder="Your E-Z Host API key"
                />
            )}

            {isNest && (
                <SettingTextInput
                    name="Nest Token"
                    description="Your Nest API authorization token"
                    value={store.nestToken}
                    onChange={v => store.nestToken = v}
                    placeholder="Your Nest API token"
                />
            )}

            {isS3 && (
                <>
                    <SettingTextInput
                        name="S3 Endpoint URL"
                        description="S3-compatible endpoint (e.g. https://<accountid>.r2.cloudflarestorage.com)"
                        value={store.s3Endpoint}
                        onChange={v => store.s3Endpoint = v}
                        placeholder="https://your-endpoint.example.com"
                    />
                    <SettingTextInput
                        name="Bucket Name"
                        description="Bucket to upload into"
                        value={store.s3Bucket}
                        onChange={v => store.s3Bucket = v}
                        placeholder="my-bucket"
                    />
                    <SettingTextInput
                        name="Region"
                        description="AWS region or auto for Cloudflare R2"
                        value={store.s3Region}
                        onChange={v => store.s3Region = v}
                        placeholder="auto"
                    />
                    <SettingTextInput
                        name="Access Key ID"
                        description="S3-compatible access key"
                        value={store.s3AccessKeyId}
                        onChange={v => store.s3AccessKeyId = v}
                        placeholder="Your access key ID"
                    />
                    <SettingTextInput
                        name="Secret Access Key"
                        description="S3-compatible secret key"
                        value={store.s3SecretAccessKey}
                        onChange={v => store.s3SecretAccessKey = v}
                        placeholder="Your secret access key"
                    />
                    <SettingTextInput
                        name="Session Token"
                        description="Optional temporary credential token"
                        value={store.s3SessionToken}
                        onChange={v => store.s3SessionToken = v}
                        placeholder="Optional session token"
                    />
                    <SettingTextInput
                        name="Public Base URL"
                        description="Optional public URL base to use for returned links"
                        value={store.s3PublicUrl}
                        onChange={v => store.s3PublicUrl = v}
                        placeholder="https://cdn.example.com"
                    />
                    <SettingTextInput
                        name="Object Key Prefix"
                        description="Optional folder/prefix inside the bucket"
                        value={store.s3Prefix}
                        onChange={v => store.s3Prefix = v}
                        placeholder="uploads/discord"
                    />
                    <SettingsSection tag="label" name="Use Path-Style Endpoint" description="Use endpoint/bucket/key format (recommended for R2)" inlineSetting>
                        <Switch
                            checked={store.s3ForcePathStyle}
                            onChange={v => store.s3ForcePathStyle = v}
                        />
                    </SettingsSection>
                </>
            )}

            {isCatbox && (
                <SettingTextInput
                    name="Catbox Userhash"
                    description="Your Catbox userhash for account binding (leave empty for anonymous uploads)"
                    value={store.catboxUserhash}
                    onChange={v => store.catboxUserhash = v}
                    placeholder="Your Catbox userhash"
                />
            )}

            {isLitterbox && (
                <SettingsSection name="Litterbox Expiry" description="How long uploads are retained">
                    <Select
                        options={litterboxOptions}
                        isSelected={v => v === store.litterboxExpiry}
                        select={v => {
                            store.litterboxExpiry = v;
                            update();
                        }}
                        serialize={v => v}
                        placeholder="Select expiry"
                    />
                </SettingsSection>
            )}

            {isGofile && (
                <SettingTextInput
                    name="GoFile Token"
                    description="Optional GoFile token to upload into your account"
                    value={store.gofileToken}
                    onChange={v => store.gofileToken = v}
                    placeholder="Optional GoFile token"
                />
            )}

            {isShareX && (
                <>
                    <SettingsSection
                        name="ShareX Custom Uploader Config"
                        description="Paste your ShareX custom uploader JSON (.sxcu/.json). DestinationType must include FileUploader or ImageUploader."
                    >
                        <TextArea
                            value={store.sharexConfig}
                            rows={10}
                            placeholder='{"RequestMethod":"POST","RequestURL":"https://example.com/api/upload","Body":"MultipartFormData"}'
                            onChange={v => store.sharexConfig = v}
                        />
                    </SettingsSection>
                    <SettingsSection name="ShareX Config Actions" description="Import from file or validate pasted config">
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                </>
            )}

            <SettingsSection tag="label" name="Strip Query Parameters" description="Strip query parameters from the uploaded file URL" inlineSetting>
                <Switch
                    checked={store.stripQueryParams}
                    onChange={v => store.stripQueryParams = v}
                />
            </SettingsSection>

            <SettingsSection tag="label" name="Convert APNG to GIF" description="Convert APNG files to GIF format" inlineSetting>
                <Switch
                    checked={store.apngToGif}
                    onChange={v => store.apngToGif = v}
                />
            </SettingsSection>

            <SettingsSection tag="label" name="Auto Copy URL" description="Automatically copy the uploaded file URL to clipboard" inlineSetting>
                <Switch
                    checked={store.autoCopy}
                    onChange={v => store.autoCopy = v}
                />
            </SettingsSection>

            <SettingsSection tag="label" name="Disable Fallback Uploaders" description="Only use the selected uploader without trying fallback hosts" inlineSetting>
                <Switch
                    checked={store.disableFallbacks}
                    onChange={v => store.disableFallbacks = v}
                />
            </SettingsSection>

            <SettingsSection tag="label" name="Insert URL into Chat Input" description="After upload, insert the resulting URL into the current chat input" inlineSetting>
                <Switch
                    checked={store.autoSend}
                    onChange={v => store.autoSend = v}
                />
            </SettingsSection>

            <SettingsSection tag="label" name="Format Inserted URL" description="Wrap inserted URLs in angle brackets to avoid Discord preview embedding" inlineSetting>
                <Switch
                    checked={store.autoFormat}
                    onChange={v => store.autoFormat = v}
                />
            </SettingsSection>

            <SettingsSection name="Upload Timeout" description="Maximum time to wait per upload attempt before switching to fallback">
                <Select
                    options={[
                        { label: "30 seconds", value: 30000 },
                        { label: "1 minute", value: 60000 },
                        { label: "2 minutes", value: 120000 },
                        { label: "5 minutes", value: 300000, default: true },
                        { label: "10 minutes", value: 600000 }
                    ]}
                    isSelected={v => v === (store.uploadTimeoutMs || 300000)}
                    select={v => {
                        store.uploadTimeoutMs = v;
                        update();
                    }}
                    serialize={v => v}
                    placeholder="Select timeout"
                />
            </SettingsSection>
        </>
    );
}
