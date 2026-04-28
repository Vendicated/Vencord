/*
 * Vencord, a Discord client mod
 * rz الشريف - Unified Voice Tools + Pin
 * Follow / Pull / Freeze + Voice Blacklist + Voice Tools + زحلق الي بعدك (متعددة)
 * + Logs + Anti-Move + Auto Self Unmute + Auto Unmute/Undeafen + Role Puller + Pin Channel + Hotkeys
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/lazyReact";
import { classes } from "@utils/misc";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { OptionType, makeRange } from "@utils/types";
import { find, findByPropsLazy, findStoreLazy } from "@webpack";
import {
    Alerts,
    ChannelStore,
    GuildChannelStore,
    Menu,
    PermissionStore,
    React,
    RestAPI,
    SelectedChannelStore,
    Toasts,
    UserStore,
    showToast
} from "@webpack/common";
import type { Channel, User } from "discord-types/general";
import type { PropsWithChildren, SVGProps } from "react";

/* ===================== Voice Stores ===================== */

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    guildId?: string;
    deaf?: boolean;
    mute?: boolean;
}

interface VoiceStateStoreType {
    getAllVoiceStates(): { [guildId: string]: { [userId: string]: VoiceState } };
    getVoiceStatesForChannel(channelId: string): { [userId: string]: VoiceState };
}

const VoiceStateStore: VoiceStateStoreType = findStoreLazy("VoiceStateStore");

/* ===================== Header Icon ===================== */

const HeaderBarIcon = LazyComponent(() => {
    const filter = (m: any) => m?.toString?.().includes(".HEADER_BAR_BADGE");
    const mod = find(m => m?.Icon && filter(m.Icon));
    return (mod as any)?.Icon ?? (() => null);
});

/* ===================== Channel Actions ===================== */

const ChannelActions: {
    disconnect: () => void;
    selectVoiceChannel: (channelId: string) => void;
} = findByPropsLazy("disconnect", "selectVoiceChannel");

const CONNECT = 1n << 20n;
const MOVE = 1n << 24n;
const MUTE = 1n << 22n;
const DEAFEN = 1n << 23n;

/* ===================== Icons ===================== */

interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    height?: string | number;
    width?: string | number;
}

interface BaseIconProps extends IconProps {
    viewBox: string;
}

function Icon({
    height = 20,
    width = 20,
    className,
    children,
    viewBox,
    ...svgProps
}: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={classes(className, "rz-alshareef-icon")}
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            {children}
        </svg>
    );
}

function FollowIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M12 2a5 5 0 0 1 5 5v1a4 4 0 0 1-2 3.46V13h3a2 2 0 0 1 2 2v1h-2v-1h-3v4h-2v-4H9v1H7v-1a2 2 0 0 1 2-2h3v-1.54A4 4 0 0 1 7 8V7a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3v1a2 2 0 0 0 4 0V7a3 3 0 0 0-3-3Z"
            />
        </Icon>
    );
}

function UnfollowIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M3 4.27 4.28 3 21 19.72 19.73 21l-2.18-2.18A2 2 0 0 1 17 17v-1a2 2 0 0 0-2-2h-1.73L9 9.73V10a4 4 0 0 0 3 3.86V15H9a2 2 0 0 0-2 2v1H5v-1a4 4 0 0 1 4-4h2v-.14A4 4 0 0 1 8 10V9.18L3 4.27M12 2a5 5 0 0 1 5 5v1a4 4 0 0 1-.8 2.4L15.64 9A2 2 0 0 0 15 8V7a3 3 0 0 0-3-3 2.9 2.9 0 0 0-1 .18L9.41 3.59A5 5 0 0 1 12 2Z"
            />
        </Icon>
    );
}

function FreezeIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M11 2h2v5.09L16.45 3.6 17.86 5 13 9.86V12h2.14L18 9.14 19.41 10.55 17 13h5v2h-5l2.41 2.45L18 18.86 15.14 16H13v2.14L16 21l-1.41 1.41L13 20.83V23h-2v-2.17l-1.59 1.58L8 21l3-2.86V16H8.86L6 18.86 4.59 17.45 7 15H2v-2h5L4.59 10.59 6 9.14 8.86 12H11V9.86L6.14 5l1.45-1.4L11 7.09Z"
            />
        </Icon>
    );
}

function BlockIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m5 10a5 5 0 0 1-1 3l-7-7a5 5 0 0 1 8 4m-10 0a5 5 0 0 1 1-3l7 7a5 5 0 0 1-8-4Z"
            />
        </Icon>
    );
}

function ToolsIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M3 3h6v2H5v4H3V3m10 0h8v8h-2V5h-6V3M3 13h2v6h6v2H3v-8m16 0h2v8h-8v-2h6v-6Z"
            />
        </Icon>
    );
}

function SlideIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M4 4h2l3 9 3-7 3 7 3-9h2l-4 12h-2l-3-7-3 7H8Z"
            />
        </Icon>
    );
}

function RZIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M3 3h8a5 5 0 0 1 0 10H8l5 8H9L4 11.5V13H3V3Zm5 2H5v4h3a2 2 0 0 0 0-4Zm11 0h2v2l-6 7h6v2h-9v-2Z"
            />
        </Icon>
    );
}

/* أيقونة تثبيت (دبوس) */
function PinIcon(props: IconProps) {
    return (
        <Icon {...props} viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M14 2l-1 1v3.59l-2 2V4L10 3 5 8l1 1h3.59l-2 2H5l-1 1 4 4-3 3 1.5 1.5 3-3 4 4 1-1v-2.59l2-2V19l1 1 5-5-1-1h-3.59l2-2H21l1-1-4-4 3-3L19.5 2.5l-3 3-2.5-2.5z"
            />
        </Icon>
    );
}

/* ===================== Settings ===================== */

