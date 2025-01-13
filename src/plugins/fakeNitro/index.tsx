/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, sendBotMessage } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addPreEditListener, addPreSendListener, removePreEditListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { ApngBlendOp, ApngDisposeOp, importApngJs } from "@utils/dependencies";
import { getCurrentGuild, getEmojiURL, insertTextIntoChatInputBox, sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType, Patch, PluginNative } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findStoreLazy, proxyLazyWebpack } from "@webpack";
import { Alerts, Button, ChannelStore, DraftType, EmojiStore, FluxDispatcher, Forms, GuildMemberStore, lodash, Menu, Parser, PermissionsBits, PermissionStore, React, Select, SelectedChannelStore, showToast, Switch, TextInput, Toasts, UploadHandler, UploadManager, useEffect, UserSettingsActionCreators, UserStore, useState } from "@webpack/common";
import type { Emoji } from "@webpack/types";
import type { Message } from "discord-types/general";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { ReactElement, ReactNode } from "react";


const Native = VencordNative.pluginHelpers.FakeNitro as PluginNative<typeof import("./native")>;


const StickerStore = findStoreLazy("StickersStore") as {
    getPremiumPacks(): StickerPack[];
    getAllGuildStickers(): Map<string, Sticker[]>;
    getStickerById(id: string): Sticker | undefined;
};

const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");

const UploadStore = findByPropsLazy("getUploads");

const OptionClasses = findByPropsLazy("optionName", "optionIcon", "optionLabel");

function createCloneableStore(initialState: any) {
    const store = { ...initialState };
    const listeners: (() => void)[] = [];

    function get() {
        return { ...store };
    }

    function set(newState: Partial<typeof store>) {
        Object.assign(store, newState);
        listeners.forEach(listener => listener());
    }

    function subscribe(listener: () => void) {
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }

    return {
        get,
        set,
        subscribe
    };
}

const BINARY_READ_OPTIONS = findByPropsLazy("readerFactory");

function searchProtoClassField(localName: string, protoClass: any) {
    const field = protoClass?.fields?.find((field: any) => field.localName === localName);
    if (!field) return;

    const fieldGetter = Object.values(field).find(value => typeof value === "function") as any;
    return fieldGetter?.();
}

const PreloadedUserSettingsActionCreators = proxyLazyWebpack(() => UserSettingsActionCreators.PreloadedUserSettingsActionCreators);
const AppearanceSettingsActionCreators = proxyLazyWebpack(() => searchProtoClassField("appearance", PreloadedUserSettingsActionCreators.ProtoClass));
const ClientThemeSettingsActionsCreators = proxyLazyWebpack(() => searchProtoClassField("clientThemeSettings", AppearanceSettingsActionCreators));

const isUnusableRoleSubscriptionEmoji = findByCodeLazy(".getUserIsAdmin(");

const enum EmojiIntentions {
    REACTION,
    STATUS,
    COMMUNITY_CONTENT,
    CHAT,
    GUILD_STICKER_RELATED_EMOJI,
    GUILD_ROLE_BENEFIT_EMOJI,
    COMMUNITY_CONTENT_ONLY,
    SOUNDBOARD,
    VOICE_CHANNEL_TOPIC,
    GIFT,
    AUTO_SUGGESTION,
    POLLS
}

const IS_BYPASSEABLE_INTENTION = `[${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention)`;

const enum StickerType {
    PNG = 1,
    APNG = 2,
    LOTTIE = 3,
    // don't think you can even have gif stickers but the docs have it
    GIF = 4
}

interface BaseSticker {
    available: boolean;
    description: string;
    format_type: number;
    id: string;
    name: string;
    tags: string;
    type: number;
}
interface GuildSticker extends BaseSticker {
    guild_id: string;
}
interface DiscordSticker extends BaseSticker {
    pack_id: string;
}
type Sticker = GuildSticker | DiscordSticker;

interface StickerPack {
    id: string;
    name: string;
    sku_id: string;
    description: string;
    cover_sticker_id: string;
    banner_asset_id: string;
    stickers: Sticker[];
}

const enum FakeNoticeType {
    Sticker,
    Emoji
}

const fakeNitroEmojiRegex = /\/emojis\/(\d+?)\.(png|webp|gif)/;
const fakeNitroStickerRegex = /\/stickers\/(\d+?)\./;
const fakeNitroGifStickerRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/;
const hyperLinkRegex = /\[.+?\]\((https?:\/\/.+?)\)/;

