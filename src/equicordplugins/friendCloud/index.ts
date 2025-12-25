/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { findStore } from "@webpack";
import { DraftType, UploadHandler, UserStore } from "@webpack/common";

const logger = new Logger("FriendCloud");

interface AffinitiesV2 {
    otherUserId: User["id"];
    userSegment: "NON_MAU" | "NON_HFU_MAU" | "HFU_MAU";
    otherUserSegment: "NON_MAU" | "NON_HFU_MAU" | "HFU_MAU";
    isFriend: boolean;
    dmProbability: number;
    dmRank: number;
    vcProbability: number;
    vcRank: number;
    serverMessageProbability: number;
    serverMessageRank: number;
    communicationProbability: number;
    communicationRank: number;
}

interface UserPosition {
    member: User;
    affinity: number;
    x: number;
    y: number;
    size: number;
}

export default definePlugin({
    name: "FriendCloud",
    description: "Adds a /friendcloud command to visualize the users you most interact with",
    authors: [EquicordDevs.Fafa],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "friendcloud",
            description: "Display user you most interact with in a cloud",
            options: [
                {
                    name: "count",
                    description: "Number of users to display",
                    type: ApplicationCommandOptionType.NUMBER,
                    required: false
                }
            ],
            execute: async (opts, cmdCtx) => {
                const count = findOption(opts, "count", 25);

                if (!count) return sendBotMessage(cmdCtx.channel.id, { content: "The count must be 1 or higher!" });

                try {
                    const affinities: AffinitiesV2[] = findStore("UserAffinitiesV2Store").getUserAffinities();

                    if (!affinities?.length) {
                        return sendBotMessage(cmdCtx.channel.id, {
                            content: "No affinities found. Check your [privacy settings](<https://support.discord.com/hc/en-us/articles/21864805694999-Data-Used-to-Improve-Discord>)."
                        });
                    }

                    const users = affinities
                        .map(e => ({
                            member: UserStore.getUser(e.otherUserId),
                            affinity: calculateAffinityScore(e as AffinitiesV2)
                        }))
                        .filter(x => x.member?.id)
                        .sort((a, b) => b.affinity - a.affinity)
                        .slice(0, count);

                    if (!users.length) {
                        return sendBotMessage(cmdCtx.channel.id, {
                            content: "No valid users found in affinities. Check your [privacy settings](<https://support.discord.com/hc/en-us/articles/21864805694999-Data-Used-to-Improve-Discord>)."
                        });
                    }

                    const minAffinity = Math.min(...users.map(u => u.affinity));
                    const maxAffinity = Math.max(...users.map(u => u.affinity));
                    const minSize = 120;
                    const maxSize = 240;

                    const getSize = (affinity: number): number => {
                        if (maxAffinity === minAffinity) return (minSize + maxSize) / 2;
                        return minSize + ((affinity - minAffinity) / (maxAffinity - minAffinity)) * (maxSize - minSize);
                    };

                    const avgSize = (minSize + maxSize) / 2;
                    const { width: canvasWidth, height: canvasHeight } = calculateCanvasSize(users.length, avgSize);

                    const canvas = document.createElement("canvas");
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    const ctx = canvas.getContext("2d")!;

                    const positions: Array<{ x: number, y: number, size: number; }> = [];
                    const userPositions = users.map(user => {
                        const size = getSize(user.affinity);
                        const pos = generatePoissonDiskPosition(positions, canvasWidth, canvasHeight, size);
                        positions.push({ x: pos.x, y: pos.y, size });
                        return { ...user, x: pos.x, y: pos.y, size };
                    });

                    let loadedImages = 0;
                    const totalImages = userPositions.length;

                    const drawImage = async (user: UserPosition) => {
                        try {
                            const avatarUrl = user.member?.avatar
                                ? `https://cdn.discordapp.com/avatars/${user.member.id}/${user.member?.avatar}.webp?size=256`
                                : `https://cdn.discordapp.com/embed/avatars/${user.member.id as any as number % 5}.png`;

                            const img = await loadImage(avatarUrl);
                            const centerX = user.x + user.size / 2;
                            const centerY = user.y + user.size / 2;

                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, user.size / 2, 0, Math.PI * 2);
                            ctx.clip();
                            ctx.drawImage(img, user.x, user.y, user.size, user.size);
                            ctx.restore();

                            ctx.strokeStyle = "#808080";
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, user.size / 2 + 1, 0, Math.PI * 2);
                            ctx.stroke();
                        } catch {
                            // we ignore
                        } finally {
                            loadedImages++;
                            if (loadedImages === totalImages) {
                                canvas.toBlob(blob => {
                                    if (!blob) {
                                        sendBotMessage(cmdCtx.channel.id, { content: "Couldn't generate the image :c" });
                                        return;
                                    }
                                    const file = new File([blob], "affinities-cloud.png", { type: "image/png" });
                                    UploadHandler.promptToUpload([file], cmdCtx.channel, DraftType.ChannelMessage);
                                }, "image/png");
                            }
                        }
                    };

                    userPositions.forEach(drawImage);
                } catch (e: unknown) {
                    if (e instanceof Error)
                        sendBotMessage(cmdCtx.channel.id, { content: e.message });
                    else logger.error(e);
                }
            },
        },
    ]
});

