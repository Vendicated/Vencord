/*
 * UltimateVoiceControl - by KFO
 * أوضاع: تجميد + جب نعولك + رح من دون نعول + Tabarbar
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { GuildChannelStore, Menu, RestAPI, Toasts, UserStore } from "@webpack/common";

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
}

interface VoiceStateStore {
    getAllVoiceStates(): { [guildId: string]: { [userId: string]: VoiceState } };
    getVoiceStatesForChannel(channelId: string): { [userId: string]: VoiceState };
}

const VoiceStateStore: VoiceStateStore = findStoreLazy("VoiceStateStore");

// روم اللوق
const LOG_CHANNEL_ID = "1483548583629291530";

// رسائل اللوق + التوست
function sendLogMessage(content: string) {
    if (!LOG_CHANNEL_ID) return;
    RestAPI.post({
        url: `/channels/${LOG_CHANNEL_ID}/messages`,
        body: { content }
    }).catch(err => console.error("[UVC] sendLogMessage error", err));
}

function showToast(message: string, type: typeof Toasts.Type[keyof typeof Toasts.Type] = Toasts.Type.SUCCESS) {
    Toasts.show({
        message,
        id: Toasts.genId(),
        type
    });
}

// ========== Settings ==========

const settings = definePluginSettings({
    // عناوين المنيو
    menuTitleUser: {
        type: OptionType.STRING,
        default: "Ultimate VC",
        description: "عنوان قائمة البلوقن في منيو العضو"
    },
    menuTitleChannel: {
        type: OptionType.STRING,
        default: "Ultimate VC",
        description: "عنوان قائمة البلوقن في منيو الروم"
    },

    // أزرار العضو / الروم
    labelInstantFreeze: {
        type: OptionType.STRING,
        default: "🔒 تجميد فوري (القديم)",
        description: "زر التجميد الفوري"
    },
    labelTour: {
        type: OptionType.STRING,
        default: "🎠 جب نعولك (يتحرك بكل الرومات → يرجع)",
        description: "زر جب نعولك"
    },
    labelFullTour: {
        type: OptionType.STRING,
        default: "🚀 رح من دون نعول (يروح كل الفويس → روم ثاني)",
        description: "زر رح من دون نعول"
    },

    // Tabarbar movement
    stepCount: {
        type: OptionType.SLIDER,
        default: 3,
        markers: [1, 2, 3, 4, 5, 6, 8, 10],
        stickToMarkers: false,
        description: "عدد الرومات اللي يتحركها Tabarbar فوق/تحت"
    }
});

// ========== Types / State ==========

type Mode = "frozen" | "tour" | "fullTour" | "tabarbar";

interface ControlledUser {
    userId: string;
    guildId: string;
    mode: Mode;
    originChannelId?: string;
    channels: string[];
    index: number;
}

let controlled: ControlledUser[] = [];

// ========== Helpers عامة ==========

function safeGetAllVoiceStates():
    { [guildId: string]: { [userId: string]: VoiceState } } | null {
    try {
        const s = VoiceStateStore.getAllVoiceStates();
        if (!s || typeof s !== "object") return null;
        return s;
    } catch {
        return null;
    }
}

function getUserChannelId(userId: string): { channelId: string; guildId: string } | null {
    const states = safeGetAllVoiceStates();
    if (!states) return null;

    for (const [guildId, users] of Object.entries(states)) {
        const vs = users[userId];
        if (vs && vs.channelId) {
            return { channelId: vs.channelId, guildId };
        }
    }
    return null;
}

// يرجّع كل الرومات الصوتية في السيرفر + يتأكد يضيف الروم الحالي لو ناقص
function getVoiceChannelsIncludingCurrent(guildId: string, currentChannelId: string | null): string[] {
    const guildChannels: { VOCAL: { channel: Channel; comparator: number }[] } =
        GuildChannelStore.getChannels(guildId);
    if (!guildChannels || !guildChannels.VOCAL) {
        console.log("[UVC] getVoiceChannels: no VOCAL channels for guild", guildId);
        return currentChannelId ? [currentChannelId] : [];
    }

    const allVoice = guildChannels.VOCAL
        .map(v => v.channel)
        .filter(ch => [2, 13].includes(ch.type) && ch.guild_id === guildId);

    let ids = allVoice.map(ch => ch.id);

    if (currentChannelId && !ids.includes(currentChannelId)) {
        ids.unshift(currentChannelId);
    }

    if (!ids.length && currentChannelId) {
        ids = [currentChannelId];
    }

    console.log("[UVC] getVoiceChannelsIncludingCurrent:", guildId, ids);
    return ids;
}

async function moveUserToChannel(guildId: string, userId: string, channelId: string | null) {
    try {
        await RestAPI.patch({
            url: `/guilds/${guildId}/members/${userId}`,
            body: { channel_id: channelId }
        });
        console.log("[UVC] moveUserToChannel", userId, "->", channelId);
    } catch (e) {
        console.error("[UVC] moveUserToChannel error", e);
    }
}

function ensureControlled(userId: string, guildId: string, mode: Mode): ControlledUser {
    let cu = controlled.find(c => c.userId === userId && c.guildId === guildId && c.mode === mode);
    if (!cu) {
        cu = { userId, guildId, mode, originChannelId: undefined, channels: [], index: 0 };
        controlled.push(cu);
    }
    return cu;
}

function clearUser(userId: string) {
    controlled = controlled.filter(c => c.userId !== userId);
}

function clearGuild(guildId: string) {
    controlled = controlled.filter(c => c.guildId !== guildId);
}

// ========== Modes ==========

// Freeze (مع لوق + توست)
function setFrozen(userId: string, guildId: string, enable: boolean) {
    if (!enable) {
        controlled = controlled.filter(c => !(c.userId === userId && c.guildId === guildId && c.mode === "frozen"));
        console.log("[UVC] Unfrozen:", userId);
        sendLogMessage(`✅ تم فك التجميد عن <@${userId}>`);
        showToast("تم فك التجميد عن المستخدم", Toasts.Type.SUCCESS);
        return;
    }
    const info = getUserChannelId(userId);
    if (!info) {
        console.log("[UVC] setFrozen: user not in voice");
        showToast("المستخدم مو في روم صوتي", Toasts.Type.FAILURE);
        return;
    }
    const cu = ensureControlled(userId, guildId, "frozen");
    cu.originChannelId = info.channelId;
    console.log("[UVC] Frozen:", userId, "origin:", info.channelId);
    sendLogMessage(`🔒 تم **تجميد** <@${userId}> في الفويس (الروم: <#${info.channelId}>)`);
    showToast("تم تفعيل التجميد على المستخدم", Toasts.Type.SUCCESS);
}

// جب نعولك – يمشي على كل الرومات ويرجع للأصل
function setTour(userId: string, guildId: string) {
    const info = getUserChannelId(userId);
    if (!info) {
        console.log("[UVC] setTour: user not in voice");
        showToast("المستخدم مو في روم صوتي", Toasts.Type.FAILURE);
        return;
    }
    const channels = getVoiceChannelsIncludingCurrent(guildId, info.channelId);
    if (!channels.length) {
        console.log("[UVC] setTour: no channels at all");
        showToast("ما لقيت رومات صوتية في السيرفر", Toasts.Type.FAILURE);
        return;
    }

    const path = channels; // يمشي كل الرومات
    const cu = ensureControlled(userId, guildId, "tour");
    cu.channels = path;
    cu.index = 0;
    cu.originChannelId = info.channelId;

    console.log("[UVC] Tour armed for", userId, "path:", path);
    sendLogMessage(`🎠 تم تشغيل **جب نعولك** لـ <@${userId}> (المسار: ${path.map(id => `<#${id}>`).join(" → ")})`);
    showToast("🎠 جب نعولك شغّال للمستخدم", Toasts.Type.SUCCESS);

    moveUserToChannel(guildId, userId, path[0]);
}

function stopTour(userId: string, guildId: string) {
    controlled = controlled.filter(c => !(c.userId === userId && c.guildId === guildId && c.mode === "tour"));
    console.log("[UVC] Tour stopped for", userId);
    sendLogMessage(`⛔ تم إيقاف **جب نعولك** عن <@${userId}>`);
    showToast("تم إيقاف جب نعولك", Toasts.Type.SUCCESS);
}

// رح من دون نعول – يمشي كل الفويس ويوقف في آخر روم
function setFullTour(userId: string, guildId: string) {
    const info = getUserChannelId(userId);
    if (!info) {
        console.log("[UVC] setFullTour: user not in voice");
        showToast("المستخدم مو في روم صوتي", Toasts.Type.FAILURE);
        return;
    }
    const channels = getVoiceChannelsIncludingCurrent(guildId, info.channelId);
    if (!channels.length) {
        console.log("[UVC] setFullTour: no channels at all");
        showToast("ما لقيت رومات صوتية في السيرفر", Toasts.Type.FAILURE);
        return;
    }

    const path = channels;
    const cu = ensureControlled(userId, guildId, "fullTour");
    cu.channels = path;
    cu.index = 0;
    cu.originChannelId = undefined;

    console.log("[UVC] FullTour armed for", userId, "path:", path);
    sendLogMessage(`🚀 تم تشغيل **رح من دون نعول** لـ <@${userId}> (المسار: ${path.map(id => `<#${id}>`).join(" → ")})`);
    showToast("🚀 رح من دون نعول شغّال للمستخدم", Toasts.Type.SUCCESS);

    moveUserToChannel(guildId, userId, path[0]);
}

function stopFullTour(userId: string, guildId: string) {
    controlled = controlled.filter(c => !(c.userId === userId && c.guildId === guildId && c.mode === "fullTour"));
    console.log("[UVC] FullTour stopped for", userId);
    sendLogMessage(`⛔ تم إيقاف **رح من دون نعول** عن <@${userId}>`);
    showToast("تم إيقاف رح من دون نعول", Toasts.Type.SUCCESS);
}

// Tabarbar – تحريك يدوي من منيو الروم مع لوق
function setTabarbar(userId: string, guildId: string, enable: boolean) {
    if (!enable) {
        controlled = controlled.filter(c => !(c.userId === userId && c.guildId === guildId && c.mode === "tabarbar"));
        console.log("[UVC] Tabarbar stopped for", userId);
        sendLogMessage(`⛔ تم إيقاف **Tabarbar** عن <@${userId}>`);
        showToast("تم إيقاف Tabarbar", Toasts.Type.SUCCESS);
        return;
    }
    const info = getUserChannelId(userId);
    if (!info) {
        console.log("[UVC] setTabarbar: user not in voice");
        showToast("المستخدم مو في روم صوتي", Toasts.Type.FAILURE);
        return;
    }
    const channels = getVoiceChannelsIncludingCurrent(guildId, info.channelId);
    if (!channels.length) {
        console.log("[UVC] setTabarbar: no channels at all");
        showToast("ما لقيت رومات صوتية في السيرفر", Toasts.Type.FAILURE);
        return;
    }
    const cu = ensureControlled(userId, guildId, "tabarbar");
    cu.channels = channels;
    cu.index = channels.indexOf(info.channelId);
    console.log("[UVC] Tabarbar armed for", userId, "channels:", channels);
    sendLogMessage(`📱 تم تشغيل **Tabarbar** لـ <@${userId}>`);
    showToast("تم تشغيل Tabarbar للمستخدم", Toasts.Type.SUCCESS);
}

// تحريك Tabarbar تحت / فوق بعدد stepCount، ثم روم عشوائي غير الروم الحالي
async function stepTabarbar(userId: string, guildId: string, currentChannelId: string, direction: "up" | "down") {
    const cu = controlled.find(c => c.userId === userId && c.guildId === guildId && c.mode === "tabarbar");
    if (!cu) return;

    if (!cu.channels.length) cu.channels = getVoiceChannelsIncludingCurrent(guildId, currentChannelId);
    const channels = cu.channels;
    if (!channels.length) return;

    const steps = Number(settings.store.stepCount) || 1;

    let idx = channels.indexOf(currentChannelId);
    if (idx === -1) idx = cu.index;

    const count = channels.length;

    // يمشي واحد واحد بدون تأخير
    for (let i = 0; i < steps; i++) {
        const delta = direction === "up" ? -1 : 1;
        idx = ((idx + delta) % count + count) % count;
        const hopChannelId = channels[idx];
        await moveUserToChannel(guildId, userId, hopChannelId);
        cu.index = idx;
    }

    // بعد ما يخلص، يوديه روم عشوائي غير الروم الحالي (عشان لو أكثر من شخص ما يتجمعون)
    const currentInfo = getUserChannelId(userId);
    const currentUserChannel = currentInfo?.channelId;

    const others = channels.filter(id => id !== currentUserChannel);
    if (others.length > 0) {
        const randomIndex = Math.floor(Math.random() * others.length);
        const randomChannelId = others[randomIndex];
        await moveUserToChannel(guildId, userId, randomChannelId);
        cu.index = channels.indexOf(randomChannelId);
        sendLogMessage(`🎲 تم نقل <@${userId}> إلى روم عشوائي <#${randomChannelId}> بعد ${steps} رومات (Tabarbar)`);
    } else {
        sendLogMessage(`📦 تم تحريك <@${userId}> عبر ${steps} رومات (Tabarbar)، مافي روم عشوائي مختلف.`);
    }
}

// ========== ContextMenus ==========

// منيو العضو: 🔒 تجميد فوري + 🎠 جب نعولك + 🚀 رح من دون نعول
const UserContext: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || user.id === UserStore.getCurrentUser()?.id) return;

    const info = getUserChannelId(user.id);
    if (!info) return;
    const { guildId } = info;

    const fz = controlled.some(c => c.userId === user.id && c.guildId === guildId && c.mode === "frozen");
    const tr = controlled.some(c => c.userId === user.id && c.guildId === guildId && c.mode === "tour");
    const ft = controlled.some(c => c.userId === user.id && c.guildId === guildId && c.mode === "fullTour");

    const labelInstantFreeze = settings.store.labelInstantFreeze || "🔒 تجميد فوري (القديم)";
    const labelTour = settings.store.labelTour || "🎠 جب نعولك (يتحرك بكل الرومات → يرجع)";
    const labelFullTour = settings.store.labelFullTour || "🚀 رح من دون نعول (يروح كل الفويس → روم ثاني)";

    children.splice(
        -1,
        0,
        <Menu.MenuGroup>
            <Menu.MenuItem id="uvc-user-menu" label={settings.store.menuTitleUser || "Ultimate VC"}>
                <Menu.MenuItem
                    id="uvc-freeze-user"
                    label={labelInstantFreeze}
                    color={fz ? "danger" : undefined}
                    action={() => setFrozen(user.id, guildId, !fz)}
                />
                <Menu.MenuItem
                    id="uvc-tour-user"
                    label={labelTour}
                    color={tr ? "danger" : undefined}
                    action={() => {
                        if (tr) stopTour(user.id, guildId);
                        else setTour(user.id, guildId);
                    }}
                />
                <Menu.MenuItem
                    id="uvc-fulltour-user"
                    label={labelFullTour}
                    color={ft ? "danger" : undefined}
                    action={() => {
                        if (ft) stopFullTour(user.id, guildId);
                        else setFullTour(user.id, guildId);
                    }}
                />
            </Menu.MenuItem>
        </Menu.MenuGroup>
    );
};

// منيو الروم: نفس الأزرار لكل شخص + أزرار Tabarbar تحت/فوق
const ChannelContext: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel }) => {
    if (!channel || (channel.type !== 2 && channel.type !== 13) || !channel.guild_id) return;

    const guildId = channel.guild_id;
    const inGuild = controlled.filter(c => c.guildId === guildId);
    if (!inGuild.length) return;

    const uniqUserIds = Array.from(new Set(inGuild.map(c => c.userId)));

    const labelInstantFreeze = settings.store.labelInstantFreeze || "🔒 تجميد فوري (القديم)";
    const labelTour = settings.store.labelTour || "🎠 جب نعولك (يتحرك بكل الرومات → يرجع)";
    const labelFullTour = settings.store.labelFullTour || "🚀 رح من دون نعول (يروح كل الفويس → روم ثاني)";

    const userItems = uniqUserIds.map(userId => {
        const u = UserStore.getUser(userId);
        const name = u?.username || userId;

        const fz = inGuild.some(c => c.userId === userId && c.mode === "frozen");
        const tr = inGuild.some(c => c.userId === userId && c.mode === "tour");
        const ft = inGuild.some(c => c.userId === userId && c.mode === "fullTour");
        const tb = inGuild.some(c => c.userId === userId && c.mode === "tabarbar");

        return (
            <Menu.MenuItem key={`uvc-user-${userId}`} id={`uvc-user-${userId}`} label={name}>
                <Menu.MenuItem
                    id={`uvc-freeze-${userId}`}
                    label={labelInstantFreeze}
                    color={fz ? "danger" : undefined}
                    action={() => setFrozen(userId, guildId, !fz)}
                />
                <Menu.MenuItem
                    id={`uvc-tour-${userId}`}
                    label={labelTour}
                    color={tr ? "danger" : undefined}
                    action={() => {
                        if (tr) stopTour(userId, guildId);
                        else setTour(userId, guildId);
                    }}
                />
                <Menu.MenuItem
                    id={`uvc-fulltour-${userId}`}
                    label={labelFullTour}
                    color={ft ? "danger" : undefined}
                    action={() => {
                        if (ft) stopFullTour(userId, guildId);
                        else setFullTour(userId, guildId);
                    }}
                />
                {tb && (
                    <>
                        <Menu.MenuSeparator />
                        <Menu.MenuItem
                            id={`uvc-tab-down-${userId}`}
                            label={`⬇️ تحريك تحت (${settings.store.stepCount})`}
                            action={() => stepTabarbar(userId, guildId, channel.id, "down")}
                        />
                        <Menu.MenuItem
                            id={`uvc-tab-up-${userId}`}
                            label={`⬆️ تحريك فوق (${settings.store.stepCount})`}
                            action={() => stepTabarbar(userId, guildId, channel.id, "up")}
                        />
                    </>
                )}
                <Menu.MenuItem
                    id={`uvc-clear-${userId}`}
                    label="🗑 Clear User Modes"
                    color="danger"
                    action={() => clearUser(userId)}
                />
            </Menu.MenuItem>
        );
    });

    children.splice(
        -1,
        0,
        <Menu.MenuGroup>
            <Menu.MenuItem id="uvc-main" label={settings.store.menuTitleChannel || "Ultimate VC"}>
                {userItems}
                <Menu.MenuSeparator />
                <Menu.MenuItem
                    id="uvc-clear-guild"
                    label="🗑 Clear Guild Modes"
                    color="danger"
                    action={() => clearGuild(guildId)}
                />
            </Menu.MenuItem>
        </Menu.MenuGroup>
    );
};

// ========== Plugin Export + flux ==========

export default definePlugin({
    name: "UltimateVoiceControl",
    description: "Freeze / Tour / Full Tour / Tabarbar with VC-style context menus and log messages.",
    authors: [Devs.rz30],
    settings,

    contextMenus: {
        "user-context": UserContext,
        "channel-context": ChannelContext
    },

    start() {
        console.log("[UVC] Plugin started");
    },

    stop() {
        console.log("[UVC] Plugin stopped");
        controlled = [];
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[] }) {
            if (!voiceStates) return;

            for (const { userId, channelId } of voiceStates) {
                if (!userId) continue;

                // Frozen
                const cuFrozen = controlled.find(c => c.userId === userId && c.mode === "frozen");
                if (cuFrozen && cuFrozen.originChannelId && channelId && channelId !== cuFrozen.originChannelId) {
                    console.log("[UVC] frozen user moved, pulling back", userId);
                    moveUserToChannel(cuFrozen.guildId, userId, cuFrozen.originChannelId);
                    continue;
                }

                // Tour
                const cuTour = controlled.find(c => c.userId === userId && c.mode === "tour");
                if (cuTour && channelId) {
                    if (!cuTour.channels.length) {
                        cuTour.channels = getVoiceChannelsIncludingCurrent(cuTour.guildId, channelId);
                    }
                    const channels = cuTour.channels;
                    if (!channels.length) continue;

                    const idx = channels.indexOf(channelId);
                    if (idx === -1) continue;

                    const nextIndex = idx + 1;
                    if (nextIndex < channels.length) {
                        const nextChannel = channels[nextIndex];
                        console.log("[UVC] tour step", userId, "->", nextChannel);
                        moveUserToChannel(cuTour.guildId, userId, nextChannel);
                        cuTour.index = nextIndex;
                    } else {
                        if (cuTour.originChannelId) {
                            console.log("[UVC] tour finished, back to origin", userId);
                            moveUserToChannel(cuTour.guildId, userId, cuTour.originChannelId);
                        }
                        controlled = controlled.filter(c => c !== cuTour);
                    }
                }

                // FullTour
                const cuFull = controlled.find(c => c.userId === userId && c.mode === "fullTour");
                if (cuFull && channelId) {
                    if (!cuFull.channels.length) {
                        cuFull.channels = getVoiceChannelsIncludingCurrent(cuFull.guildId, channelId);
                    }
                    const channels = cuFull.channels;
                    if (!channels.length) continue;

                    const idx = channels.indexOf(channelId);
                    if (idx === -1) continue;

                    const nextIndex = idx + 1;
                    if (nextIndex < channels.length) {
                        const nextChannel = channels[nextIndex];
                        console.log("[UVC] fullTour step", userId, "->", nextChannel);
                        moveUserToChannel(cuFull.guildId, userId, nextChannel);
                        cuFull.index = nextIndex;
                    } else {
                        console.log("[UVC] fullTour finished for", userId);
                        controlled = controlled.filter(c => c !== cuFull);
                    }
                }
            }
        }
    }
});