function SettingsComponent(props: { setValue(v: any): void; }) {
    const [fileUploader, setFileUploader] = useState(settings.store.fileUploader || "GoFile");
    const [customUploaderStore] = useState(() => createCloneableStore({
        name: settings.store.customUploaderName || "",
        requestURL: settings.store.customUploaderRequestURL || "",
        fileFormName: settings.store.customUploaderFileFormName || "",
        responseType: settings.store.customUploaderResponseType || "",
        url: settings.store.customUploaderURL || "",
        thumbnailURL: settings.store.customUploaderThumbnailURL || "",
        headers: (() => {
            const parsedHeaders = JSON.parse(settings.store.customUploaderHeaders || "{}");
            if (Object.keys(parsedHeaders).length === 0) {
                parsedHeaders[""] = "";
            }
            return parsedHeaders;
        })(),
        args: (() => {
            const parsedArgs = JSON.parse(settings.store.customUploaderArgs || "{}");
            if (Object.keys(parsedArgs).length === 0) {
                parsedArgs[""] = "";
            }
            return parsedArgs;
        })(),
    }));

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = customUploaderStore.subscribe(() => {
            const state = customUploaderStore.get();
            updateSetting("customUploaderName", state.name);
            updateSetting("customUploaderRequestURL", state.requestURL);
            updateSetting("customUploaderFileFormName", state.fileFormName);
            updateSetting("customUploaderResponseType", state.responseType);
            updateSetting("customUploaderURL", state.url);
            updateSetting("customUploaderThumbnailURL", state.thumbnailURL);
            updateSetting("customUploaderHeaders", JSON.stringify(state.headers));
            updateSetting("customUploaderArgs", JSON.stringify(state.args));
        });

        return unsubscribe;
    }, []);

    function updateSetting(key: keyof typeof settings.store, value: any) {
        if (key in settings.store) {
            (settings.store as any)[key] = value;
        } else {
            console.error(`Invalid setting key: ${key}`);
        }
    }


    function handleShareXConfigUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                try {
                    const config = JSON.parse(e.target?.result as string);

                    customUploaderStore.set({
                        name: "",
                        requestURL: "",
                        fileFormName: "",
                        responseType: "Text",
                        url: "",
                        thumbnailURL: "",
                        headers: { "": "" },
                        args: { "": "" }
                    });

                    customUploaderStore.set({
                        name: config.Name || "",
                        requestURL: config.RequestURL || "",
                        fileFormName: config.FileFormName || "",
                        responseType: config.ResponseType || "Text",
                        url: config.URL || "",
                        thumbnailURL: config.ThumbnailURL || "",
                        headers: config.Headers || { "": "" },
                        args: config.Arguments || { "": "" }
                    });

                    updateSetting("customUploaderName", config.Name || "");
                    updateSetting("customUploaderRequestURL", config.RequestURL || "");
                    updateSetting("customUploaderFileFormName", config.FileFormName || "");
                    updateSetting("customUploaderResponseType", config.ResponseType || "Text");
                    updateSetting("customUploaderURL", config.URL || "");
                    updateSetting("customUploaderThumbnailURL", config.ThumbnailURL || "");
                    updateSetting("customUploaderHeaders", JSON.stringify(config.Headers || { "": "" }));
                    updateSetting("customUploaderArgs", JSON.stringify(config.Arguments || { "": "" }));

                    setFileUploader("Custom");
                    updateSetting("fileUploader", "Custom");

                    showToast("ShareX config imported successfully!");
                } catch (error) {
                    console.error("Error parsing ShareX config:", error);
                    showToast("Error importing ShareX config. Check console for details.");
                }
            };
            reader.readAsText(file);

            event.target.value = "";
        }
    }

    const validateCustomUploaderSettings = () => {
        if (fileUploader === "Custom") {
            if (!settings.store.customUploaderRequestURL) {
                showToast("Custom uploader request URL is required.");
                return false;
            }
            if (!settings.store.customUploaderFileFormName) {
                showToast("Custom uploader file form name is required.");
                return false;
            }
            if (!settings.store.customUploaderURL) {
                showToast("Custom uploader URL (JSON path) is required.");
                return false;
            }
        }
        return true;
    };

    const handleFileUploaderChange = (v: string) => {
        if (v === "Custom" && !validateCustomUploaderSettings()) {
            return;
        }
        setFileUploader(v);
        updateSetting("fileUploader", v);
    };

    const handleArgChange = (oldKey: string, newKey: string, value: any) => {
        const state = customUploaderStore.get();
        const newArgs = { ...state.args };

        if (oldKey !== newKey) {
            delete newArgs[oldKey];
        }

        if (value === "" && newKey === "") {
            delete newArgs[oldKey];
        } else {
            newArgs[newKey] = value;
        }

        customUploaderStore.set({ args: newArgs });

        if (Object.values(newArgs).every(v => v !== "") && Object.keys(newArgs).every(k => k !== "")) {
            newArgs[""] = "";
        }

        customUploaderStore.set({ args: newArgs });
    };

    const handleHeaderChange = (oldKey: string, newKey: string, value: string) => {
        const state = customUploaderStore.get();
        const newHeaders = { ...state.headers };

        if (oldKey !== newKey) {
            delete newHeaders[oldKey];
        }

        if (value === "" && newKey === "") {
            delete newHeaders[oldKey];
        } else {
            newHeaders[newKey] = value;
        }

        customUploaderStore.set({ headers: newHeaders });

        if (Object.values(newHeaders).every(v => v !== "") && Object.keys(newHeaders).every(k => k !== "")) {
            newHeaders[""] = "";
        }

        customUploaderStore.set({ headers: newHeaders });
    };

    const triggerFileUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <Flex flexDirection="column">
            {/* File Uploader Selection */}
            <Forms.FormDivider />
            <Forms.FormSection title="Upload Limit Bypass">
                <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
                    Select the external file uploader service to be used to bypass the upload limit.
                </Forms.FormText>
                <Select
                    options={[
                        { label: "Custom Uploader", value: "Custom" },
                        { label: "Catbox (Up to 200MB)", value: "Catbox" },
                        { label: "Litterbox (Temporary | Up to 1GB)", value: "Litterbox" },
                        { label: "GoFile (Temporary | Unlimited | No Embeds)", value: "GoFile" },
                    ]}
                    placeholder="Select the file uploader service"
                    className={Margins.bottom16}
                    select={handleFileUploaderChange}
                    isSelected={v => v === fileUploader}
                    serialize={v => v}
                />
            </Forms.FormSection>

            {/* Auto-Send Settings */}
            <Forms.FormSection>
                <Switch
                    value={settings.store.autoSend === "Yes"}
                    onChange={(enabled: boolean) => updateSetting("autoSend", enabled ? "Yes" : "No")}
                    note="Whether to automatically send the links with the uploaded files to chat instead of just pasting them into the chatbox."
                    hideBorder={true}
                >
                    Auto-Send Uploads To Chat
                </Switch>
            </Forms.FormSection>

            {/* GoFile Settings */}
            {fileUploader === "GoFile" && (
                <>
                    <Forms.FormSection title="GoFile Token (optional)">
                        <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
                            Insert your personal GoFile account's token to save all uploads to your GoFile account.
                        </Forms.FormText>
                        <TextInput
                            type="text"
                            value={settings.store.gofileToken || ""}
                            placeholder="Insert GoFile Token"
                            onChange={newValue => updateSetting("gofileToken", newValue)}
                            className={Margins.top16}
                        />
                    </Forms.FormSection>
                </>
            )}

            {/* Catbox Settings */}
            {fileUploader === "Catbox" && (
                <>
                    <Forms.FormSection title="Catbox User hash (optional)">
                        <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
                            Insert your personal Catbox account's hash to save all uploads to your Catbox account.
                        </Forms.FormText>
                        <TextInput
                            type="text"
                            value={settings.store.catboxUserHash || ""}
                            placeholder="Insert User Hash"
                            onChange={newValue => updateSetting("catboxUserHash", newValue)}
                            className={Margins.top16}
                        />
                    </Forms.FormSection>
                </>
            )}

            {/* Litterbox Settings */}
            {fileUploader === "Litterbox" && (
                <>
                    <Forms.FormSection title="File Expiration Time">
                        <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
                            Select how long it should take for your uploads to expire and get deleted.
                        </Forms.FormText>
                        <Select
                            options={[
                                { label: "1 hour", value: "1h" },
                                { label: "12 hours", value: "12h" },
                                { label: "24 hours", value: "24h" },
                                { label: "72 hours", value: "72h" },
                            ]}
                            placeholder="Select Duration"
                            className={Margins.top16}
                            select={newValue => updateSetting("litterboxTime", newValue)}
                            isSelected={v => v === settings.store.litterboxTime}
                            serialize={v => v}
                        />
                    </Forms.FormSection>
                </>
            )}

            {/* Custom Uploader Settings */}
            {fileUploader === "Custom" && (
                <>
                    <Forms.FormSection title="Custom Uploader Name">
                        <TextInput
                            type="text"
                            value={customUploaderStore.get().name}
                            placeholder="Name"
                            onChange={(newValue: string) => customUploaderStore.set({ name: newValue })}
                            className={Margins.bottom16}
                        />
                    </Forms.FormSection>

                    <Forms.FormSection title="Request URL">
                        <TextInput
                            type="text"
                            value={customUploaderStore.get().requestURL}
                            placeholder="URL"
                            onChange={(newValue: string) => customUploaderStore.set({ requestURL: newValue })}
                            className={Margins.bottom16}
                        />
                    </Forms.FormSection>

                    <Forms.FormSection title="File Form Name">
                        <TextInput
                            type="text"
                            value={customUploaderStore.get().fileFormName}
                            placeholder="Name"
                            onChange={(newValue: string) => customUploaderStore.set({ fileFormName: newValue })}
                            className={Margins.bottom16}
                        />
                    </Forms.FormSection>

                    <Forms.FormSection title="Response type">
                        <Select
                            options={[
                                { label: "Text", value: "Text" },
                                { label: "JSON", value: "JSON" },
                            ]}
                            placeholder="Select Response Type"
                            className={Margins.bottom16}
                            select={(newValue: string) => customUploaderStore.set({ responseType: newValue })}
                            isSelected={(v: string) => v === customUploaderStore.get().responseType}
                            serialize={(v: string) => v}
                        />
                    </Forms.FormSection>

                    <Forms.FormSection title="URL (JSON path)">
                        <TextInput
                            type="text"
                            value={customUploaderStore.get().url}
                            placeholder="URL"
                            onChange={(newValue: string) => customUploaderStore.set({ url: newValue })}
                            className={Margins.bottom16}
                        />
                    </Forms.FormSection>

                    <Forms.FormSection title="Thumbnail URL (JSON path)">
                        <TextInput
                            type="text"
                            value={customUploaderStore.get().thumbnailURL}
                            placeholder="Thumbnail URL"
                            onChange={(newValue: string) => customUploaderStore.set({ thumbnailURL: newValue })}
                            className={Margins.bottom16}
                        />
                    </Forms.FormSection>

                    <Forms.FormDivider />
                    <Forms.FormTitle>Custom Uploader Arguments</Forms.FormTitle>
                    {Object.entries(customUploaderStore.get().args).map(([key, value], index) => (
                        <div key={index}>
                            <TextInput
                                type="text"
                                value={key}
                                placeholder="Argument Key"
                                onChange={(newKey: string) => handleArgChange(key, newKey, value as string)}
                                className={Margins.bottom16}
                            />
                            <TextInput
                                type="text"
                                value={value as string}
                                placeholder="Argument Value"
                                onChange={(newValue: string) => handleArgChange(key, key, newValue)}
                                className={Margins.bottom16}
                            />
                        </div>
                    ))}

                    <Forms.FormDivider />
                    <Forms.FormTitle>Headers</Forms.FormTitle>
                    {Object.entries(customUploaderStore.get().headers).map(([key, value], index) => (
                        <div key={index}>
                            <TextInput
                                type="text"
                                value={key}
                                placeholder="Header Key"
                                onChange={(newKey: string) => handleHeaderChange(key, newKey, value as string)}
                                className={Margins.bottom16}
                            />
                            <TextInput
                                type="text"
                                value={value as string}
                                placeholder="Header Value"
                                onChange={(newValue: string) => handleHeaderChange(key, key, newValue)}
                                className={Margins.bottom16}
                            />
                        </div>
                    ))}

                    <Forms.FormDivider />
                    <Forms.FormTitle>Import ShareX Config</Forms.FormTitle>
                    <Button
                        onClick={triggerFileUpload}
                        color={Button.Colors.BRAND}
                        size={Button.Sizes.XLARGE}
                        className={Margins.bottom16}
                    >
                        Import
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".sxcu"
                        style={{ display: "none" }}
                        onChange={handleShareXConfigUpload}
                    />
                </>
            )}
        </Flex>
    );
}