const settings = definePluginSettings({
    /* Follow core */
    followUserIds: {
        type: OptionType.STRING,
        description: "Follow User IDs (comma separated)",
        default: "",
        hidden: true,
        restartNeeded: false
    },
    currentFollowId: {
        type: OptionType.STRING,
        description: "آخر مستخدم عليه فولو (current follow)",
        default: "",
        hidden: true,
        restartNeeded: false
    },
    executeOnFollow: {
        type: OptionType.BOOLEAN,
        description: "التحق تلقائيًا بروم الشخص لما تفعل Follow من القائمة",
        restartNeeded: false,
        default: true
    },
    onlyManualTrigger: {
        type: OptionType.BOOLEAN,
        description: "لا تلحق الفولو تلقائيًا، اشتغل فقط لما تضغط من الإنديكيتور / يدوي",
        restartNeeded: false,
        default: false
    },
    followLeave: {
        type: OptionType.BOOLEAN,
        description: "أخرج من الروم لما الشخص اللي تتابعه يطلع من نفس الروم",
        restartNeeded: false,
        default: false
    },
    autoMoveBack: {
        type: OptionType.BOOLEAN,
        description: "ارجع لروم الفولو لو أحد نقلك من عنده",
        restartNeeded: false,
        default: false
    },
    followUserId: {
        type: OptionType.STRING,
        description: "Followed User ID (للاستعمال الداخلي)",
        restartNeeded: false,
        hidden: true,
        default: ""
    },
    channelFull: {
        type: OptionType.BOOLEAN,
        description: "لا تحاول تدخل روم الفولو إذا هو فل (إلا لو عندك صلاحية Move Members)",
        restartNeeded: false,
        default: true
    },

    // Pull & Freeze
    pullListUserIds: {
        type: OptionType.STRING,
        description: "Pull List IDs (comma separated)",
        default: "",
        hidden: true,
        restartNeeded: false
    },
    frozenUserIds: {
        type: OptionType.STRING,
        description: "Frozen User IDs",
        default: "",
        hidden: true,
        restartNeeded: false
    },

    // Voice Blacklist
    muteUser: {
        type: OptionType.BOOLEAN,
        description: "Server Mute blacklisted users",
        default: true
    },
    deafenUser: {
        type: OptionType.BOOLEAN,
        description: "Server Deafen blacklisted users",
        default: true
    },
    disconnectUser: {
        type: OptionType.BOOLEAN,
        description: "Disconnect blacklisted users from channel",
        default: true
    },
    monitorSpeed: {
        type: OptionType.SLIDER,
        description: "Monitor check interval (milliseconds)",
        default: 100,
        markers: [50, 100, 250, 500, 1000],
        stickToMarkers: true
    },
    keepBlacklistMuteOutsideChannel: {
        type: OptionType.BOOLEAN,
        description:
            "لو طلع من الروم اللي عليه بلاك ودخل روم ثاني، خله يبقى ميوت ودفن",
        default: false,
        restartNeeded: false
    },

    // Voice Tools anti-rate-limit
    waitAfter: {
        type: OptionType.SLIDER,
        description: "Amount of API actions before waiting (Voice Tools)",
        default: 5,
        markers: makeRange(1, 20)
    },
    waitSeconds: {
        type: OptionType.SLIDER,
        description: "Time to wait between batches (seconds, Voice Tools)",
        default: 2,
        markers: makeRange(1, 10, 0.5)
    },

    // Pin / Anti-Move / Auto-Unmute
    autoSelfUnmute: {
        type: OptionType.BOOLEAN,
        description: "فك الميوت والدفن عن نفسك تلقائيًا عند دخول روم (client mute/deaf)",
        default: true,
        restartNeeded: false
    },
    reconnect: {
        type: OptionType.BOOLEAN,
        description: "ارجع للروم المثبت لو انقطعت منه",
        default: true
    },
    autoUndeafen: {
        type: OptionType.BOOLEAN,
        description: "فك الدفن السيرفري عن نفسك تلقائيًا",
        default: true
    },
    autoUnmute: {
        type: OptionType.BOOLEAN,
        description: "فك الميوت السيرفري عن نفسك تلقائيًا",
        default: true
    },
    moveToPinned: {
        type: OptionType.BOOLEAN,
        description: "خلك دايمًا في الروم المثبت (Anti-Move)",
        default: true
    },
    pinnedChannelId: {
        type: OptionType.STRING,
        description: "ID الروم المثبت (داخلي)",
        default: "",
        hidden: true,
        restartNeeded: false
    },
    cooldown: {
        type: OptionType.SLIDER,
        description: "تهدئة بين ردود البلوقن على السحب (ثواني)",
        default: 2,
        markers: [1, 2, 3, 4, 5]
    },

    // Role Puller
    pulledRoleId: {
        type: OptionType.STRING,
        description: "ID الرول المحدد للسحب",
        default: "",
        hidden: true,
        restartNeeded: false
    },
    pulledRoleName: {
        type: OptionType.STRING,
        description: "اسم الرول المحدد للسحب",
        default: "",
        hidden: true,
        restartNeeded: false
    },
    pulledGuildName: {
        type: OptionType.STRING,
        description: "اسم السيرفر الذي أُخذ منه الرول",
        default: "",
        hidden: true,
        restartNeeded: false
    },

    // Auto Pull
    autoPullListOnMove: {
        type: OptionType.BOOLEAN,
        description: "سحب قائمة السحب تلقائيًا إلى رومك عند انتقالك لروم جديد",
        default: true,
        restartNeeded: false
    },

    /* النص / وسط البلوقن */

    zahleqaChannelIds: {
        type: OptionType.STRING,
        description: "IDs الرومات اللي عليها زحلقه (مفصولة بفواصل)",
        default: "",
        hidden: true,
        restartNeeded: false
    },
    zahleqaSameCategory: {
        type: OptionType.BOOLEAN,
        description: "زحلق داخل نفس الكاتيجوري فقط (إن وجد)",
        default: true,
        restartNeeded: false
    },

    /* Logs */

    joinLeaveLogChannelId: {
        type: OptionType.STRING,
        description: "روم لوق الدخول والخروج (ID روم نصي)",
        default: "",
        restartNeeded: false
    },
    muteDeafenLogChannelId: {
        type: OptionType.STRING,
        description: "روم لوق الميوت والدفن",
        default: "",
        restartNeeded: false
    },
    moveLogChannelId: {
        type: OptionType.STRING,
        description: "روم لوق النقل بين الرومات / السيرفرات",
        default: "",
        restartNeeded: false
    },
    labelJoinLogTitle: {
        type: OptionType.STRING,
        description: "اسم لوق الدخول",
        default: "لوق الدخول",
        restartNeeded: false
    },
    labelLeaveLogTitle: {
        type: OptionType.STRING,
        description: "اسم لوق الخروج",
        default: "لوق الخروج",
        restartNeeded: false
    },
    labelMoveLogTitle: {
        type: OptionType.STRING,
        description: "اسم لوق النقل",
        default: "لوق النقل",
        restartNeeded: false
    },
    labelMuteLogTitle: {
        type: OptionType.STRING,
        description: "اسم لوق الميوت",
        default: "لوق الميوت",
        restartNeeded: false
    },
    labelDeafenLogTitle: {
        type: OptionType.STRING,
        description: "اسم لوق الدفن",
        default: "لوق الدفن",
        restartNeeded: false
    },

    /* فلتر اللوق */

    logGuildFilter: {
        type: OptionType.STRING,
        description:
            "IDs السيرفرات المسموح/الممنوع لها اللوق (مفصولة بفواصل)",
        default: "",
        restartNeeded: false
    },
    logGuildFilterModeAllow: {
        type: OptionType.BOOLEAN,
        description:
            "لو شغال: القائمة Allowlist (بس اللي فيها يتسجل لهم لوق).\nلو مطفي: القائمة Blocklist (اللي فيها ما يتسجل لهم لوق).",
        default: true,
        restartNeeded: false
    },

    /* Hotkeys */

    hotkeyPinToggle: {
        type: OptionType.STRING,
        description: "اختصار تثبيت/إلغاء تثبيت الروم (مثال: Ctrl+Shift+P)",
        default: "Ctrl+Shift+P"
    },
    hotkeyPullAll: {
        type: OptionType.STRING,
        description: "اختصار سحب المسحوبين لرومك (مثال: Ctrl+Shift+L)",
        default: "Ctrl+Shift+L"
    },
    hotkeyToggleZahleqa: {
        type: OptionType.STRING,
        description: "اختصار تفعيل/إلغاء الزحلقه على رومك الحالي",
        default: "Ctrl+Shift+Z"
    },
    hotkeyFreezeAll: {
        type: OptionType.STRING,
        description: "اختصار لتجميد كل اللي في الروم الحالي",
        default: "Ctrl+Shift+F"
    },
    hotkeyPullAllMark: {
        type: OptionType.STRING,
        description: "اختصار يحط كل اللي في الروم الحالي في قائمة أبيّك",
        default: "Ctrl+Shift+A"
    },
    hotkeyFollowAll: {
        type: OptionType.STRING,
        description: "اختصار يسوي فولو لكل اللي في الروم",
        default: "Ctrl+Shift+W"
    },
    hotkeyClearAll: {
        type: OptionType.STRING,
        description: "اختصار يشيل كل شي (فولو / أبيّك / تجميد / بلاك / زحلقه / تثبيت / رول)",
        default: "Ctrl+Shift+X"
    }
});

/* ===================== Helpers ===================== */

function log(msg: string, ...rest: any[]) {
    console.log("[rz unified]", msg, ...rest);
}

type RZToastType = "success" | "error" | "info";

function showRZMessage(
    message: string,
    type: RZToastType = "info",
    durationMs = 2500
) {
    try {
        const toastType =
            type === "success"
                ? Toasts.Type.SUCCESS
                : type === "error"
                ? Toasts.Type.FAILURE
                : Toasts.Type.MESSAGE;

        showToast(message, toastType, {
            duration: durationMs
        });
    } catch {
        console.log("[rz unified][toast-fallback]", message);
    }
}

function getIds(raw: string) {
    return raw ? raw.split(",").map(s => s.trim()).filter(Boolean) : [];
}

function setIdsKey(key: keyof typeof settings.store, ids: string[]) {
    (settings.store as any)[key] = [...new Set(ids)].join(",");
}

function getGuildIdFromChannel(channelId: string | null | undefined) {
    if (!channelId) return null;
    try {
        const ch = ChannelStore.getChannel(channelId);
        return ch?.guild_id ?? null;
    } catch {
        return null;
    }
}

/* فلتر اللوق */

function getLogGuildIds() {
    return getIds(settings.store.logGuildFilter);
}

function isLogAllowed(guildId: string | null | undefined): boolean {
    if (!guildId) return false;
    const list = getLogGuildIds();
    if (!list.length) return true;
    const inList = list.includes(guildId);
    return settings.store.logGuildFilterModeAllow ? inList : !inList;
}

/* تخطي البوتات */

function isBot(userId: string): boolean {
    const u = UserStore.getUser(userId);
    return !!u?.bot;
}

/* زحلق Helpers */

function getZahleqaIds() {
    return getIds(settings.store.zahleqaChannelIds);
}
function isZahleqaChannel(id: string) {
    return getZahleqaIds().includes(id);
}
function addZahleqaChannel(id: string) {
    const ids = getZahleqaIds();
    if (!ids.includes(id)) {
        ids.push(id);
        setIdsKey("zahleqaChannelIds", ids);
    }
}
function removeZahleqaChannel(id: string) {
    const ids = getZahleqaIds().filter(x => x !== id);
    setIdsKey("zahleqaChannelIds", ids);
}

/* Hotkey helpers */

type ModKey = {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    key: string | null;
};

function parseHotkey(hotkey: string): ModKey {
    const parts = hotkey.split("+").map(p => p.trim().toLowerCase());
    const mod: ModKey = { ctrl: false, alt: false, shift: false, key: null };

    for (const p of parts) {
        if (p === "ctrl" || p === "control") mod.ctrl = true;
        else if (p === "alt") mod.alt = true;
        else if (p === "shift") mod.shift = true;
        else if (p.length === 1) mod.key = p;
    }

    if (mod.ctrl && !mod.alt && !mod.shift && mod.key === "r") {
        mod.key = null;
    }

    return mod;
}

function matchHotkey(ev: KeyboardEvent, cfg: string): boolean {
    if (!cfg) return false;
    const hk = parseHotkey(cfg);
    if (!hk.key) return false;

    if (hk.ctrl !== ev.ctrlKey) return false;
    if (hk.alt !== ev.altKey) return false;
    if (hk.shift !== ev.shiftKey) return false;

    const evKey = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key.toLowerCase();
    return evKey === hk.key;
}

/* ===================== Follow / Pull / Freeze ===================== */

