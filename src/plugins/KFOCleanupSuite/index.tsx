// src/userplugins/KFOCleanupSuite/index.tsx
import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    sendBotMessage,
} from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RestAPI, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    // إعدادات البحث والحذف العامة
    searchDelay: {
        type: OptionType.NUMBER,
        default: 800,
        description: "تأخير بين عمليات البحث (ms)",
    },
    deleteDelay: {
        type: OptionType.NUMBER,
        default: 800,
        description: "تأخير بين حذف كل رسالة (ms)",
    },
    maxBatch: {
        type: OptionType.NUMBER,
        default: 25,
        description: "أقصى عدد رسائل في الدفعة الواحدة",
    },
    progressStep: {
        type: OptionType.NUMBER,
        default: 50,
        description: "كل كم رسالة يرسل رسالة تقدم (0 = بدون تقدم)",
    },
    maxSearchRounds: {
        type: OptionType.NUMBER,
        default: 5,
        description: "أقصى عدد مرات متتالية ما يلقى فيها رسائل قبل ما يوقف (البحث والحذف)",
    },
    maxTotalDeletes: {
        type: OptionType.NUMBER,
        default: 2000,
        description: "أقصى عدد رسائل يحاول حذفها في جلسة واحدة (0 = غير محدود)",
    },

    // إعدادات Smart Cleanup
    spamMaxLength: {
        type: OptionType.NUMBER,
        default: 3,
        description: "أقصى طول لاعتبار الرسالة سبام (g, ok, .)",
    },
    trackedDays: {
        type: OptionType.NUMBER,
        default: 7,
        description: "أقصى عمر للرسائل (بالأيام) يتم لمسها",
    },
    protectedUsers: {
        type: OptionType.STRING,
        default: "",
        description: "User IDs لا تُحذف رسائلهم إطلاقاً (مفصولة بفاصلة)",
        placeholder: "123,456,789",
    },
    ignoredBots: {
        type: OptionType.STRING,
        default: "",
        description: "Bot IDs لا تُحذف رسائلهم",
        placeholder: "botId1,botId2",
    },
});

type DeleteMode = "mine" | "all";
type CleanMode = "spam" | "media" | "between";

interface ChannelState {
    running: boolean;
    count: number;
    start: number;
}

const deleteStates: Record<string, ChannelState> = {};

function getDeleteState(channelId: string): ChannelState {
    if (!deleteStates[channelId]) {
        deleteStates[channelId] = {
            running: false,
            count: 0,
            start: 0,
        };
    }
    return deleteStates[channelId];
}

// -------- Helpers مشتركة --------

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

function getGuildId(ctx: any): string | null {
    return ctx.guild?.id ?? ctx.guildId ?? null;
}

async function searchMessages(
    channelId: string,
    authorId?: string,
    guildId?: string,
    offset = 0
) {
    const params: any = {
        include_nsfw: true,
        offset,
        channel_id: channelId,
    };
    if (authorId) params.author_id = authorId;

    const qs = new URLSearchParams(params).toString();
    const url = guildId
        ? `/guilds/${guildId}/messages/search?${qs}`
        : `/channels/${channelId}/messages/search?${qs}`;

    const res = await RestAPI.get({ url });
    return (res.body?.messages?.flat() ?? []) as any[];
}

async function deleteOne(channelId: string, msgId: string) {
    await RestAPI.del({ url: `/channels/${channelId}/messages/${msgId}` });
}

function parseIds(str: string): string[] {
    return str
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
}

// -------- منطق Smart Cleanup --------

function isOld(msg: any): boolean {
    const days = settings.store.trackedDays;
    if (!msg.timestamp) return false;
    const ts = new Date(msg.timestamp).getTime();
    const diffDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return diffDays > days;
}

function isFromProtected(msg: any): boolean {
    const protectedIds = parseIds(settings.store.protectedUsers);
    if (!msg.author?.id) return false;
    return protectedIds.includes(msg.author.id);
}

function isFromIgnoredBot(msg: any): boolean {
    if (!msg.author?.bot) return false;
    const ids = parseIds(settings.store.ignoredBots);
    return ids.includes(msg.author.id);
}

function isShortSpam(msg: any): boolean {
    if (!msg.content) return false;
    const c = msg.content.trim();
    return c.length > 0 && c.length <= settings.store.spamMaxLength;
}

function isMedia(msg: any): boolean {
    return (msg.attachments?.length ?? 0) > 0 || (msg.embeds?.length ?? 0) > 0;
}