function calculateAffinityScore(affinity: AffinitiesV2): number {
    const weights = {
        friend: 0.15,
        dm: 0.30,
        vc: 0.25,
        serverMsg: 0.20,
        communication: 0.10
    };

    let score = 0;
    if (affinity.isFriend) score += weights.friend * 100;
    score += affinity.dmProbability * weights.dm * 100;
    score += affinity.vcProbability * weights.vc * 100;
    score += affinity.serverMessageProbability * weights.serverMsg * 100;
    score += affinity.communicationProbability * weights.communication * 100;

    return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
}

// stolen from petpet thanks vee
function loadImage(source: File | string): Promise<HTMLImageElement> {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (isFile) URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (event, _source, _lineno, _colno, err) => reject(err || event);
        img.crossOrigin = "anonymous";
        img.src = url;
    });
}

function generatePoissonDiskPosition(
    existingPositions: Array<{ x: number, y: number, size: number; }>,
    canvasWidth: number,
    canvasHeight: number,
    size: number
): { x: number, y: number; } {
    const edgePadding = 10;
    const minDist = size * 1.5;
    const textSpace = 60;
    const k = 30;

    function isValid(x: number, y: number) {
        if (
            x < edgePadding ||
            x + size > canvasWidth - edgePadding ||
            y < edgePadding ||
            y + size > canvasHeight - textSpace - edgePadding
        ) return false;

        return !existingPositions.some(pos => {
            const dx = pos.x - x;
            const dy = pos.y - y;
            const dist = Math.hypot(dx, dy);
            const minAllowed = (pos.size + size) / 2 + (minDist - size);
            return dist < minAllowed;
        });
    }

    if (existingPositions.length === 0) {
        return {
            x: canvasWidth / 2 - size / 2,
            y: canvasHeight / 2 - size / 2
        };
    }

    for (let tries = 0; tries < 100; tries++) {
        const base = existingPositions[Math.floor(Math.random() * existingPositions.length)];
        for (let i = 0; i < k; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = minDist + Math.random() * minDist;
            const x = base.x + Math.cos(angle) * radius;
            const y = base.y + Math.sin(angle) * radius;
            if (isValid(x, y)) {
                return {
                    x: Math.max(edgePadding, Math.min(x, canvasWidth - size - edgePadding)),
                    y: Math.max(edgePadding, Math.min(y, canvasHeight - size - textSpace - edgePadding))
                };
            }
        }
    }

    for (let tries = 0; tries < 100; tries++) {
        const x = Math.random() * (canvasWidth - size - edgePadding * 2) + edgePadding;
        const y = Math.random() * (canvasHeight - size - textSpace - edgePadding * 2) + edgePadding;
        if (isValid(x, y)) {
            return {
                x: Math.max(edgePadding, Math.min(x, canvasWidth - size - edgePadding)),
                y: Math.max(edgePadding, Math.min(y, canvasHeight - size - textSpace - edgePadding))
            };
        }
    }

    return {
        x: edgePadding,
        y: edgePadding
    };
}

function calculateCanvasSize(userCount: number, avatarSize: number): { width: number, height: number; } {
    const padding = 50;
    const textSpace = 60;
    const itemWidth = avatarSize + padding;
    const itemHeight = avatarSize + textSpace + padding;
    const aspectRatio = 16 / 9;
    const cols = Math.ceil(Math.sqrt(userCount * aspectRatio));
    const rows = Math.ceil(userCount / cols);

    return {
        width: Math.max(1000, cols * itemWidth + padding),
        height: Math.max(700, rows * itemHeight + padding)
    };
}