function getFollowIds() {
    return getIds(settings.store.followUserIds);
}
function isFollow(userId: string) {
    return getFollowIds().includes(userId);
}
function getCurrentFollowId(): string | null {
    const id = settings.store.currentFollowId;
    return id && isFollow(id) ? id : null;
}
function setCurrentFollowId(userId: string | null) {
    settings.store.currentFollowId = userId ?? "";
}

function setFollow(userId: string, enable: boolean) {
    const ids = getFollowIds();
    if (enable) {
        if (!ids.includes(userId)) {
            ids.push(userId);
            setIdsKey("followUserIds", ids);
            showRZMessage("تم إضافة المستخدم لقائمة الفولو", "success");
        }
        setCurrentFollowId(userId);
        settings.store.followUserId = userId;
    } else {
        if (ids.includes(userId)) {
            const filtered = ids.filter(id => id !== userId);
            setIdsKey("followUserIds", filtered);
            showRZMessage("تم إزالة الفولو عن المستخدم", "info");

            const current = getCurrentFollowId();
            if (current === userId) {
                const newIds = filtered;
                const newCurrent = newIds.length ? newIds[newIds.length - 1] : null;
                setCurrentFollowId(newCurrent);
                settings.store.followUserId = newCurrent ?? "";
            }
        }
    }
}

function triggerFollow(targetUserId?: string | null) {
    const followId = targetUserId ?? getCurrentFollowId();
    if (!followId) return;

    const states = VoiceStateStore.getAllVoiceStates();
    let userChannelId: string | null = null;
    let guildId: string | null = null;

    for (const [gId, users] of Object.entries(states)) {
        const vs = users[followId];
        if (vs?.channelId) {
            userChannelId = vs.channelId;
            guildId = gId;
            break;
        }
    }

    if (!userChannelId || !guildId) {
        showRZMessage("المستخدم اللي تتابعه مو في روم صوتي", "info");
        return;
    }

    const myChanId = SelectedChannelStore.getVoiceChannelId();
    if (myChanId === userChannelId) {
        showRZMessage("أنت أصلًا معه في نفس الروم", "info");
        return;
    }

    const channel = ChannelStore.getChannel(userChannelId);
    if (!channel) {
        showRZMessage("ما قدرت أجيب بيانات روم الفولو", "error");
        return;
    }

    const voiceStates = VoiceStateStore.getVoiceStatesForChannel(userChannelId);
    const memberCount = voiceStates ? Object.keys(voiceStates).length : 0;

    const canConnect = PermissionStore.can(CONNECT, channel);
    const canMove = PermissionStore.can(MOVE, channel);

    if (!canConnect && !canMove) {
        showRZMessage("ما عندك صلاحية تدخل روم الفولو", "error");
        return;
    }

    if (
        settings.store.channelFull &&
        channel.userLimit !== 0 &&
        memberCount >= channel.userLimit &&
        !canMove
    ) {
        showRZMessage("الروم حق الفولو فل حاليًا", "error");
        return;
    }

    ChannelActions.selectVoiceChannel(userChannelId);
    showRZMessage("تم اللحاق بالفولو يوزر", "success");

    settings.store.followUserId = followId;
}

function confirmFollowAction(user: User) {
    Alerts.show({
        title: "فولو يوزر",
        body: `المستخدم ${user.username} عليه فولو يوزر.\nوش تبي تسوي؟`,
        confirmText: "روح معه",
        cancelText: "شيله من الفولو",
        confirmColor: "green",
        onConfirm: () => {
            setCurrentFollowId(user.id);
            settings.store.followUserId = user.id;
            triggerFollow(user.id);
        },
        onCancel: () => {
            setFollow(user.id, false);
        }
    });
}

/* Pull */

function getPullListIds() {
    return getIds(settings.store.pullListUserIds);
}
function isPulled(userId: string) {
    return getPullListIds().includes(userId);
}
function addToPullList(userId: string) {
    const ids = getPullListIds();
    if (!ids.includes(userId)) {
        ids.push(userId);
        setIdsKey("pullListUserIds", ids);
        showRZMessage("تم إضافة المستخدم لقائمة السحب", "success");
    }
}
function removeFromPullList(userId: string) {
    const ids = getPullListIds().filter(id => id !== userId);
    setIdsKey("pullListUserIds", ids);
    showRZMessage("تم إزالة المستخدم من قائمة السحب", "info");
}

/* Freeze */

function getFrozenIds() {
    return getIds(settings.store.frozenUserIds);
}
function isFrozen(userId: string) {
    return getFrozenIds().includes(userId);
}

type ControlMode = "frozen";

interface ControlledEntry {
    userId: string;
    mode: ControlMode;
    guildId: string;
    originChannelId: string;
}
let controlled: ControlledEntry[] = [];

async function moveUserToChannel(
    guildId: string,
    userId: string,
    targetChannelId: string
) {
    try {
        const channel = ChannelStore.getChannel(targetChannelId);
        if (!channel) return;

        const hasPerm = PermissionStore.can(MOVE, channel);
        if (!hasPerm) return;

        await RestAPI.patch({
            url: `/guilds/${guildId}/members/${userId}`,
            body: { channel_id: targetChannelId }
        }).catch(() => {});
    } catch {}
}

function toggleFreezeUser(user: User) {
    const frozen = isFrozen(user.id);
    const ids = getFrozenIds();

    if (frozen) {
        setIdsKey("frozenUserIds", ids.filter(id => id !== user.id));
        controlled = controlled.filter(
            c => c.userId !== user.id || c.mode !== "frozen"
        );
        showRZMessage(`تم فك التجميد عن ${user.username}`, "info");
        return;
    }

    const states = VoiceStateStore.getAllVoiceStates();
    let guildId: string | null = null;
    let originChannelId: string | null = null;

    for (const [gId, users] of Object.entries(states)) {
        const vs = users[user.id];
        if (vs?.channelId) {
            guildId = gId;
            originChannelId = vs.channelId;
            break;
        }
    }

    if (!guildId || !originChannelId) {
        showRZMessage(
            `${user.username} ليس في روم صوتي، ما أقدر أجمّده`,
            "error"
        );
        return;
    }

    ids.push(user.id);
    setIdsKey("frozenUserIds", ids);
    controlled.push({
        userId: user.id,
        mode: "frozen",
        guildId,
        originChannelId
    });
    showRZMessage(`تم تفعيل التجميد على ${user.username}`, "success");
}

/* ===================== Voice Blacklist ===================== */

interface BlacklistEntry {
    userId: string;
    channelId: string;
}

let blacklist: BlacklistEntry[] = [];
let monitorInterval: NodeJS.Timeout | null = null;
const kickCache = new Set<string>();

function hasPermsBlacklist(channelId: string): boolean {
    try {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return false;
        return PermissionStore.can(MUTE | DEAFEN | MOVE, channel);
    } catch {
        return false;
    }
}

function isBlacklisted(userId: string, channelId: string): boolean {
    return blacklist.some(e => e.userId === userId && e.channelId === channelId);
}

function addBlacklist(userId: string, channelId: string) {
    if (!isBlacklisted(userId, channelId)) {
        blacklist.push({ userId, channelId });
        log("[VCBlacklist] Added:", userId, channelId);
    }
}

function removeBlacklist(userId: string, channelId: string) {
    blacklist = blacklist.filter(
        e => !(e.userId === userId && e.channelId === channelId)
    );
    kickCache.delete(`${userId}-${channelId}`);
    log("[VCBlacklist] Removed:", userId, channelId);
}

function getUserChannelId(userId: string): string | null {
    try {
        const states = VoiceStateStore.getAllVoiceStates();
        for (const users of Object.values(states)) {
            if (users[userId]) {
                return users[userId].channelId ?? null;
            }
        }
    } catch {}
    return null;
}

function kickUserWithSettings(
    guildId: string,
    userId: string,
    channelId: string
) {
    const cacheKey = `${userId}-${channelId}`;
    if (kickCache.has(cacheKey)) return;
    if (!isBlacklisted(userId, channelId)) return;

    kickCache.add(cacheKey);

    const actions: Promise<any>[] = [];

    if (settings.store.muteUser || settings.store.deafenUser) {
        const body: any = {};
        if (settings.store.muteUser) body.mute = true;
        if (settings.store.deafenUser) body.deaf = true;

        actions.push(
            RestAPI.patch({
                url: `/guilds/${guildId}/members/${userId}`,
                body
            }).catch(() => {})
        );
    }

    if (settings.store.disconnectUser) {
        setTimeout(() => {
            RestAPI.patch({
                url: `/guilds/${guildId}/members/${userId}`,
                body: { channel_id: null }
            }).catch(() => {});
        }, 100);
    }

    Promise.all(actions)
        .then(() => {
            setTimeout(() => kickCache.delete(cacheKey), 1000);
        })
        .catch(() => {
            kickCache.delete(cacheKey);
        });

    log("[VCBlacklist] Actions applied to:", userId);
}

function monitorBlacklist() {
    try {
        if (blacklist.length === 0) return;

        const allStates = VoiceStateStore.getAllVoiceStates();
        const currentBlacklist = [...blacklist];

        for (const entry of currentBlacklist) {
            const { userId, channelId } = entry;
            if (!isBlacklisted(userId, channelId)) continue;

            for (const users of Object.values(allStates)) {
                const userState = users[userId];
                if (userState && userState.channelId === channelId) {
                    const channel = ChannelStore.getChannel(channelId);
                    if (channel && hasPermsBlacklist(channelId)) {
                        kickUserWithSettings(channel.guild_id!, userId, channelId);
                    }
                }
            }
        }
    } catch {}
}