async function runCleanup(ctx: any, mode: CleanMode, extra?: { fromId?: string; toId?: string }) {
    const channelId = ctx.channel.id;
    const state = { running: true, count: 0, start: Date.now() };

    sendBotMessage(channelId, {
        content:
            mode === "spam"
                ? "🧹 بدء تنظيف الرسائل القصيرة/السبام..."
                : mode === "media"
                ? "🧹 حذف رسائل الميديا (صور/فيديو/ملفات)..."
                : "🧹 حذف الرسائل بين رسالتين...",
    });

    try {
        let offset = 0;
        let empty = 0;
        const maxRounds = settings.store.maxSearchRounds || 3;
        const maxTotal = settings.store.maxTotalDeletes || 0;

        while (state.running && empty < maxRounds) {
            if (maxTotal > 0 && state.count >= maxTotal) break;

            await sleep(settings.store.searchDelay);

            let msgs: any[];
            try {
                msgs = await searchMessages(channelId, undefined, undefined, offset);
            } catch (e: any) {
                console.error("[Cleanup] SEARCH ERROR", e);
                sendBotMessage(channelId, {
                    content: `❌ خطأ في البحث عن الرسائل: ${e?.status ?? ""} ${e?.body?.message ?? ""}`,
                });
                break;
            }

            if (!msgs.length) {
                empty++;
                offset = 0;
                continue;
            }

            empty = 0;

            for (const msg of msgs.slice(0, settings.store.maxBatch)) {
                if (!state.running) break;
                if (maxTotal > 0 && state.count >= maxTotal) break;

                if (isOld(msg)) continue;
                if (isFromProtected(msg)) continue;
                if (isFromIgnoredBot(msg)) continue;

                let shouldDelete = false;

                if (mode === "spam") {
                    shouldDelete = isShortSpam(msg);
                } else if (mode === "media") {
                    shouldDelete = isMedia(msg);
                } else if (mode === "between") {
                    const fromId = extra?.fromId;
                    const toId = extra?.toId;
                    if (!fromId || !toId) continue;

                    if (msg.id === fromId || msg.id === toId) {
                        shouldDelete = true;
                    } else {
                        const idNum = BigInt(msg.id);
                        const a = BigInt(fromId);
                        const b = BigInt(toId);
                        const min = a < b ? a : b;
                        const max = a > b ? a : b;
                        shouldDelete = idNum > min && idNum < max;
                    }
                }

                if (!shouldDelete) continue;

                await sleep(settings.store.deleteDelay);
                try {
                    await deleteOne(channelId, msg.id);
                    state.count++;
                } catch (e: any) {
                    console.error("[Cleanup] DELETE ERROR", e);
                    if (e?.status === 429) {
                        const retry = e?.body?.retry_after
                            ? Math.ceil(e.body.retry_after * 1000)
                            : 5000;
                        await sleep(retry);
                    }
                }
            }

            offset += 25;
        }

        const elapsed = Math.round((Date.now() - state.start) / 1000);
        sendBotMessage(channelId, {
            content: `✅ انتهى التنظيف (${mode}) | عدد الرسائل: ${state.count} | الوقت: ${elapsed}ث`,
        });
    } catch (e: any) {
        console.error("[Cleanup] RUN ERROR", e);
        sendBotMessage(channelId, { content: `❌ صار خطأ أثناء التنظيف: ${e?.message ?? e}` });
    }
}

// -------- منطق الحذف العادي --------