const settings = definePluginSettings({
    enableEmojiBypass: {
        description: "Allows sending fake emojis (also bypasses missing permission to use custom emojis)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    emojiSize: {
        description: "Size of the emojis when sending",
        type: OptionType.SLIDER,
        default: 48,
        markers: [32, 48, 64, 128, 160, 256, 512]
    },
    transformEmojis: {
        description: "Whether to transform fake emojis into real ones",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    enableStickerBypass: {
        description: "Allows sending fake stickers (also bypasses missing permission to use stickers)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    stickerSize: {
        description: "Size of the stickers when sending",
        type: OptionType.SLIDER,
        default: 160,
        markers: [32, 64, 128, 160, 256, 512]
    },
    transformStickers: {
        description: "Whether to transform fake stickers into real ones",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    transformCompoundSentence: {
        description: "Whether to transform fake stickers and emojis in compound sentences (sentences with more content than just the fake emoji or sticker link)",
        type: OptionType.BOOLEAN,
        default: false
    },
    enableStreamQualityBypass: {
        description: "Allow streaming in nitro quality",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    enableSoundboardBypass: {
        description: "Allows the use of all servers' soundboards (others can't hear it)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    enableSoundboardGuildLimitBypass: {
        description: "Allows the use of all sounds in the server's soundboard no matter what the server's boost level is",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    useHyperLinks: {
        description: "Whether to use hyperlinks when sending fake emojis and stickers",
        type: OptionType.BOOLEAN,
        default: true
    },
    hyperLinkText: {
        description: "What text the hyperlink should use. {{NAME}} will be replaced with the emoji/sticker name.",
        type: OptionType.STRING,
        default: "{{NAME}}"
    },
    disableEmbedPermissionCheck: {
        description: "Whether to disable the embed permission check when sending fake emojis and stickers",
        type: OptionType.BOOLEAN,
        default: false
    },
    fileUploader: {
        type: OptionType.SELECT,
        options: [
            { label: "Custom Uploader", value: "Custom" },
            { label: "Catbox", value: "Catbox", default: true },
            { label: "Litterbox", value: "Litterbox" },
            { label: "GoFile", value: "GoFile" },
        ],
        description: "Select the file uploader service",
        hidden: true
    },
    gofileToken: {
        type: OptionType.STRING,
        default: "",
        description: "GoFile Token (optional)",
        hidden: true
    },
    autoSend: {
        type: OptionType.SELECT,
        options: [
            { label: "Yes", value: "Yes" },
            { label: "No", value: "No", default: true },
        ],
        description: "Auto-Send",
        hidden: true
    },
    catboxUserHash: {
        type: OptionType.STRING,
        default: "",
        description: "User hash for Catbox uploader (optional)",
        hidden: true
    },
    litterboxTime: {
        type: OptionType.SELECT,
        options: [
            { label: "1 hour", value: "1h", default: true },
            { label: "12 hours", value: "12h" },
            { label: "24 hours", value: "24h" },
            { label: "72 hours", value: "72h" },
        ],
        description: "Duration for files on Litterbox before they are deleted",
        hidden: true
    },
    customUploaderName: {
        type: OptionType.STRING,
        default: "",
        description: "Name of the custom uploader",
        hidden: true
    },
    customUploaderRequestURL: {
        type: OptionType.STRING,
        default: "",
        description: "Request URL for the custom uploader",
        hidden: true
    },
    customUploaderFileFormName: {
        type: OptionType.STRING,
        default: "",
        description: "File form name for the custom uploader",
        hidden: true
    },
    customUploaderResponseType: {
        type: OptionType.SELECT,
        options: [
            { label: "Text", value: "Text", default: true },
            { label: "JSON", value: "JSON" },
        ],
        description: "Response type for the custom uploader",
        hidden: true
    },
    customUploaderURL: {
        type: OptionType.STRING,
        default: "",
        description: "URL (JSON path) for the custom uploader",
        hidden: true
    },
    customUploaderThumbnailURL: {
        type: OptionType.STRING,
        default: "",
        description: "Thumbnail URL (JSON path) for the custom uploader",
        hidden: true
    },
    customUploaderHeaders: {
        type: OptionType.STRING,
        default: JSON.stringify({}),
        description: "Headers for the custom uploader (JSON string)",
        hidden: true
    },
    customUploaderArgs: {
        type: OptionType.STRING,
        default: JSON.stringify({}),
        description: "Arguments for the custom uploader (JSON string)",
        hidden: true
    },
    customSettings: {
        type: OptionType.COMPONENT,
        component: SettingsComponent,
        description: "Configure custom uploader settings",
        hidden: false
    },
}).withPrivateSettings<{
    customUploaderArgs?: Record<string, string>;
    customUploaderHeaders?: Record<string, string>;
}>();

function sendTextToChat(text: string) {
    if (settings.store.autoSend === "No") {
        insertTextIntoChatInputBox(text);
    } else {
        const channelId = SelectedChannelStore.getChannelId();
        sendMessage(channelId, { content: text });
    }
}

async function resolveFile(options: Argument[], ctx: CommandContext): Promise<File | null> {
    for (const opt of options) {
        if (opt.name === "file") {
            const upload = UploadStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
            return upload.item.file;
        }
    }
    return null;
}

async function uploadFileToGofile(file: File, channelId: string) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const fileName = file.name;
        const fileType = file.type;

        const serverResponse = await fetch("https://api.gofile.io/servers");
        const serverData = await serverResponse.json();
        const server = serverData.data.servers[Math.floor(Math.random() * serverData.data.servers.length)].name;

        const uploadResult = await Native.uploadFileToGofileNative(`https://${server}.gofile.io/uploadFile`, arrayBuffer, fileName, fileType);

        if ((uploadResult as any).status === "ok") {
            const { downloadPage } = (uploadResult as any).data;
            setTimeout(() => sendTextToChat(`${downloadPage} `), 10);
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        }
        else {
            console.error("Error uploading file:", uploadResult);
            sendBotMessage(channelId, { content: "Error uploading file. Check the console for more info." });
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        }
    } catch (error) {
        console.error("Error uploading file:", error);
        sendBotMessage(channelId, { content: "Error uploading file. Check the console for more info." });
        UploadManager.clearAll(channelId, DraftType.SlashCommand);
    }
}

async function uploadFileToCatbox(file: File, channelId: string) {
    try {
        const url = "https://catbox.moe/user/api.php";
        const userHash = settings.store.catboxUserHash;
        const fileSizeMB = file.size / (1024 * 1024);

        const arrayBuffer = await file.arrayBuffer();
        const fileName = file.name;

        const uploadResult = await Native.uploadFileToCatboxNative(url, arrayBuffer, fileName, file.type, userHash);

        if (uploadResult.startsWith("https://") || uploadResult.startsWith("http://")) {
            const videoExtensions = [".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv", ".wmv", ".m4v", ".mpg", ".mpeg", ".3gp", ".ogv"];
            let finalUrl = uploadResult;

            if (fileSizeMB >= 150 && videoExtensions.some(ext => finalUrl.endsWith(ext))) {
                finalUrl = `https://embeds.video/${finalUrl}`;
            }

            setTimeout(() => sendTextToChat(`${finalUrl} `), 10);
            showToast("File Successfully Uploaded!", Toasts.Type.SUCCESS);
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        } else {
            console.error("Unable to upload file. This is likely an issue with your network connection, firewall, or VPN.", uploadResult);
            sendBotMessage(channelId, { content: "**Unable to upload file.** Check the console for more info. \n-# This is likely an issue with your network connection, firewall, or VPN." });
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        }
    } catch (error) {
        console.error("Unable to upload file. This is likely an issue with your network connection, firewall, or VPN.", error);
        sendBotMessage(channelId, { content: "**Unable to upload file.** Check the console for more info. \n-# This is likely an issue with your network connection, firewall, or VPN." });
        UploadManager.clearAll(channelId, DraftType.SlashCommand);
    }
}

async function uploadFileToLitterbox(file: File, channelId: string) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const fileName = file.name;
        const fileType = file.type;
        const fileSizeMB = file.size / (1024 * 1024);
        const time = settings.store.litterboxTime;

        const uploadResult = await Native.uploadFileToLitterboxNative(arrayBuffer, fileName, fileType, time);

        if (uploadResult.startsWith("https://") || uploadResult.startsWith("http://")) {
            const videoExtensions = [".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv", ".wmv", ".m4v", ".mpg", ".mpeg", ".3gp", ".ogv"];
            let finalUrl = uploadResult;

            if (fileSizeMB >= 150 && videoExtensions.some(ext => finalUrl.endsWith(ext))) {
                finalUrl = `https://embeds.video/${finalUrl}`;
            }

            setTimeout(() => sendTextToChat(`${finalUrl}`), 10);
            showToast("File Successfully Uploaded!", Toasts.Type.SUCCESS);
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        } else {
            console.error("Unable to upload file. This is likely an issue with your network connection, firewall, or VPN.", uploadResult);
            sendBotMessage(channelId, { content: "**Unable to upload file.** Check the console for more info. \n-# This is likely an issue with your network connection, firewall, or VPN." });
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        }
    } catch (error) {
        console.error("Unable to upload file. This is likely an issue with your network connection, firewall, or VPN.", error);
        sendBotMessage(channelId, { content: "**Unable to upload file.** Check the console for more info. \n-# This is likely an issue with your network connection, firewall, or VPN." });
        UploadManager.clearAll(channelId, DraftType.SlashCommand);
    }
}