function startMonitoring() {
    if (monitorInterval) return;
    const interval = settings.store.monitorSpeed;
    monitorInterval = setInterval(monitorBlacklist, interval);
    log(`[VCBlacklist] Monitoring started (${interval}ms)`);
}

function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        log("[VCBlacklist] Monitoring stopped");
    }
}

/* ===================== Voice Tools (bulk + mention) ===================== */

async function runSequential<T>(promises: Promise<T>[]): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < promises.length; i++) {
        const result = await promises[i];
        results.push(result);

        if (i !== 0 && i % settings.store.waitAfter === 0) {
            await new Promise(res =>
                setTimeout(res, settings.store.waitSeconds * 1000)
            );
        }
    }

    return results;
}

function sendPatchVoiceTools(
    channel: Channel,
    body: Record<string, any>,
    bypassSelf = false
) {
    const usersVoice = VoiceStateStore.getVoiceStatesForChannel(channel.id);
    const myId = UserStore.getCurrentUser().id;

    const promises: Promise<any>[] = [];
    Object.keys(usersVoice).forEach(key => {
        const userVoice = usersVoice[key];
        if ((bypassSelf || userVoice.userId !== myId) && !isBot(userVoice.userId)) {
            promises.push(
                RestAPI.patch({
                    url: `/guilds/${channel.guild_id}/members/${userVoice.userId}`,
                    body
                })
            );
        }
    });

    runSequential(promises).catch(error => {
        console.error("VoiceChatUtilities failed to run", error);
    });
}

function mentionVoiceUsers(channel: Channel) {
    const currentUserId = UserStore.getCurrentUser()?.id;
    const mentions = Object.values(
        VoiceStateStore.getVoiceStatesForChannel(channel.id)
    )
        .map(state => (state as any).userId)
        .filter(
            (userId, index, arr) =>
                userId &&
                userId !== currentUserId &&
                !isBot(userId) &&
                arr.indexOf(userId) === index
        )
        .map(userId => `<@${userId}>`);

    if (!mentions.length) return;
    insertTextIntoChatInputBox(`${mentions.join(" ")} `);
}

/* ===================== زحلق الي بعدك ===================== */

function getSlidePool(channel: Channel): Channel[] {
    const guildChannels: { VOCAL: { channel: Channel; comparator: number }[] } =
        GuildChannelStore.getChannels(channel.guild_id!);

    let voiceChannels = guildChannels.VOCAL.map(v => v.channel).filter(
        ch => ch.id !== channel.id && (ch.type === 2 || ch.type === 13)
    );

    if (settings.store.zahleqaSameCategory && channel.parent_id) {
        voiceChannels = voiceChannels.filter(ch => ch.parent_id === channel.parent_id);
    }

    return voiceChannels;
}

function pickRandom<T>(arr: T[]): T | null {
    if (!arr.length) return null;
    const idx = Math.floor(Math.random() * arr.length);
    return arr[idx];
}

async function moveUserRaw(
    guildId: string,
    userId: string,
    targetChannelId: string
) {
    try {
        await RestAPI.patch({
            url: `/guilds/${guildId}/members/${userId}`,
            body: { channel_id: targetChannelId }
        }).catch(() => {});
    } catch {}
}

/* ===================== Role Puller ===================== */

async function pullRoleMembersToChannel(
    guildId: string,
    roleId: string,
    targetChannelId: string
) {
    try {
        const members: any[] = await RestAPI.get({
            url: `/guilds/${guildId}/members`,
            query: { limit: 1000 }
        }).catch(() => []);

        const me = UserStore.getCurrentUser().id;

        const toMove = members.filter(
            m =>
                m.user?.id !== me &&
                !m.user?.bot &&
                Array.isArray(m.roles) &&
                m.roles.includes(roleId)
        );

        if (!toMove.length) {
            showRZMessage(
                "ما فيه أحد عنده هذا الرول أو ما قدرت أجيب الأعضاء (غير البوتات)",
                "info"
            );
            return;
        }

        const targetChannel = ChannelStore.getChannel(targetChannelId);
        if (!targetChannel) {
            showRZMessage("الروم المستهدف غير موجود", "error");
            return;
        }

        if (!PermissionStore.can(MOVE, targetChannel)) {
            showRZMessage(
                "ما عندك صلاحية Move Members في هذا الروم",
                "error"
            );
            return;
        }

        for (const m of toMove) {
            await RestAPI.patch({
                url: `/guilds/${guildId}/members/${m.user.id}`,
                body: { channel_id: targetChannelId }
            }).catch(() => {});
        }

        showRZMessage(
            `تم سحب ${toMove.length} عضو من رول ${settings.store.pulledRoleName}`,
            "success"
        );
    } catch {
        showRZMessage("صار خطأ أثناء محاولة سحب أصحاب الرول", "error");
    }
}

/* ===================== Logs ===================== */

async function sendToChannel(channelId: string | undefined, content: string) {
    if (!channelId) return;
    try {
        await RestAPI.post({
            url: `/channels/${channelId}/messages`,
            body: { content }
        }).catch(() => {});
    } catch {}
}

async function logJoin(userId: string, channelId: string) {
    const user = UserStore.getUser(userId);
    const channel = ChannelStore.getChannel(channelId);

    const guildId = channel?.guild_id ?? null;
    if (!isLogAllowed(guildId)) return;

    const username = user?.username ?? userId;
    const chName = channel?.name ?? channelId;

    const title = settings.store.labelJoinLogTitle;
    const content =
        `🟢 **${title}**\n` +
        `> ${username} (<@${userId}>) دخل روم **${chName}** (<#${channelId}>)`;

    await sendToChannel(settings.store.joinLeaveLogChannelId, content);
}

async function logLeave(userId: string, oldChannelId: string) {
    const user = UserStore.getUser(userId);
    const channel = ChannelStore.getChannel(oldChannelId);

    const guildId = channel?.guild_id ?? null;
    if (!isLogAllowed(guildId)) return;

    const username = user?.username ?? userId;
    const chName = channel?.name ?? oldChannelId;

    const title = settings.store.labelLeaveLogTitle;
    const content =
        `🔴 **${title}**\n` +
        `> ${username} (<@${userId}>) خرج من روم **${chName}** (<#${oldChannelId}>)`;

    await sendToChannel(settings.store.joinLeaveLogChannelId, content);
}

async function logMove(userId: string, fromId: string, toId: string) {
    const user = UserStore.getUser(userId);
    const fromChannel = ChannelStore.getChannel(fromId);
    const toChannel = ChannelStore.getChannel(toId);

    const fromGuildId = fromChannel?.guild_id ?? null;
    const toGuildId = toChannel?.guild_id ?? null;

    if (!isLogAllowed(fromGuildId) && !isLogAllowed(toGuildId)) return;

    const username = user?.username ?? userId;
    const fromName = fromChannel?.name ?? fromId;
    const toName = toChannel?.name ?? toId;

    const title = settings.store.labelMoveLogTitle;
    const content =
        `🔁 **${title}**\n` +
        `> ${username} (<@${userId}>) انتقل من **${fromName}** (<#${fromId}>) إلى **${toName}** (<#${toId}>)`;

    await sendToChannel(settings.store.moveLogChannelId, content);
}

/* ===================== Context Menus ===================== */

interface UserContextProps {
    channel?: Channel;
    guildId?: string;
    user: User;
}

const UserContext: NavContextMenuPatchCallback = (
    children,
    { user }: UserContextProps
) => {
    const currentUser = UserStore.getCurrentUser();
    if (!user || user.id === currentUser.id) return;

    const follow = isFollow(user.id);
    const pulled = isPulled(user.id);
    const frozen = isFrozen(user.id);

    const channelId = getUserChannelId(user.id);
    const voiceChannel = channelId ? ChannelStore.getChannel(channelId) : null;
    const blacklisted = channelId ? isBlacklisted(user.id, channelId) : false;

    const followLabel = follow ? "ابعد بعيد" : "خذني معك";
    const followIcon = follow ? UnfollowIcon : FollowIcon;

    const pullLabel = pulled ? "طس عني" : "ابيّك";
    const freezeLabel = frozen ? "فك التجميد" : "تجميد";

    children.splice(
        -1,
        0,
        <Menu.MenuGroup label="RZ Controls">
            <Menu.MenuItem
                id="rz-follow"
                label={followLabel}
                icon={followIcon}
                action={() => {
                    if (follow) {
                        confirmFollowAction(user);
                    } else {
                        setFollow(user.id, true);
                        if (settings.store.executeOnFollow) {
                            triggerFollow(user.id);
                        }
                    }
                }}
            />
            <Menu.MenuItem
                id="rz-pull"
                label={pullLabel}
                action={() => {
                    const myChannelId = SelectedChannelStore.getVoiceChannelId();
                    const myChannel = myChannelId
                        ? ChannelStore.getChannel(myChannelId)
                        : null;

                    if (!myChannelId || !myChannel) {
                        showRZMessage(
                            "ادخل روم صوتي أول عشان أقدر أسحبه لك",
                            "info"
                        );
                        return;
                    }

                    const guildId = myChannel.guild_id;
                    if (!guildId) {
                        showRZMessage(
                            "ما قدرت أجيب السيرفر حق رومك الحالي",
                            "error"
                        );
                        return;
                    }

                    if (!PermissionStore.can(MOVE, myChannel)) {
                        showRZMessage(
                            "ما عندك صلاحية Move Members في هذا الروم",
                            "error"
                        );
                        return;
                    }

                    if (pulled) {
                        removeFromPullList(user.id);
                    } else {
                        addToPullList(user.id);
                        void moveUserToChannel(guildId, user.id, myChannelId);
                    }
                }}
            />
            <Menu.MenuItem
                id="rz-freeze"
                label={freezeLabel}
                icon={FreezeIcon}
                action={() => toggleFreezeUser(user)}
            />
            {channelId && voiceChannel && hasPermsBlacklist(channelId) && (
                <Menu.MenuItem
                    id="rz-vc-blacklist"
                    label={blacklisted ? "شيله من البلاك ليست" : "عطه بلاك"}
                    color={blacklisted ? "danger" : undefined}
                    icon={BlockIcon}
                    action={() => {
                        if (blacklisted) {
                            Alerts.show({
                                title: "إزالة من البلاك ليست",
                                body: `متأكد تبي تشيل ${user.username} من البلاك ليست في روم ${voiceChannel.name} ؟`,
                                confirmText: "شيله",
                                cancelText: "إلغاء",
                                confirmColor: "red",
                                onConfirm: () =>
                                    removeBlacklist(user.id, channelId)
                            });
                        } else {
                            Alerts.show({
                                title: "عطه بلاك",
                                body:
                                    `متأكد تبي تعطي ${user.username} بلاك في روم ${voiceChannel.name} ؟\n` +
                                    "(راح ينطرد ويتكتم/يندفن حسب إعدادات البلوقن)",
                                confirmText: "عطه بلاك",
                                cancelText: "إلغاء",
                                confirmColor: "red",
                                onConfirm: () => {
                                    addBlacklist(user.id, channelId);
                                    kickUserWithSettings(
                                        voiceChannel.guild_id!,
                                        user.id,
                                        channelId
                                    );
                                }
                            });
                        }
                    }}
                />
            )}
        </Menu.MenuGroup>
    );
};