async function runDelete(ctx: any, mode: DeleteMode) {
    const channelId = ctx.channel.id;
    const guildId = getGuildId(ctx);
    const state = getDeleteState(channelId);

    if (state.running) {
        sendBotMessage(channelId, {
            content: `⏳ فيه عملية حذف شغّالة، محذوف حتى الآن: ${state.count} رسالة.`,
        });
        return;
    }

    state.running = true;
    state.count = 0;
    state.start = Date.now();

    sendBotMessage(channelId, {
        content:
            mode === "mine"
                ? "🧹 جاري حذف رسائلك في هذه المحادثة..."
                : "🔥 جاري حذف كل الرسائل في هذه المحادثة...",
    });

    try {
        let offset = 0;
        let emptyCount = 0;
        const step = settings.store.progressStep;
        const maxRounds = settings.store.maxSearchRounds || 3;
        const maxTotal = settings.store.maxTotalDeletes || 0;

        while (state.running && emptyCount < maxRounds) {
            if (maxTotal > 0 && state.count >= maxTotal) break;

            await sleep(settings.store.searchDelay);

            let msgs: any[];
            try {
                msgs = await searchMessages(
                    channelId,
                    mode === "mine" ? UserStore.getCurrentUser().id : undefined,
                    guildId,
                    offset
                );
            } catch (e: any) {
                console.error("[Delete] SEARCH ERROR", e);
                sendBotMessage(channelId, {
                    content: `❌ خطأ في البحث عن الرسائل: ${e?.status ?? ""} ${e?.body?.message ?? ""}`,
                });
                break;
            }

            if (!msgs.length) {
                emptyCount++;
                offset = 0;
                continue;
            }

            emptyCount = 0;

            for (const msg of msgs.slice(0, settings.store.maxBatch)) {
                if (!state.running) break;
                if (maxTotal > 0 && state.count >= maxTotal) break;

                if (msg.channel_id !== channelId) continue;
                if (mode === "mine" && msg.author?.id !== UserStore.getCurrentUser().id) continue;

                await sleep(settings.store.deleteDelay);

                try {
                    await deleteOne(channelId, msg.id);
                    state.count++;

                    if (step > 0 && state.count % step === 0) {
                        const elapsed = Math.round((Date.now() - state.start) / 1000);
                        sendBotMessage(channelId, {
                            content: `⚡ تم حذف ${state.count} رسالة حتى الآن | الوقت: ${elapsed}ث`,
                        });
                    }
                } catch (e: any) {
                    console.error("[Delete] DELETE ERROR", e);
                    const status = e?.status;
                    const msgErr = e?.body?.message;

                    if (status === 429) {
                        const retry = e?.body?.retry_after
                            ? Math.ceil(e.body.retry_after * 1000)
                            : 5000;
                        await sleep(retry);
                        continue;
                    }

                    sendBotMessage(channelId, {
                        content: `❌ خطأ في الحذف: ${status ?? "unknown"} ${msgErr ?? ""}`,
                    });
                }
            }

            offset += 25;
        }

        const elapsed = Math.round((Date.now() - state.start) / 1000);
        sendBotMessage(channelId, {
            content: `✅ انتهى الحذف | عدد الرسائل: ${state.count} | الوقت: ${elapsed}ث ✅`,
        });
    } catch (e: any) {
        console.error("[Delete] RUN ERROR", e);
        sendBotMessage(channelId, {
            content: `❌ خطأ غير متوقع أثناء الحذف: ${e?.message ?? e}`,
        });
    } finally {
        state.running = false;
    }
}

async function stopDelete(ctx: any) {
    const channelId = ctx.channel.id;
    const state = deleteStates[channelId];

    if (state?.running) {
        state.running = false;
        const elapsed = Math.round((Date.now() - state.start) / 1000);
        sendBotMessage(channelId, {
            content: `⏹️ تم إيقاف الحذف | محذوف: ${state.count} رسالة | الوقت: ${elapsed}ث`,
        });
    } else {
        sendBotMessage(channelId, {
            content: "🚫 ما فيه عملية حذف شغّالة حالياً.",
        });
    }
}

// -------- تعريف البلجن --------

export default definePlugin({
    name: "سمارت ارت",
    description: "حذف رسائلك أو كل الرسائل + تنظيف سبام وميديا وبين رسالتين",
    authors:  [Devs.rz30,],
    settings,
    commands: [
        // أوامر الحذف العادي
        {
            name: "delete",
            description: "🧹 احذف رسائلك فقط في هذه المحادثة",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => runDelete(ctx, "mine"),
        },
        {
            name: "delete-all",
            description: "🔥 احذف كل الرسائل (يتطلب صلاحيات في السيرفر)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => runDelete(ctx, "all"),
        },
        {
            name: "stop-delete",
            description: "⏹️ أوقف عملية الحذف الحالية",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => stopDelete(ctx),
        },

        // أوامر Smart Cleanup
        {
            name: "clean-spam",
            description: "🧹 حذف الرسائل القصيرة/السبام في هذه القناة",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => runCleanup(ctx, "spam"),
        },
        {
            name: "clean-media",
            description: "🧹 حذف الرسائل التي تحتوي ميديا (صور/فيديو/ملفات)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => runCleanup(ctx, "media"),
        },
        {
            name: "clean-between",
            description: "🧹 حذف الرسائل بين رسالتين (تعطيه ID من–إلى)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "from",
                    description: "Message ID البداية",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                },
                {
                    name: "to",
                    description: "Message ID النهاية",
                    type: ApplicationCommandOptionType.STRING,
                    required: true,
                },
            ],
            execute: (opts, ctx) => {
                const fromId = String(opts[0].value);
                const toId = String(opts[1].value);
                return runCleanup(ctx, "between", { fromId, toId });
            },
        },
    ],
});