async function uploadFileCustom(file: File, channelId: string) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const fileName = file.name;
        const fileType = file.type;

        const fileFormName = settings.store.customUploaderFileFormName || "file[]";
        const customArgs = JSON.parse(settings.store.customUploaderArgs || "{}");
        const customHeaders = JSON.parse(settings.store.customUploaderHeaders || "{}");
        const responseType = settings.store.customUploaderResponseType;
        const urlPath = settings.store.customUploaderURL.split(".");

        const finalUrl = await Native.uploadFileCustomNative(settings.store.customUploaderRequestURL, arrayBuffer, fileName, fileType, fileFormName, customArgs, customHeaders, responseType, urlPath);

        if (finalUrl.startsWith("https://") || finalUrl.startsWith("http://")) {
            const videoExtensions = [".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv", ".wmv", ".m4v", ".mpg", ".mpeg", ".3gp", ".ogv"];
            let finalUrlModified = finalUrl;

            if (videoExtensions.some(ext => finalUrlModified.endsWith(ext))) {
                finalUrlModified = `https://embeds.video/${finalUrlModified}`;
            }

            setTimeout(() => sendTextToChat(`${finalUrlModified} `), 10);
            showToast("File Successfully Uploaded!", Toasts.Type.SUCCESS);
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        } else {
            console.error("Unable to upload file. This is likely an issue with your network connection, firewall, or VPN. Invalid URL returned");
            sendBotMessage(channelId, { content: "**Unable to upload file.** Check the console for more info. \n-# This is likely an issue with your network connection, firewall, or VPN." });
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
        }
    } catch (error) {
        console.error("Unable to upload file. This is likely an issue with your network connection, firewall, or VPN.", error);
        sendBotMessage(channelId, { content: `Unable to upload file. This is likely an issue with your network connection, firewall, or VPN. ${error}. Check the console for more info. \n-# This is likely an issue with your network connection, firewall, or VPN.` });
        UploadManager.clearAll(channelId, DraftType.SlashCommand);
    }
}

async function uploadFile(file: File, channelId: string) {
    const uploader = settings.store.fileUploader;
    switch (uploader) {
        case "GoFile":
            await uploadFileToGofile(file, channelId);
            break;
        case "Catbox":
            await uploadFileToCatbox(file, channelId);
            break;
        case "Litterbox":
            await uploadFileToLitterbox(file, channelId);
            break;
        case "Custom":
            await uploadFileCustom(file, channelId);
            break;
        default:
            console.error("Unknown uploader:", uploader);
            sendBotMessage(channelId, { content: "Error: Unknown uploader selected." });
            UploadManager.clearAll(channelId, DraftType.SlashCommand);
    }
}

function triggerFileUpload() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.style.display = "none";

    fileInput.onchange = async event => {
        const target = event.target as HTMLInputElement;
        if (target && target.files && target.files.length > 0) {
            const file = target.files[0];
            if (file) {
                const channelId = SelectedChannelStore.getChannelId();
                showToast("Uploading file... Please wait.");
                await uploadFile(file, channelId);
            } else {
                showToast("No file selected!");
            }
        }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (props.channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel)) return;

    children.splice(1, 0,
        <Menu.MenuItem
            id="upload-big-file"
            label={
                <div className={OptionClasses.optionLabel}>
                    <OpenExternalIcon className={OptionClasses.optionIcon} height={24} width={24} />
                    <div className={OptionClasses.optionName}>Upload a Big File</div>
                </div>
            }
            action={triggerFileUpload}
        />
    );
};