const VoiceChannelContext: NavContextMenuPatchCallback = (
    children,
    { channel }: { channel: Channel }
) => {
    if (!channel || (channel.type !== 2 && channel.type !== 13) || !channel.guild_id)
        return;

    const followIds = getFollowIds();
    const pullIds = getPullListIds();
    const frozenIds = getFrozenIds();
    const zahleqaIds = getZahleqaIds();

    const blkList = blacklist.filter(e => e.channelId === channel.id);

    const guildChannels: { VOCAL: { channel: Channel; comparator: number }[] } =
        GuildChannelStore.getChannels(channel.guild_id);
    const voiceChannels = guildChannels.VOCAL.map(({ channel: ch }) => ch).filter(
        ({ id }) => id !== channel.id
    );

    const mkUserName = (userId: string) => {
        const u = UserStore.getUser(userId);
        return u?.username || userId;
    };

    const groups: React.ReactNode[] = [];

    /* Follow list */
    if (followIds.length) {
        const items = followIds.map(id => {
            const name = mkUserName(id);
            return (
                <Menu.MenuItem
                    key={id}
                    id={`follow-${id}`}
                    label={name}
                    action={() => {
                        const u = UserStore.getUser(id);
                        if (u) {
                            confirmFollowAction(u);
                        } else {
                            setFollow(id, false);
                        }
                    }}
                />
            );
        });

        items.push(<Menu.MenuSeparator key="follow-sep" />);
        items.push(
            <Menu.MenuItem
                key="follow-clear"
                id="follow-clear"
                label="مسح جميع الفولو يوزر"
                color="danger"
                action={() => {
                    Alerts.show({
                        title: "مسح الفولو يوزر",
                        body: `راح يتم مسح قائمة الفولو بالكامل (${followIds.length} مستخدم)`,
                        confirmText: "مسح",
                        cancelText: "إلغاء",
                        confirmColor: "red",
                        onConfirm: () => {
                            settings.store.followUserIds = "";
                            settings.store.currentFollowId = "";
                            settings.store.followUserId = "";
                            showRZMessage("تم مسح قائمة الفولو", "info");
                        }
                    });
                }}
            />
        );

        groups.push(
            <Menu.MenuItem key="follow-list" id="follow-list" label="Follow Users">
                {items}
            </Menu.MenuItem>
        );
    }

    /* Pull list */
    if (pullIds.length) {
        const items = pullIds.map(id => {
            const name = mkUserName(id);
            return (
                <Menu.MenuItem
                    key={id}
                    id={`pull-${id}`}
                    label={name}
                    action={() => {
                        Alerts.show({
                            title: "قائمة السحب",
                            body: `تبي تشيل ${name} من قائمة السحب؟`,
                            confirmText: "شيله",
                            cancelText: "إلغاء",
                            confirmColor: "red",
                            onConfirm: () => {
                                removeFromPullList(id);
                                showRZMessage(
                                    `تم إزالة ${name} من قائمة السحب`,
                                    "info"
                                );
                            }
                        });
                    }}
                />
            );
        });

        items.push(<Menu.MenuSeparator key="pull-sep" />);
        items.push(
            <Menu.MenuItem
                key="pull-clear"
                id="pull-clear"
                label="مسح قائمة السحب"
                color="danger"
                action={() => {
                    Alerts.show({
                        title: "مسح قائمة السحب",
                        body: `راح تمسح قائمة السحب بالكامل (${pullIds.length} مستخدم)`,
                        confirmText: "مسح",
                        cancelText: "إلغاء",
                        confirmColor: "red",
                        onConfirm: () => {
                            settings.store.pullListUserIds = "";
                            showRZMessage("تم مسح قائمة السحب", "info");
                        }
                    });
                }}
            />
        );

        groups.push(
            <Menu.MenuItem key="pull-list" id="pull-list" label="Pull List">
                {items}
            </Menu.MenuItem>
        );
    }

    /* Frozen list */
    if (frozenIds.length) {
        const items = frozenIds.map(id => {
            const name = mkUserName(id);
            return (
                <Menu.MenuItem
                    key={id}
                    id={`frozen-${id}`}
                    label={name}
                    action={() => {
                        Alerts.show({
                            title: "تجميد",
                            body: `تبي تفك التجميد عن ${name}؟`,
                            confirmText: "فكه",
                            cancelText: "إلغاء",
                            confirmColor: "green",
                            onConfirm: () => {
                                const fakeUser =
                                    UserStore.getUser(id) || ({ id } as User);
                                toggleFreezeUser(fakeUser);
                            }
                        });
                    }}
                />
            );
        });

        items.push(<Menu.MenuSeparator key="frozen-sep" />);
        items.push(
            <Menu.MenuItem
                key="frozen-clear"
                id="frozen-clear"
                label="فك التجميد عن الجميع"
                color="danger"
                action={() => {
                    Alerts.show({
                        title: "فك التجميد عن الجميع",
                        body: `راح تفك التجميد عن ${frozenIds.length} مستخدم`,
                        confirmText: "فك الكل",
                        cancelText: "إلغاء",
                        confirmColor: "green",
                        onConfirm: () => {
                            settings.store.frozenUserIds = "";
                            controlled = controlled.filter(
                                c => c.mode !== "frozen"
                            );
                            showRZMessage("تم فك التجميد عن الجميع", "info");
                        }
                    });
                }}
            />
        );

        groups.push(
            <Menu.MenuItem key="frozen-list" id="frozen-list" label="Frozen">
                {items}
            </Menu.MenuItem>
        );
    }

    /* Voice Blacklist list per channel */
    if (blkList.length && hasPermsBlacklist(channel.id)) {
        const items = blkList.map(entry => {
            const user = UserStore.getUser(entry.userId);
            const name = user?.username || entry.userId;
            return (
                <Menu.MenuItem
                    key={entry.userId}
                    id={`bl-${entry.userId}`}
                    label={name}
                    color="danger"
                    icon={BlockIcon}
                    action={() => {
                        Alerts.show({
                            title: "إزالة من البلاك ليست",
                            body: `متأكد تبي تشيل ${name} من البلاك ليست في هذا الروم؟`,
                            confirmText: "إزالة",
                            cancelText: "إلغاء",
                            confirmColor: "red",
                            onConfirm: () =>
                                removeBlacklist(entry.userId, channel.id)
                        });
                    }}
                />
            );
        });

        items.push(<Menu.MenuSeparator key="bl-sep" />);
        items.push(
            <Menu.MenuItem
                key="bl-rm-all"
                id="bl-rm-all"
                label="إزالة الكل من البلاك ليست في هذا الروم"
                color="danger"
                action={() => {
                    Alerts.show({
                        title: "إزالة الكل من البلاك ليست",
                        body: `متأكد تبي تشيل كل ${blkList.length} عضو من البلاك ليست في هذا الروم؟`,
                        confirmText: "إزالة الكل",
                        cancelText: "إلغاء",
                        confirmColor: "red",
                        onConfirm: () =>
                            blkList.forEach(e =>
                                removeBlacklist(e.userId, channel.id)
                            )
                    });
                }}
            />
        );

        groups.push(
            <Menu.MenuItem
                key="bl-list"
                id="bl-list"
                label="البلاك ليست الصوتي"
                icon={BlockIcon}
            >
                {items}
            </Menu.MenuItem>
        );
    }

    /* Voice Tools + Mention */
    const canVoiceAdmin = hasPermsBlacklist(channel.id);

    groups.push(
        <Menu.MenuItem
            key="voice-tools"
            id="voice-tools"
            label="Voice Tools"
            icon={ToolsIcon}
        >
            <Menu.MenuItem
                key="voice-tools-mention-all"
                id="voice-tools-mention-all"
                label="Mention all Users"
                action={() => mentionVoiceUsers(channel)}
            />
            <Menu.MenuItem
                key="voice-tools-mute-all"
                id="voice-tools-mute-all"
                label=" Mute all"
                action={() => {
                    if (!canVoiceAdmin) {
                        showRZMessage(
                            "ما عندك صلاحية تعدّل على الميوت في هذا الروم",
                            "error"
                        );
                        return;
                    }
                    sendPatchVoiceTools(channel, { mute: true });
                }}
            />
            <Menu.MenuItem
                key="voice-tools-unmute-all"
                id="voice-tools-unmute-all"
                label=" Unmute all"
                action={() => {
                    if (!canVoiceAdmin) {
                        showRZMessage(
                            "ما عندك صلاحية تعدّل على الميوت في هذا الروم",
                            "error"
                        );
                        return;
                    }
                    sendPatchVoiceTools(channel, { mute: false });
                }}
            />
            <Menu.MenuItem
                key="voice-tools-deafen-all"
                id="voice-tools-deafen-all"
                label=" Deafen all"
                action={() => {
                    if (!canVoiceAdmin) {
                        showRZMessage(
                            "ما عندك صلاحية تعدّل على الدفن في هذا الروم",
                            "error"
                        );
                        return;
                    }
                    sendPatchVoiceTools(channel, { deaf: true });
                }}
            />
            <Menu.MenuItem
                key="voice-tools-undeafen-all"
                id="voice-tools-undeafen-all"
                label=" Undeafen all"
                action={() => {
                    if (!canVoiceAdmin) {
                        showRZMessage(
                            "ما عندك صلاحية تعدّل على الدفن في هذا الروم",
                            "error"
                        );
                        return;
                    }
                    sendPatchVoiceTools(channel, { deaf: false });
                }}
            />
            <Menu.MenuItem
                label="Move all"
                key="voice-tools-move-all"
                id="voice-tools-move-all"
            >
                {voiceChannels.map(vc => (
                    <Menu.MenuItem
                        key={vc.id}
                        id={vc.id}
                        label={vc.name}
                        action={() => {
                            if (!canVoiceAdmin) {
                                showRZMessage(
                                    "ما عندك صلاحية Move Members في هذا الروم",
                                    "error"
                                );
                                return;
                            }
                            sendPatchVoiceTools(
                                channel,
                                { channel_id: vc.id },
                                true
                            );
                        }}
                    />
                ))}
            </Menu.MenuItem>
        </Menu.MenuItem>
    );

    /* زر سحب المسحوب – مع تخطي البوتات */
    if (!settings.store.autoPullListOnMove) {
        groups.push(
            <Menu.MenuItem
                key="rz-pull-all-to-me"
                id="rz-pull-all-to-me"
                label="سحب المسحوب"
                action={() => {
                    const myChannelId = SelectedChannelStore.getVoiceChannelId();
                    const myChannel = myChannelId
                        ? ChannelStore.getChannel(myChannelId)
                        : null;

                    if (!myChannelId || !myChannel) {
                        showRZMessage(
                            "ادخل روم صوتي أول عشان أقدر أسحب المسحوبين لك",
                            "info"
                        );
                        return;
                    }

                    const guildId = myChannel.guild_id;
                    if (!guildId) {
                        showRZMessage(
                            "ما قدرت أجيب السيرفر حق رومك الحالي",
                            "error"
                        );
                        return;
                    }

                    if (!PermissionStore.can(MOVE, myChannel)) {
                        showRZMessage(
                            "ما عندك صلاحية Move Members في رومك الحالي",
                            "error"
                        );
                        return;
                    }

                    const ids = getPullListIds().filter(id => !isBot(id));
                    if (!ids.length) {
                        showRZMessage(
                            "ما فيه أحد (غير بوتات) في قائمة السحب",
                            "info"
                        );
                        return;
                    }

                    for (const id of ids) {
                        void moveUserToChannel(guildId, id, myChannelId);
                    }

                    showRZMessage(
                        "تم سحب المسحوبين إلى رومك الحالي",
                        "success"
                    );
                }}
            />
        );
    }

    /* قائمة الرومات المزحلِقه */
    if (zahleqaIds.length) {
        const items = zahleqaIds.map(id => {
            const ch = ChannelStore.getChannel(id);
            const name = ch?.name || id;
            return (
                <Menu.MenuItem
                    key={id}
                    id={`zahleqa-${id}`}
                    label={name}
                    action={() => {
                        removeZahleqaChannel(id);
                        showRZMessage(`تم شيل الزحلقه عن ${name}`, "info");
                    }}
                />
            );
        });

        items.push(<Menu.MenuSeparator key="zahleqa-sep" />);
        items.push(
            <Menu.MenuItem
                key="zahleqa-clear"
                id="zahleqa-clear"
                label="شيل الزحلقه عن كل الرومات"
                color="danger"
                action={() => {
                    Alerts.show({
                        title: "إلغاء الزحلقه عن الكل",
                        body: `راح تشيل الزحلقه عن ${zahleqaIds.length} روم`,
                        confirmText: "إلغاء الكل",
                        cancelText: "إلغاء",
                        confirmColor: "red",
                        onConfirm: () => {
                            settings.store.zahleqaChannelIds = "";
                            showRZMessage(
                                "تم إلغاء الزحلقه عن كل الرومات",
                                "info"
                            );
                        }
                    });
                }}
            />
        );

        groups.push(
            <Menu.MenuItem
                key="zahleqa-list"
                id="zahleqa-list"
                label="الرومات المزحلِقه"
                icon={SlideIcon}
            >
                {items}
            </Menu.MenuItem>
        );
    }

    /* زر تفعيل/إلغاء الزحلقه على هذا الروم */
    const zahleqaOn = isZahleqaChannel(channel.id);
    groups.push(
        <Menu.MenuItem
            key="zahleqa-toggle"
            id="zahleqa-toggle"
            label={zahleqaOn ? "شيل الزحلقه" : "حط زحلقه"}
            icon={SlideIcon}
            action={() => {
                if (zahleqaOn) {
                    removeZahleqaChannel(channel.id);
                    showRZMessage("تم شيل الزحلقه عن هذا الروم", "info");
                } else {
                    addZahleqaChannel(channel.id);
                    showRZMessage(
                        "تم تفعيل الزحلقه على هذا الروم",
                        "success"
                    );
                }
            }}
        />
    );

    /* Anti-Move / Pin Channel */
    const isPinned = settings.store.pinnedChannelId === channel.id;

    groups.push(
        <Menu.MenuItem
            key="rz-pin-channel"
            id="rz-pin-channel"
            label={isPinned ? "وخر التثبيت" : "تثبيت ف الروم"}
            icon={PinIcon}
            action={() => {
                settings.store.pinnedChannelId = isPinned ? "" : channel.id;
                showRZMessage(
                    settings.store.pinnedChannelId
                        ? `حطيت التثبيت ف: ${channel.name}`
                        : "وخرت التثبيت",
                    "success"
                );
            }}
        />
    );

    /* Role Puller button */
    if (
        settings.store.pulledRoleId &&
        settings.store.pulledRoleName &&
        channel.guild_id
    ) {
        groups.push(
            <Menu.MenuItem
                key="rz-pull-role"
                id="rz-pull-role"
                label={`سحب أصحاب رول ${settings.store.pulledRoleName}`}
                subtext={`من: ${settings.store.pulledGuildName}`}
                action={() => {
                    const myChannelId = SelectedChannelStore.getVoiceChannelId();
                    if (!myChannelId) {
                        showRZMessage(
                            "ادخل روم صوتي أول عشان أقدر أسحبهم لك",
                            "info"
                        );
                        return;
                    }
                    void pullRoleMembersToChannel(
                        channel.guild_id!,
                        settings.store.pulledRoleId,
                        myChannelId
                    );
                }}
            />
        );
    }

    if (groups.length) {
        children.splice(
            -1,
            0,
            <Menu.MenuGroup label="RZ Controls">{groups}</Menu.MenuGroup>
        );
    }
};

