/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { CustomStreamPreviewState } from "./state";
import { StreamKey } from "./types";


const ChannelTypesMap = {
    1: "call",
    2: "guild",
    3: "call",
};

export const localConsole = {
    ...console,
    log: (...args: any[]): void => console.log("[ScreenSharePreviewManipulate]:", ...args),
    warn: (...args: any[]): void => console.warn("[ScreenSharePreviewManipulate]:", ...args),
    error: (...args: any[]): void => console.error("[ScreenSharePreviewManipulate]:", ...args),
    debug: (...args: any[]): void => console.debug("[ScreenSharePreviewManipulate]:", ...args),
};

export const parseStreamKey = (streamKey: string): StreamKey => {
    const [voiceChannelType, ...rest] = streamKey.split(":");

    if (voiceChannelType === "call") {
        const [channelId, userId] = rest;

        return {
            voiceChannelType: "call",
            channelId: channelId,
            userId: userId,
        };
    }

    if (voiceChannelType === "guild") {
        const [guildId, channelId, userId] = rest;

        return {
            voiceChannelType: "guild",
            guildId: guildId,
            channelId: channelId,
            userId: userId,
        };
    }

    localConsole.error("Failed to parse stream key:", streamKey);

    throw new Error("Failed to parse streamKey.");
};

const uploadStreamPreview = async (image: string): Promise<void> => {
    const uploadPreview = async (interval?: NodeJS.Timeout): Promise<void> => {
        const channelId = SelectedChannelStore.getVoiceChannelId();
        if (!channelId) {
            if (interval) {
                localConsole.log("Failed to retrieve current user channel id.");
                clearInterval(interval);
            }
            return;
        }

        const channel = ChannelStore.getChannel(channelId);

        const channelType = ChannelTypesMap[channel.type];
        if (!channelType) {
            localConsole.error("Failed to retrieve channel type.");
            if (interval) {
                stopSendingScreenSharePreview();
            }
            return;
        }

        const userId = UserStore.getCurrentUser().id;
        const guildId = channel.getGuildId();

        const token = Vencord.Webpack.findByProps("getToken").getToken();
        const superProps = Vencord.Webpack.findByProps("getSuperProperties").getSuperPropertiesBase64();
        const locale = Vencord.Webpack.findByProps("getLocale")?.getLocale?.();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (!token || !superProps || !locale || !timezone) {
            localConsole.error("Failed to retrieve required data for the request.");

            if (interval) {
                stopSendingScreenSharePreview();
            }
            return;
        }

        localConsole.log("Sending stream preview...");

        const streamKey = `${channelType}%3A${guildId}%3A${channelId}%3A${userId}`;

        try {
            await fetch(`https://discord.com/api/v9/streams/${streamKey}/preview`, {
                method: "POST",
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json",
                    "X-Debug-Options": "bugReporterEnabled,isStreamInfoOverlayEnabled",
                    "X-Discord-Locale": locale,
                    "X-Discord-Timezone": timezone,
                    "X-Super-Properties": superProps,
                },
                body: JSON.stringify({
                    thumbnail: image,
                }),
            });

            CustomStreamPreviewState.setState({
                lastStreamPreviewSend: Date.now(),
            });

            localConsole.log("Successfully send stream preview.");
        } catch (error) {
            localConsole.error("Failed to upload stream preview.", error);
        }
    };

    await uploadPreview();
    const uploadPreviewInterval = setInterval(
        () => uploadPreview(uploadPreviewInterval),
        300_000
    );

    CustomStreamPreviewState.setState({
        isSendingCustomStreamPreview: true,
        resendStreamPreviewIntervalId: uploadPreviewInterval as unknown as number,
    });
};

export const sendCustomPreview = async (image: string): Promise<void> => {
    stopSendingScreenSharePreview();

    const { lastStreamPreviewSend } = CustomStreamPreviewState.getState();

    // If a preview was manually uploaded within the last 70 seconds,
    // delay the next upload to avoid sending too frequently.
    const waitUntilSending = Math.max(lastStreamPreviewSend + 70_000 - Date.now(), 0);
    setTimeout(
        () => uploadStreamPreview(image),
        waitUntilSending
    );
};

export const stopSendingScreenSharePreview = (): void => {
    const { resendStreamPreviewIntervalId } = CustomStreamPreviewState.getState();

    CustomStreamPreviewState.setState({
        isSendingCustomStreamPreview: false,
    });

    if (resendStreamPreviewIntervalId) {
        clearInterval(resendStreamPreviewIntervalId);
        CustomStreamPreviewState.setState({
            resendStreamPreviewIntervalId: null,
        });

        localConsole.log("Cleared stream preview upload interval.");
    }
};

/**
 * Converts an image file to a base64-encoded JPEG string.
 *
 * Follows Discord's screen share preview image format:
 *   - Image resized to 454x256 with a 16:9 aspect ratio.
 *   - JPEG quality reduced to 10%.
 *   - Encoded as base64 image/jpeg.
 *
 * @param file
 *   The image file to convert.
 *
 * @return string
 *   base64-encoded JPEG string.
 */
export const imageFileToStreamPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = e => {
            if (e.target !== null) {
                img.src = e.target.result as string;
            } else {
                reject("FileReader failed to load file.");
            }
        };

        img.onload = () => {
            const targetWidth = 454;
            const targetHeight = Math.round((9 / 16) * targetWidth);

            const originalAspect = img.width / img.height;
            const targetAspect = 16 / 9;

            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

            if (originalAspect > targetAspect) {
                sWidth = img.height * targetAspect;
                sx = (img.width - sWidth) / 2;
            } else {
                sHeight = img.width / targetAspect;
                sy = (img.height - sHeight) / 2;
            }

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                reject("Failed to get canvas context.");
                return;
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            const base64 = canvas.toDataURL("image/jpeg", 0.1);
            resolve(base64);
        };

        img.onerror = () => {
            reject("Image failed to load.");
        };

        reader.onerror = () => {
            reject("FileReader failed.");
        };

        reader.readAsDataURL(file);
    });
};