function hasPermission(channelId: string, permission: bigint) {
    const channel = ChannelStore.getChannel(channelId);

    if (!channel || channel.isPrivate()) return true;

    return PermissionStore.can(permission, channel);
}

const hasExternalEmojiPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.USE_EXTERNAL_EMOJIS);
const hasExternalStickerPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.USE_EXTERNAL_STICKERS);
const hasEmbedPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.EMBED_LINKS);
const hasAttachmentPerms = (channelId: string) => hasPermission(channelId, PermissionsBits.ATTACH_FILES);

function makeBypassPatches(): Omit<Patch, "plugin"> {
    const mapping: Array<{ func: string, predicate?: () => boolean; }> = [
        { func: "canUseCustomStickersEverywhere", predicate: () => settings.store.enableStickerBypass },
        { func: "canUseHighVideoUploadQuality", predicate: () => settings.store.enableStreamQualityBypass },
        { func: "canStreamQuality", predicate: () => settings.store.enableStreamQualityBypass },
        { func: "canUseClientThemes" },
        { func: "canUseCustomNotificationSounds" },
        { func: "canUsePremiumAppIcons" }
    ];

    return {
        find: "canUseCustomStickersEverywhere:",
        replacement: mapping.map(({ func, predicate }) => ({
            match: new RegExp(String.raw`(?<=${func}:)\i`),
            replace: "() => true",
            predicate
        }))
    };
}