/* منيو الشات لإدارة فلتر اللوق */

const TextChannelLogContext: NavContextMenuPatchCallback = (
    children,
    { channel }: { channel: Channel }
) => {
    if (!channel || !channel.guild_id) return;
    if (channel.type !== 0 && channel.type !== 5) return;

    const guildId = channel.guild_id;
    const list = getLogGuildIds();
    const inList = list.includes(guildId);
    const modeAllow = settings.store.logGuildFilterModeAllow;

    const label = inList
        ? "شيل هذا السيرفر من فلتر اللوق"
        : "حط هذا السيرفر في فلتر اللوق";

    const sub = modeAllow
        ? "القائمة تعتبر Allowlist (بس اللي فيها يتسجل لهم لوق)"
        : "القائمة تعتبر Blocklist (اللي فيها ما يتسجل لهم لوق)";

    children.splice(
        -1,
        0,
        <Menu.MenuGroup label="RZ Logs">
            <Menu.MenuItem
                key="rz-log-filter-simple"
                id="rz-log-filter-simple"
                label={label}
                subtext={sub}
                action={() => {
                    let newList = getLogGuildIds();
                    if (inList) {
                        newList = newList.filter(id => id !== guildId);
                    } else {
                        newList.push(guildId);
                    }
                    setIdsKey("logGuildFilter", newList);
                    showRZMessage("تم تحديث فلتر اللوق لهذا السيرفر", "success");
                }}
            />
        </Menu.MenuGroup>
    );
};

/* ===================== Indicator ===================== */

function RZIndicator() {
    const followIds = getFollowIds();
    const pullIds = getPullListIds();
    const frozenIds = getFrozenIds();
    const blkCount = blacklist.length;
    const zahleqa = getZahleqaIds().length;

    if (
        !followIds.length &&
        !pullIds.length &&
        !frozenIds.length &&
        !blkCount &&
        !zahleqa
    )
        return null;

    const tooltip =
        `RZ Controls\n` +
        `Follow: ${followIds.length}\n` +
        `PullList: ${pullIds.length}\n` +
        `Frozen: ${frozenIds.length}\n` +
        `VC Blacklist: ${blkCount}\n` +
        `Zahleqa: ${zahleqa}`;

    return <HeaderBarIcon tooltip={tooltip} icon={RZIcon} />;
}

function addIconToToolBar(e: {
    toolbar?: React.ReactNode[];
    mobileToolbar?: React.ReactNode[];
}) {
    const node = (
        <ErrorBoundary noop={true} key="rz-alshareef-indicator">
            <RZIndicator />
        </ErrorBoundary>
    );

    if (Array.isArray(e.toolbar)) e.toolbar.push(node);
    else e.toolbar = [e.toolbar, node];
}

/* ===================== Flux ===================== */

let isHandlingAction = false;
let lastMoveTimestamp = 0;

async function addCooldown() {
    isHandlingAction = true;
    await new Promise(resolve =>
        setTimeout(resolve, settings.store.cooldown * 1000)
    );
    isHandlingAction = false;
}

const flux = {
    VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[] }) {
        if (!voiceStates || !voiceStates.length) return;

        const currentUserId = UserStore.getCurrentUser().id;
        const currentFollowId = getCurrentFollowId();
        const zahleqaIds = getZahleqaIds();

        for (const vs of voiceStates as any) {
            const { userId, channelId, oldChannelId, guildId, mute, deaf } = vs;
            if (channelId === oldChannelId) continue;

            const isMe = userId === currentUserId;

            // Auto Self Unmute (client mute/deaf)
            if (isMe && channelId && settings.store.autoSelfUnmute) {
                void RestAPI.patch({
                    url: `/users/@me/settings`,
                    body: { muted: false, deafened: false }
                }).catch(() => {});
            }

            // Auto server unmute/undeafen
            if (isMe && guildId && !isHandlingAction) {
                if (settings.store.autoUnmute && mute) {
                    void RestAPI.patch({
                        url: `/guilds/${guildId}/members/${userId}`,
                        body: { mute: false }
                    }).catch(() => {});
                    showRZMessage("انفك الميوت", "success");
                    void addCooldown();
                }
                if (settings.store.autoUndeafen && deaf) {
                    void RestAPI.patch({
                        url: `/guilds/${guildId}/members/${userId}`,
                        body: { deaf: false }
                    }).catch(() => {});
                    showRZMessage("انفك الدفن", "success");
                    void addCooldown();
                }
            }

            // Anti-Move / تثبيت ف الروم
            if (
                isMe &&
                settings.store.moveToPinned &&
                settings.store.pinnedChannelId &&
                channelId &&
                channelId !== settings.store.pinnedChannelId
            ) {
                ChannelActions.selectVoiceChannel(settings.store.pinnedChannelId);
                showRZMessage(
                    "اتوقع انك ان سحبت، رجعتك على الروم المثبّت",
                    "error"
                );
                continue;
            }

            // reconnect لو انقطعت من الروم المثبت
            if (
                isMe &&
                settings.store.reconnect &&
                settings.store.pinnedChannelId &&
                oldChannelId === settings.store.pinnedChannelId &&
                !channelId &&
                !isHandlingAction &&
                Date.now() - lastMoveTimestamp > 3000
            ) {
                lastMoveTimestamp = Date.now();
                ChannelActions.selectVoiceChannel(settings.store.pinnedChannelId);
                showRZMessage("تراك رجعت للروم المثبّت", "success");
                void addCooldown();
                continue;
            }

            // Logs
            if (channelId && !oldChannelId) {
                void logJoin(userId, channelId);
            } else if (!channelId && oldChannelId) {
                void logLeave(userId, oldChannelId);
            } else if (channelId && oldChannelId && channelId !== oldChannelId) {
                void logMove(userId, oldChannelId, channelId);
            }

            // لو كان عليه بلاك في روم وطلع منه
            if (channelId && oldChannelId && channelId !== oldChannelId) {
                const wasBlacklistedInOld = isBlacklisted(userId, oldChannelId);
                if (
                    wasBlacklistedInOld &&
                    !settings.store.keepBlacklistMuteOutsideChannel
                ) {
                    const gId = getGuildIdFromChannel(oldChannelId);
                    if (gId) {
                        void RestAPI.patch({
                            url: `/guilds/${gId}/members/${userId}`,
                            body: { mute: false, deaf: false }
                        }).catch(() => {});
                    }
                }
            }

            // VC Blacklist auto-kick
            if (
                channelId &&
                userId !== currentUserId &&
                isBlacklisted(userId, channelId)
            ) {
                const ch = ChannelStore.getChannel(channelId);
                if (ch && hasPermsBlacklist(channelId)) {
                    kickUserWithSettings(ch.guild_id!, userId, channelId);
                    continue;
                }
            }

            // زحلق الي بعدك (متعددة)
            if (
                channelId &&
                userId !== currentUserId &&
                oldChannelId !== channelId &&
                zahleqaIds.includes(channelId)
            ) {
                const baseChannel = ChannelStore.getChannel(channelId);
                if (baseChannel) {
                    const gId = baseChannel.guild_id;
                    const pool = getSlidePool(baseChannel);
                    const target = pickRandom(pool);
                    if (gId && target) {
                        void moveUserRaw(gId, userId, target.id);
                        continue;
                    }
                }
            }

            // Freeze
            const cuFrozen = controlled.find(
                c => c.userId === userId && c.mode === "frozen"
            );
            if (
                cuFrozen &&
                cuFrozen.originChannelId &&
                channelId &&
                channelId !== cuFrozen.originChannelId
            ) {
                void moveUserToChannel(
                    cuFrozen.guildId,
                    userId,
                    cuFrozen.originChannelId
                );
                continue;
            }

            // Follow logic
            const followIdSetting = settings.store.followUserId || currentFollowId;

            // autoMoveBack
            if (
                settings.store.autoMoveBack &&
                isMe &&
                followIdSetting &&
                oldChannelId &&
                channelId &&
                oldChannelId !== channelId
            ) {
                const states = VoiceStateStore.getAllVoiceStates();
                let followChannelId: string | null = null;

                for (const users of Object.values(states)) {
                    const v = (users as any)[followIdSetting];
                    if (v?.channelId) {
                        followChannelId = v.channelId;
                        break;
                    }
                }

                if (followChannelId && followChannelId !== channelId) {
                    const chan = ChannelStore.getChannel(followChannelId);
                    if (chan && PermissionStore.can(CONNECT, chan)) {
                        ChannelActions.selectVoiceChannel(followChannelId);
                        showRZMessage(
                            "رجعت لروم الفولو بعد ما حاولوا يحركونك",
                            "success"
                        );
                        continue;
                    }
                }
            }

            // followLeave
            if (
                settings.store.followLeave &&
                followIdSetting &&
                userId === followIdSetting &&
                oldChannelId &&
                !channelId
            ) {
                const myChanId = SelectedChannelStore.getVoiceChannelId();
                if (myChanId === oldChannelId) {
                    ChannelActions.disconnect();
                    showRZMessage("طلعت من الروم مع فولوك", "info");
                    continue;
                }
            }

            // auto-follow move
            if (
                followIdSetting &&
                userId === followIdSetting &&
                channelId &&
                !settings.store.onlyManualTrigger
            ) {
                const myChannelId = SelectedChannelStore.getVoiceChannelId();
                if (myChannelId !== channelId) {
                    const chan = ChannelStore.getChannel(channelId);
                    if (chan && PermissionStore.can(CONNECT, chan)) {
                        ChannelActions.selectVoiceChannel(channelId);
                        showRZMessage(
                            "لحقت الفولو يوزر إلى روم جديد",
                            "success"
                        );
                    }
                }
            }

            // Pull List auto-pull لما تتحرك أنت
            if (
                settings.store.autoPullListOnMove &&
                isMe &&
                channelId &&
                channelId !== oldChannelId
            ) {
                const gId = getGuildIdFromChannel(channelId);
                if (!gId) continue;
                const ids = getPullListIds().filter(id => !isBot(id));
                for (const id of ids) {
                    void moveUserToChannel(gId, id, channelId);
                }
            }

            if (isMe) {
                lastMoveTimestamp = Date.now();
            }
        }
    },

    CHANNEL_DELETE({ channel }: { channel: { id: string; type: number } }) {
        if (channel?.type === 2 && channel?.id) {
            blacklist = blacklist.filter(e => e.channelId !== channel.id);
            log("[VCBlacklist] Channel deleted, cleaned blacklist");
        }
        if (channel?.id) {
            removeZahleqaChannel(channel.id);
            log("[Zahleqa] removed deleted channel from list");
            if (settings.store.pinnedChannelId === channel.id) {
                settings.store.pinnedChannelId = "";
                log("[Pin] cleared pinnedChannelId because channel deleted");
            }
        }
    }
};