export default definePlugin({
    name: "FakeNitro",
    authors: [Devs.Arjix, Devs.ScattrdBlade, Devs.D3SOX, Devs.Ven, Devs.fawn, Devs.captain, Devs.Nuckyz, Devs.AutumnVN, Devs.Loukios],
    description: "Allows you to stream in nitro quality, upload bigger files, send fake emojis/stickers, use client themes and custom Discord notifications.",
    contextMenus: {
        "channel-attach": ctxMenuPatch,
    },
    settings,

    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "fileupload",
            description: "Upload a file",
            options: [
                {
                    name: "file",
                    description: "The file to upload",
                    type: ApplicationCommandOptionType.ATTACHMENT,
                    required: true,
                },
            ],
            execute: async (opts, cmdCtx) => {
                const file = await resolveFile(opts, cmdCtx);
                if (file) {
                    showToast("Uploading file... Please wait.");
                    await uploadFile(file, cmdCtx.channel.id);
                } else {
                    sendBotMessage(cmdCtx.channel.id, { content: "No file selected!" });
                    UploadManager.clearAll(cmdCtx.channel.id, DraftType.SlashCommand);
                }
            },
        },
    ],

    patches: [
        // General bypass patches
        makeBypassPatches(),
        // Patch the emoji picker in voice calls to not be bypassed by fake nitro
        {
            find: "emojiItemDisabled]",
            predicate: () => settings.store.enableEmojiBypass,
            replacement: {
                match: /CHAT/,
                replace: "STATUS"
            }
        },
        {
            find: ".PREMIUM_LOCKED;",
            group: true,
            predicate: () => settings.store.enableEmojiBypass,
            replacement: [
                {
                    // Create a variable for the intention of using the emoji
                    match: /(?<=\.USE_EXTERNAL_EMOJIS.+?;)(?<=intention:(\i).+?)/,
                    replace: (_, intention) => `const fakeNitroIntention=${intention};`
                },
                {
                    // Disallow the emoji for external if the intention doesn't allow it
                    match: /&&!\i&&!\i(?=\)return \i\.\i\.DISALLOW_EXTERNAL;)/,
                    replace: m => `${m}&&!${IS_BYPASSEABLE_INTENTION}`
                },
                {
                    // Disallow the emoji for unavailable if the intention doesn't allow it
                    match: /!\i\.available(?=\)return \i\.\i\.GUILD_SUBSCRIPTION_UNAVAILABLE;)/,
                    replace: m => `${m}&&!${IS_BYPASSEABLE_INTENTION}`
                },
                {
                    // Disallow the emoji for premium locked if the intention doesn't allow it
                    match: /!\i\.\i\.canUseEmojisEverywhere\(\i\)/,
                    replace: m => `(${m}&&!${IS_BYPASSEABLE_INTENTION})`
                },
                {
                    // Allow animated emojis to be used if the intention allows it
                    match: /(?<=\|\|)\i\.\i\.canUseAnimatedEmojis\(\i\)/,
                    replace: m => `(${m}||${IS_BYPASSEABLE_INTENTION})`
                }
            ]
        },
        // Allows the usage of subscription-locked emojis
        {
            find: ".getUserIsAdmin(",
            replacement: {
                match: /(function \i\(\i,\i)\){(.{0,250}.getUserIsAdmin\(.+?return!1})/,
                replace: (_, rest1, rest2) => `${rest1},fakeNitroOriginal){if(!fakeNitroOriginal)return false;${rest2}`
            }
        },
        // Make stickers always available
        {
            find: '"SENDABLE"',
            predicate: () => settings.store.enableStickerBypass,
            replacement: {
                match: /\i\.available\?/,
                replace: "true?"
            }
        },
        // Remove boost requirements to stream with high quality
        {
            find: "#{intl::STREAM_FPS_OPTION}",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: ""
            }
        },
        {
            find: '"UserSettingsProtoStore"',
            replacement: [
                {
                    // Overwrite incoming connection settings proto with our local settings
                    match: /function (\i)\((\i)\){(?=.*CONNECTION_OPEN:\1)/,
                    replace: (m, funcName, props) => `${m}$self.handleProtoChange(${props}.userSettingsProto,${props}.user);`
                },
                {
                    // Overwrite non local proto changes with our local settings
                    match: /let{settings:/,
                    replace: "arguments[0].local||$self.handleProtoChange(arguments[0].settings.proto);$&"
                }
            ]
        },
        // Call our function to handle changing the gradient theme when selecting a new one
        {
            find: ",updateTheme(",
            replacement: {
                match: /(function \i\(\i\){let{backgroundGradientPresetId:(\i).+?)(\i\.\i\.updateAsync.+?theme=(.+?),.+?},\i\))/,
                replace: (_, rest, backgroundGradientPresetId, originalCall, theme) => `${rest}$self.handleGradientThemeSelect(${backgroundGradientPresetId},${theme},()=>${originalCall});`
            }
        },
        {
            find: '["strong","em","u","text","inlineCode","s","spoiler"]',
            replacement: [
                {
                    // Call our function to decide whether the emoji link should be kept or not
                    predicate: () => settings.store.transformEmojis,
                    match: /1!==(\i)\.length\|\|1!==\i\.length/,
                    replace: (m, content) => `${m}||$self.shouldKeepEmojiLink(${content}[0])`
                },
                {
                    // Patch the rendered message content to add fake nitro emojis or remove sticker links
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(?=return{hasSpoilerEmbeds:\i,content:(\i)})/,
                    replace: (_, content) => `${content}=$self.patchFakeNitroEmojisOrRemoveStickersLinks(${content},arguments[2]?.formatInline);`
                }
            ]
        },
        {
            find: "}renderEmbeds(",
            replacement: [
                {
                    // Call our function to decide whether the embed should be ignored or not
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(renderEmbeds\((\i)\){)(.+?embeds\.map\(\((\i),\i\)?=>{)/,
                    replace: (_, rest1, message, rest2, embed) => `${rest1}const fakeNitroMessage=${message};${rest2}if($self.shouldIgnoreEmbed(${embed},fakeNitroMessage))return null;`
                },
                {
                    // Patch the stickers array to add fake nitro stickers
                    predicate: () => settings.store.transformStickers,
                    match: /renderStickersAccessories\((\i)\){let (\i)=\(0,\i\.\i\)\(\i\).+?;/,
                    replace: (m, message, stickers) => `${m}${stickers}=$self.patchFakeNitroStickers(${stickers},${message});`
                },
                {
                    // Filter attachments to remove fake nitro stickers or emojis
                    predicate: () => settings.store.transformStickers,
                    match: /renderAttachments\(\i\){.+?{attachments:(\i).+?;/,
                    replace: (m, attachments) => `${m}${attachments}=$self.filterAttachments(${attachments});`
                }
            ]
        },
        {
            find: "#{intl::STICKER_POPOUT_UNJOINED_PRIVATE_GUILD_DESCRIPTION}",
            predicate: () => settings.store.transformStickers,
            replacement: [
                {
                    // Export the renderable sticker to be used in the fake nitro sticker notice
                    match: /let{renderableSticker:(\i).{0,270}sticker:\i,channel:\i,/,
                    replace: (m, renderableSticker) => `${m}fakeNitroRenderableSticker:${renderableSticker},`
                },
                {
                    // Add the fake nitro sticker notice
                    match: /(let \i,{sticker:\i,channel:\i,closePopout:\i.+?}=(\i).+?;)(.+?description:)(\i)(?=,sticker:\i)/,
                    replace: (_, rest, props, rest2, reactNode) => `${rest}let{fakeNitroRenderableSticker}=${props};${rest2}$self.addFakeNotice(${FakeNoticeType.Sticker},${reactNode},!!fakeNitroRenderableSticker?.fake)`
                }
            ]
        },
        {
            find: ".EMOJI_UPSELL_POPOUT_MORE_EMOJIS_OPENED,",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                // Export the emoji node to be used in the fake nitro emoji notice
                match: /isDiscoverable:\i,shouldHideRoleSubscriptionCTA:\i,(?<={node:(\i),.+?)/,
                replace: (m, node) => `${m}fakeNitroNode:${node},`
            }
        },
        {
            find: "#{intl::EMOJI_POPOUT_UNJOINED_DISCOVERABLE_GUILD_DESCRIPTION}",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                // Add the fake nitro emoji notice
                match: /(?<=emojiDescription:)(\i)(?<=\1=\i\((\i)\).+?)/,
                replace: (_, reactNode, props) => `$self.addFakeNotice(${FakeNoticeType.Emoji},${reactNode},!!${props}?.fakeNitroNode?.fake)`
            }
        },
        {
            find: "canUseSoundboardEverywhere:function",
            predicate: () => settings.store.enableSoundboardBypass,
            replacement: {
                // Allows using the soundboard everywhere
                match: /canUseSoundboardEverywhere:function\(\i\){/,
                replace: "$&return true;"
            },
        },
        // Separate patch for allowing using custom app icons
        {
            find: /\.getCurrentDesktopIcon.{0,25}\.isPremium/,
            replacement: {
                match: /\i\.\i\.isPremium\(\i\.\i\.getCurrentUser\(\)\)/,
                replace: "true"
            }
        },
        // Make all Soundboard sounds available
        {
            find: 'type:"GUILD_SOUNDBOARD_SOUND_CREATE"',
            predicate: () => settings.store.enableSoundboardGuildLimitBypass,
            replacement: {
                match: /(?<=type:"(?:SOUNDBOARD_SOUNDS_RECEIVED|GUILD_SOUNDBOARD_SOUND_CREATE|GUILD_SOUNDBOARD_SOUND_UPDATE|GUILD_SOUNDBOARD_SOUNDS_UPDATE)".+?available:)\i\.available/g,
                replace: "true"
            }
        }
    ],

    get guildId() {
        return getCurrentGuild()?.id;
    },

    get canUseEmotes() {
        return (UserStore.getCurrentUser().premiumType ?? 0) > 0;
    },

    get canUseStickers() {
        return (UserStore.getCurrentUser().premiumType ?? 0) > 1;
    },

    handleProtoChange(proto: any, user: any) {
        try {
            if (proto == null || typeof proto === "string") return;

            const premiumType: number = user?.premium_type ?? UserStore?.getCurrentUser()?.premiumType ?? 0;

            if (premiumType !== 2) {
                proto.appearance ??= AppearanceSettingsActionCreators.create();

                if (UserSettingsProtoStore.settings.appearance?.theme != null) {
                    const appearanceSettingsDummy = AppearanceSettingsActionCreators.create({
                        theme: UserSettingsProtoStore.settings.appearance.theme
                    });

                    proto.appearance.theme = appearanceSettingsDummy.theme;
                }

                if (UserSettingsProtoStore.settings.appearance?.clientThemeSettings?.backgroundGradientPresetId?.value != null) {
                    const clientThemeSettingsDummy = ClientThemeSettingsActionsCreators.create({
                        backgroundGradientPresetId: {
                            value: UserSettingsProtoStore.settings.appearance.clientThemeSettings.backgroundGradientPresetId.value
                        }
                    });

                    proto.appearance.clientThemeSettings ??= clientThemeSettingsDummy;
                    proto.appearance.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummy.backgroundGradientPresetId;
                }
            }
        } catch (err) {
            new Logger("FakeNitro").error(err);
        }
    },

    handleGradientThemeSelect(backgroundGradientPresetId: number | undefined, theme: number, original: () => void) {
        const premiumType = UserStore?.getCurrentUser()?.premiumType ?? 0;
        if (premiumType === 2 || backgroundGradientPresetId == null) return original();

        if (!PreloadedUserSettingsActionCreators || !AppearanceSettingsActionCreators || !ClientThemeSettingsActionsCreators || !BINARY_READ_OPTIONS) return;

        const currentAppearanceSettings = PreloadedUserSettingsActionCreators.getCurrentValue().appearance;

        const newAppearanceProto = currentAppearanceSettings != null
            ? AppearanceSettingsActionCreators.fromBinary(AppearanceSettingsActionCreators.toBinary(currentAppearanceSettings), BINARY_READ_OPTIONS)
            : AppearanceSettingsActionCreators.create();

        newAppearanceProto.theme = theme;

        const clientThemeSettingsDummy = ClientThemeSettingsActionsCreators.create({
            backgroundGradientPresetId: {
                value: backgroundGradientPresetId
            }
        });

        newAppearanceProto.clientThemeSettings ??= clientThemeSettingsDummy;
        newAppearanceProto.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummy.backgroundGradientPresetId;

        const proto = PreloadedUserSettingsActionCreators.ProtoClass.create();
        proto.appearance = newAppearanceProto;

        FluxDispatcher.dispatch({
            type: "USER_SETTINGS_PROTO_UPDATE",
            local: true,
            partial: true,
            settings: {
                type: 1,
                proto
            }
        });
    },

    trimContent(content: Array<any>) {
        const firstContent = content[0];
        if (typeof firstContent === "string") {
            content[0] = firstContent.trimStart();
            content[0] || content.shift();
        } else if (typeof firstContent?.props?.children === "string") {
            firstContent.props.children = firstContent.props.children.trimStart();
            firstContent.props.children || content.shift();
        }

        const lastIndex = content.length - 1;
        const lastContent = content[lastIndex];
        if (typeof lastContent === "string") {
            content[lastIndex] = lastContent.trimEnd();
            content[lastIndex] || content.pop();
        } else if (typeof lastContent?.props?.children === "string") {
            lastContent.props.children = lastContent.props.children.trimEnd();
            lastContent.props.children || content.pop();
        }
    },

    clearEmptyArrayItems(array: Array<any>) {
        return array.filter(item => item != null);
    },

    ensureChildrenIsArray(child: ReactElement<any>) {
        if (!Array.isArray(child.props.children)) child.props.children = [child.props.children];
    },

    patchFakeNitroEmojisOrRemoveStickersLinks(content: Array<any>, inline: boolean) {
        // If content has more than one child or it's a single ReactElement like a header, list or span
        if ((content.length > 1 || typeof content[0]?.type === "string") && !settings.store.transformCompoundSentence) return content;

        let nextIndex = content.length;

        const transformLinkChild = (child: ReactElement<any>) => {
            if (settings.store.transformEmojis) {
                const fakeNitroMatch = child.props.href.match(fakeNitroEmojiRegex);
                if (fakeNitroMatch) {
                    let url: URL | null = null;
                    try {
                        url = new URL(child.props.href);
                    } catch { }

                    const emojiName = EmojiStore.getCustomEmojiById(fakeNitroMatch[1])?.name ?? url?.searchParams.get("name") ?? "FakeNitroEmoji";

                    return Parser.defaultRules.customEmoji.react({
                        jumboable: !inline && content.length === 1 && typeof content[0].type !== "string",
                        animated: fakeNitroMatch[2] === "gif",
                        emojiId: fakeNitroMatch[1],
                        name: emojiName,
                        fake: true
                    }, void 0, { key: String(nextIndex++) });
                }
            }

            if (settings.store.transformStickers) {
                if (fakeNitroStickerRegex.test(child.props.href)) return null;

                const gifMatch = child.props.href.match(fakeNitroGifStickerRegex);
                if (gifMatch) {
                    // There is no way to differentiate a regular gif attachment from a fake nitro animated sticker, so we check if the StickerStore contains the id of the fake sticker
                    if (StickerStore.getStickerById(gifMatch[1])) return null;
                }
            }

            return child;
        };

        const transformChild = (child: ReactElement<any>) => {
            if (child?.props?.trusted != null) return transformLinkChild(child);
            if (child?.props?.children != null) {
                if (!Array.isArray(child.props.children)) {
                    child.props.children = modifyChild(child.props.children);
                    return child;
                }

                child.props.children = modifyChildren(child.props.children);
                if (child.props.children.length === 0) return null;
                return child;
            }

            return child;
        };

        const modifyChild = (child: ReactElement<any>) => {
            const newChild = transformChild(child);

            if (newChild?.type === "ul" || newChild?.type === "ol") {
                this.ensureChildrenIsArray(newChild);
                if (newChild.props.children.length === 0) return null;

                let listHasAnItem = false;
                for (const [index, child] of newChild.props.children.entries()) {
                    if (child == null) {
                        delete newChild.props.children[index];
                        continue;
                    }

                    this.ensureChildrenIsArray(child);
                    if (child.props.children.length > 0) listHasAnItem = true;
                    else delete newChild.props.children[index];
                }

                if (!listHasAnItem) return null;

                newChild.props.children = this.clearEmptyArrayItems(newChild.props.children);
            }

            return newChild;
        };

        const modifyChildren = (children: Array<ReactElement<any>>) => {
            for (const [index, child] of children.entries()) children[index] = modifyChild(child);

            children = this.clearEmptyArrayItems(children);

            return children;
        };

        try {
            const newContent = modifyChildren(lodash.cloneDeep(content));
            this.trimContent(newContent);

            return newContent;
        } catch (err) {
            new Logger("FakeNitro").error(err);
            return content;
        }
    },

    patchFakeNitroStickers(stickers: Array<any>, message: Message) {
        const itemsToMaybePush: Array<string> = [];

        const contentItems = message.content.split(/\s/);
        if (settings.store.transformCompoundSentence) itemsToMaybePush.push(...contentItems);
        else if (contentItems.length === 1) itemsToMaybePush.push(contentItems[0]);

        itemsToMaybePush.push(...message.attachments.filter(attachment => attachment.content_type === "image/gif").map(attachment => attachment.url));

        for (const item of itemsToMaybePush) {
            if (!settings.store.transformCompoundSentence && !item.startsWith("http") && !hyperLinkRegex.test(item)) continue;

            const imgMatch = item.match(fakeNitroStickerRegex);
            if (imgMatch) {
                let url: URL | null = null;
                try {
                    url = new URL(item);
                } catch { }

                const stickerName = StickerStore.getStickerById(imgMatch[1])?.name ?? url?.searchParams.get("name") ?? "FakeNitroSticker";
                stickers.push({
                    format_type: 1,
                    id: imgMatch[1],
                    name: stickerName,
                    fake: true
                });

                continue;
            }

            const gifMatch = item.match(fakeNitroGifStickerRegex);
            if (gifMatch) {
                if (!StickerStore.getStickerById(gifMatch[1])) continue;

                const stickerName = StickerStore.getStickerById(gifMatch[1])?.name ?? "FakeNitroSticker";
                stickers.push({
                    format_type: 2,
                    id: gifMatch[1],
                    name: stickerName,
                    fake: true
                });
            }
        }

        return stickers;
    },

    shouldIgnoreEmbed(embed: Message["embeds"][number], message: Message) {
        const contentItems = message.content.split(/\s/);
        if (contentItems.length > 1 && !settings.store.transformCompoundSentence) return false;

        switch (embed.type) {
            case "image": {
                if (
                    !settings.store.transformCompoundSentence
                    && !contentItems.some(item => item === embed.url! || item.match(hyperLinkRegex)?.[1] === embed.url!)
                ) return false;

                if (settings.store.transformEmojis) {
                    if (fakeNitroEmojiRegex.test(embed.url!)) return true;
                }

                if (settings.store.transformStickers) {
                    if (fakeNitroStickerRegex.test(embed.url!)) return true;

                    const gifMatch = embed.url!.match(fakeNitroGifStickerRegex);
                    if (gifMatch) {
                        // There is no way to differentiate a regular gif attachment from a fake nitro animated sticker, so we check if the StickerStore contains the id of the fake sticker
                        if (StickerStore.getStickerById(gifMatch[1])) return true;
                    }
                }

                break;
            }
        }

        return false;
    },

    filterAttachments(attachments: Message["attachments"]) {
        return attachments.filter(attachment => {
            if (attachment.content_type !== "image/gif") return true;

            const match = attachment.url.match(fakeNitroGifStickerRegex);
            if (match) {
                // There is no way to differentiate a regular gif attachment from a fake nitro animated sticker, so we check if the StickerStore contains the id of the fake sticker
                if (StickerStore.getStickerById(match[1])) return false;
            }

            return true;
        });
    },

    shouldKeepEmojiLink(link: any) {
        return link.target && fakeNitroEmojiRegex.test(link.target);
    },

    addFakeNotice(type: FakeNoticeType, node: Array<ReactNode>, fake: boolean) {
        if (!fake) return node;

        node = Array.isArray(node) ? node : [node];

        switch (type) {
            case FakeNoticeType.Sticker: {
                node.push(" This is a FakeNitro sticker and renders like a real sticker only for you. Appears as a link to non-plugin users.");

                return node;
            }
            case FakeNoticeType.Emoji: {
                node.push(" This is a FakeNitro emoji and renders like a real emoji only for you. Appears as a link to non-plugin users.");

                return node;
            }
        }
    },

    getStickerLink(stickerId: string) {
        return `https://media.discordapp.net/stickers/${stickerId}.png?size=${settings.store.stickerSize}`;
    },

    async sendAnimatedSticker(stickerLink: string, stickerId: string, channelId: string) {
        const { parseURL } = importApngJs();

        const { frames, width, height } = await parseURL(stickerLink);

        const gif = GIFEncoder();
        const resolution = settings.store.stickerSize;

        const canvas = document.createElement("canvas");
        canvas.width = resolution;
        canvas.height = resolution;

        const ctx = canvas.getContext("2d", {
            willReadFrequently: true
        })!;

        const scale = resolution / Math.max(width, height);
        ctx.scale(scale, scale);

        let previousFrameData: ImageData;

        for (const frame of frames) {
            const { left, top, width, height, img, delay, blendOp, disposeOp } = frame;

            previousFrameData = ctx.getImageData(left, top, width, height);

            if (blendOp === ApngBlendOp.SOURCE) {
                ctx.clearRect(left, top, width, height);
            }

            ctx.drawImage(img, left, top, width, height);

            const { data } = ctx.getImageData(0, 0, resolution, resolution);

            const palette = quantize(data, 256);
            const index = applyPalette(data, palette);

            gif.writeFrame(index, resolution, resolution, {
                transparent: true,
                palette,
                delay
            });

            if (disposeOp === ApngDisposeOp.BACKGROUND) {
                ctx.clearRect(left, top, width, height);
            } else if (disposeOp === ApngDisposeOp.PREVIOUS) {
                ctx.putImageData(previousFrameData, left, top);
            }
        }

        gif.finish();

        const file = new File([gif.bytesView()], `${stickerId}.gif`, { type: "image/gif" });
        UploadHandler.promptToUpload([file], ChannelStore.getChannel(channelId), DraftType.ChannelMessage);
    },

    canUseEmote(e: Emoji, channelId: string) {
        if (e.type === 0) return true;
        if (e.available === false) return false;

        if (isUnusableRoleSubscriptionEmoji(e, this.guildId, true)) return false;

        let isUsableTwitchSubEmote = false;
        if (e.managed && e.guildId) {
            // @ts-ignore outdated type
            const myRoles = GuildMemberStore.getSelfMember(e.guildId)?.roles ?? [];
            isUsableTwitchSubEmote = e.roles.some(r => myRoles.includes(r));
        }

        if (this.canUseEmotes || isUsableTwitchSubEmote)
            return e.guildId === this.guildId || hasExternalEmojiPerms(channelId);
        else
            return !e.animated && e.guildId === this.guildId;
    },

    start() {
        const s = settings.store;

        if (!s.enableEmojiBypass && !s.enableStickerBypass) {
            return;
        }

        function getWordBoundary(origStr: string, offset: number) {
            return (!origStr[offset] || /\s/.test(origStr[offset])) ? "" : " ";
        }

        function cannotEmbedNotice() {
            return new Promise<boolean>(resolve => {
                Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Forms.FormText>
                            You are trying to send/edit a message that contains a FakeNitro emoji or sticker,
                            however you do not have permissions to embed links in the current channel.
                            Are you sure you want to send this message? Your FakeNitro items will appear as a link only.
                        </Forms.FormText>
                        <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
                            You can disable this notice in the plugin settings.
                        </Forms.FormText>
                    </div>,
                    confirmText: "Send Anyway",
                    cancelText: "Cancel",
                    secondaryConfirmText: "Do not show again",
                    onConfirm: () => resolve(true),
                    onCloseCallback: () => setImmediate(() => resolve(false)),
                    onConfirmSecondary() {
                        settings.store.disableEmbedPermissionCheck = true;
                        resolve(true);
                    }
                });
            });
        }

        this.preSend = addPreSendListener(async (channelId, messageObj, extra) => {
            const { guildId } = this;

            let hasBypass = false;

            stickerBypass: {
                if (!s.enableStickerBypass)
                    break stickerBypass;

                const sticker = StickerStore.getStickerById(extra.stickers?.[0]!);
                if (!sticker)
                    break stickerBypass;

                // Discord Stickers are now free yayyy!! :D
                if ("pack_id" in sticker)
                    break stickerBypass;

                const canUseStickers = this.canUseStickers && hasExternalStickerPerms(channelId);
                if (sticker.available !== false && (canUseStickers || sticker.guild_id === guildId))
                    break stickerBypass;

                // [12/12/2023]
                // Work around an annoying bug where getStickerLink will return StickerType.GIF,
                // but will give us a normal non animated png for no reason
                // TODO: Remove this workaround when it's not needed anymore
                let link = this.getStickerLink(sticker.id);
                if (sticker.format_type === StickerType.GIF && link.includes(".png")) {
                    link = link.replace(".png", ".gif");
                }

                if (sticker.format_type === StickerType.APNG) {
                    if (!hasAttachmentPerms(channelId)) {
                        Alerts.show({
                            title: "Hold on!",
                            body: <div>
                                <Forms.FormText>
                                    You cannot send this message because it contains an animated FakeNitro sticker,
                                    and you do not have permissions to attach files in the current channel. Please remove the sticker to proceed.
                                </Forms.FormText>
                            </div>
                        });
                    } else {
                        this.sendAnimatedSticker(link, sticker.id, channelId);
                    }

                    return { cancel: true };
                } else {
                    hasBypass = true;

                    const url = new URL(link);
                    url.searchParams.set("name", sticker.name);

                    const linkText = s.hyperLinkText.replaceAll("{{NAME}}", sticker.name);

                    messageObj.content += `${getWordBoundary(messageObj.content, messageObj.content.length - 1)}${s.useHyperLinks ? `[${linkText}](${url})` : url}`;
                    extra.stickers!.length = 0;
                }
            }

            if (s.enableEmojiBypass) {
                for (const emoji of messageObj.validNonShortcutEmojis) {
                    if (this.canUseEmote(emoji, channelId)) continue;

                    hasBypass = true;

                    const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;

                    const url = new URL(getEmojiURL(emoji.id, emoji.animated, s.emojiSize));
                    url.searchParams.set("size", s.emojiSize.toString());
                    url.searchParams.set("name", emoji.name);

                    const linkText = s.hyperLinkText.replaceAll("{{NAME}}", emoji.name);

                    messageObj.content = messageObj.content.replace(emojiString, (match, offset, origStr) => {
                        return `${getWordBoundary(origStr, offset - 1)}${s.useHyperLinks ? `[${linkText}](${url})` : url}${getWordBoundary(origStr, offset + match.length)}`;
                    });
                }
            }

            if (hasBypass && !s.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
                if (!await cannotEmbedNotice()) {
                    return { cancel: true };
                }
            }

            return { cancel: false };
        });

        this.preEdit = addPreEditListener(async (channelId, __, messageObj) => {
            if (!s.enableEmojiBypass) return;

            let hasBypass = false;

            messageObj.content = messageObj.content.replace(/(?<!\\)<a?:(?:\w+):(\d+)>/ig, (emojiStr, emojiId, offset, origStr) => {
                const emoji = EmojiStore.getCustomEmojiById(emojiId);
                if (emoji == null) return emojiStr;
                if (this.canUseEmote(emoji, channelId)) return emojiStr;

                hasBypass = true;

                const url = new URL(getEmojiURL(emoji.id, emoji.animated, s.emojiSize));
                url.searchParams.set("size", s.emojiSize.toString());
                url.searchParams.set("name", emoji.name);

                const linkText = s.hyperLinkText.replaceAll("{{NAME}}", emoji.name);

                return `${getWordBoundary(origStr, offset - 1)}${s.useHyperLinks ? `[${linkText}](${url})` : url}${getWordBoundary(origStr, offset + emojiStr.length)}`;
            });

            if (hasBypass && !s.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
                if (!await cannotEmbedNotice()) {
                    return { cancel: true };
                }
            }

            return { cancel: false };
        });
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
});