/* ===================== Hotkey Handler ===================== */

function handleHotkey(ev: KeyboardEvent) {
    const target = ev.target as HTMLElement | null;
    if (
        target &&
        (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
    ) {
        return;
    }

    // هوتكي: فك كل شيء عن نفسك (سيرفر + كلاينت)
    if (matchHotkey(ev, "Ctrl+Shift+U")) {
        const myId = UserStore.getCurrentUser().id;
        const states = VoiceStateStore.getAllVoiceStates();

        for (const [guildId, users] of Object.entries(states)) {
            const vs = users[myId];
            if (!vs) continue;
            void RestAPI.patch({
                url: `/guilds/${guildId}/members/${myId}`,
                body: { mute: false, deaf: false }
            }).catch(() => {});
        }

        void RestAPI.patch({
            url: `/users/@me/settings`,
            body: { muted: false, deafened: false }
        }).catch(() => {});

        showRZMessage("فكيت عنك كل الميوت/الدفن (سيرفر + كلاينت)", "success");
        ev.preventDefault();
        return;
    }

    // Pin toggle
    if (matchHotkey(ev, settings.store.hotkeyPinToggle)) {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (!myChannelId) return;
        const channel = ChannelStore.getChannel(myChannelId);
        if (!channel) return;

        const isPinned = settings.store.pinnedChannelId === channel.id;
        settings.store.pinnedChannelId = isPinned ? "" : channel.id;
        showRZMessage(
            settings.store.pinnedChannelId
                ? `حطيت التثبيت ف: ${channel.name}`
                : "وخرت التثبيت",
            "success"
        );
        ev.preventDefault();
        return;
    }

    // Pull all (سحب المسحوبين)
    if (matchHotkey(ev, settings.store.hotkeyPullAll)) {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        const myChannel = myChannelId
            ? ChannelStore.getChannel(myChannelId)
            : null;

        if (!myChannelId || !myChannel) {
            showRZMessage(
                "ادخل روم صوتي أول عشان أقدر أسحب المسحوبين لك",
                "info"
            );
            return;
        }

        const guildId = myChannel.guild_id;
        if (!guildId) {
            showRZMessage(
                "ما قدرت أجيب السيرفر حق رومك الحالي",
                "error"
            );
            return;
        }

        if (!PermissionStore.can(MOVE, myChannel)) {
            showRZMessage(
                "ما عندك صلاحية Move Members في رومك الحالي",
                "error"
            );
            return;
        }

        const ids = getPullListIds().filter(id => !isBot(id));
        if (!ids.length) {
            showRZMessage(
                "ما فيه أحد (غير بوتات) في قائمة السحب",
                "info"
            );
            return;
        }

        for (const id of ids) {
            void moveUserToChannel(guildId, id, myChannelId);
        }

        showRZMessage("تم سحب المسحوبين إلى رومك الحالي", "success");
        ev.preventDefault();
        return;
    }

    // Toggle Zahleqa على رومك الحالي
    if (matchHotkey(ev, settings.store.hotkeyToggleZahleqa)) {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (!myChannelId) return;
        const channel = ChannelStore.getChannel(myChannelId);
        if (!channel) return;

        const on = isZahleqaChannel(channel.id);
        if (on) {
            removeZahleqaChannel(channel.id);
            showRZMessage("تم شيل الزحلقه عن رومك الحالي", "info");
        } else {
            addZahleqaChannel(channel.id);
            showRZMessage("تم تفعيل الزحلقه على رومك الحالي", "success");
        }
        ev.preventDefault();
        return;
    }

    // Freeze all in channel
    if (matchHotkey(ev, settings.store.hotkeyFreezeAll)) {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (!myChannelId) return;

        const channel = ChannelStore.getChannel(myChannelId);
        if (!channel) return;

        const vs = VoiceStateStore.getVoiceStatesForChannel(myChannelId);
        const me = UserStore.getCurrentUser().id;

        const ids = Object.values(vs)
            .map(s => s.userId)
            .filter(id => id !== me && !isBot(id));

        if (!ids.length) {
            showRZMessage("ما فيه أحد (غير بوتات) تجمده غيرك", "info");
            return;
        }

        ids.forEach(id => {
            const fake = UserStore.getUser(id) || ({ id } as User);
            toggleFreezeUser(fake);
        });

        showRZMessage(`تم تفعيل التجميد على ${ids.length} عضو`, "success");
        ev.preventDefault();
        return;
    }

    // Mark all in channel as أبيّك
    if (matchHotkey(ev, settings.store.hotkeyPullAllMark)) {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (!myChannelId) return;

        const channel = ChannelStore.getChannel(myChannelId);
        if (!channel) return;

        const vs = VoiceStateStore.getVoiceStatesForChannel(myChannelId);
        const me = UserStore.getCurrentUser().id;

        const ids = Object.values(vs)
            .map(s => s.userId)
            .filter(id => id !== me && !isBot(id));

        if (!ids.length) {
            showRZMessage(
                "ما فيه أحد (غير بوتات) تضيفه لقائمة أبيّك",
                "info"
            );
            return;
        }

        ids.forEach(id => addToPullList(id));

        showRZMessage(`تم إضافة ${ids.length} عضو لقائمة أبيّك`, "success");
        ev.preventDefault();
        return;
    }

    // Follow all in channel
    if (matchHotkey(ev, settings.store.hotkeyFollowAll)) {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (!myChannelId) return;

        const vs = VoiceStateStore.getVoiceStatesForChannel(myChannelId);
        const me = UserStore.getCurrentUser().id;

        const ids = Object.values(vs)
            .map(s => s.userId)
            .filter(id => id !== me && !isBot(id));

        if (!ids.length) {
            showRZMessage("ما فيه أحد (غير بوتات) تسوي لهم فولو", "info");
            return;
        }

        ids.forEach(id => setFollow(id, true));

        showRZMessage(`تم إضافة ${ids.length} عضو لقائمة الفولو`, "success");
        ev.preventDefault();
        return;
    }

    // Clear everything
    if (matchHotkey(ev, settings.store.hotkeyClearAll)) {
        Alerts.show({
            title: "تأكيد مسح الكل",
            body:
                "راح يتم:\n" +
                "- مسح قائمة الفولو كاملة\n" +
                "- مسح قائمة أبيّك (Pull List)\n" +
                "- فك التجميد عن الكل\n" +
                "- مسح كل البلاك ليست الصوتية\n" +
                "- مسح كل رومات الزحلقه\n" +
                "- إلغاء تثبيت أي روم\n" +
                "- مسح إعداد رول السحب",
            confirmText: "مسح الكل",
            cancelText: "إلغاء",
            confirmColor: "red",
            onConfirm: () => {
                settings.store.followUserIds = "";
                settings.store.currentFollowId = "";
                settings.store.followUserId = "";

                settings.store.pullListUserIds = "";
                settings.store.frozenUserIds = "";
                controlled = [];

                blacklist = [];
                kickCache.clear();

                settings.store.zahleqaChannelIds = "";
                settings.store.pinnedChannelId = "";

                settings.store.pulledRoleId = "";
                settings.store.pulledRoleName = "";
                settings.store.pulledGuildName = "";

                showRZMessage("تم مسح كل شيء", "success");
            }
        });
        ev.preventDefault();
        return;
    }
}

/* ===================== Plugin Export ===================== */

export default definePlugin({
    name: "rz الشريف",
    description:
        "Follow / Pull / Freeze + Voice Blacklist + Voice Tools + زحلق متعددة + Logs + Anti-Move + Auto-Unmute/Undeafen + Pin Channel + Role-Puller + Hotkeys",
    authors: [Devs.rz30, Devs.D3SOX],
    settings,

    contextMenus: {
        "user-context": UserContext,
        "channel-context": (children, props: { channel: Channel }) => {
            const ch = props.channel;
            if (!ch) return;

            if (ch.type === 2 || ch.type === 13) {
                VoiceChannelContext(children, props as any);
            }

            if (ch.type === 0 || ch.type === 5) {
                TextChannelLogContext(children, props as any);
            }
        },
        "guild-role-context": (children, { role, guild }) => {
            children.splice(
                0,
                0,
                <Menu.MenuItem
                    label="تعيين كـ رول للسحب"
                    action={() => {
                        settings.store.pulledRoleId = role.id;
                        settings.store.pulledRoleName = role.name;
                        settings.store.pulledGuildName = guild.name;
                        showRZMessage(
                            `تم تعيين رول ${role.name} من ${guild.name} للسحب`,
                            "success"
                        );
                    }}
                />
            );
        }
    },

    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            }
        }
    ],

    start() {
        log("Plugin started");
        startMonitoring();
        window.addEventListener("keydown", handleHotkey);
    },

    stop() {
        log("Plugin stopped");
        controlled = [];
        stopMonitoring();
        blacklist = [];
        kickCache.clear();
        settings.store.zahleqaChannelIds = "";
        settings.store.pinnedChannelId = "";
        settings.store.pulledRoleId = "";
        settings.store.pulledRoleName = "";
        settings.store.pulledGuildName = "";
        window.removeEventListener("keydown", handleHotkey);
    },

    flux,
    addIconToToolBar
});
