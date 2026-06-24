/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, ChatBarButtonFactory, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, Modal, openModal, SelectedChannelStore, Toasts, useState } from "@webpack/common";
import { RenderModalProps } from "@vencord/discord-types";

interface ScheduledMessage {
    id: string;
    channelId: string;
    content: string;
    sendAt: number;
}

const scheduled: ScheduledMessage[] = [];
let interval: ReturnType<typeof setInterval> | null = null;

function startInterval() {
    if (interval) return;
    interval = setInterval(() => {
        const now = Date.now();
        for (let i = scheduled.length - 1; i >= 0; i--) {
            const msg = scheduled[i];
            if (now >= msg.sendAt) {
                try {
                    sendMessage(msg.channelId, { content: msg.content });
                    Toasts.show({
                        message: "Scheduled message sent!",
                        type: Toasts.Type.SUCCESS,
                        id: Toasts.genId(),
                    });
                } catch (e) {
                    console.error("[MessageScheduler] Failed to send:", e);
                }
                scheduled.splice(i, 1);
            }
        }
    }, 3000);
}

function stopInterval() {
    if (interval) { clearInterval(interval); interval = null; }
}

const settings = definePluginSettings({
    language: {
        type: OptionType.SELECT,
        description: "Plugin language",
        options: [
            { label: "English", value: "en", default: true },
            { label: "العربية", value: "ar" },
        ],
    },
});

const PRESETS = (ar: boolean) => [
    { label: ar ? "5 ثواني"  : "5 seconds",  ms: 5_000 },
    { label: ar ? "30 ثانية" : "30 seconds", ms: 30_000 },
    { label: ar ? "5 دقائق"  : "5 minutes",  ms: 5 * 60_000 },
    { label: ar ? "10 دقائق" : "10 minutes", ms: 10 * 60_000 },
    { label: ar ? "30 دقائق" : "30 minutes", ms: 30 * 60_000 },
    { label: ar ? "ساعة"     : "1 hour",     ms: 60 * 60_000 },
    { label: ar ? "ساعتين"   : "2 hours",    ms: 2 * 60 * 60_000 },
    { label: ar ? "يوم"      : "1 day",      ms: 24 * 60 * 60_000 },
    { label: ar ? "أسبوع"    : "1 week",     ms: 7 * 24 * 60 * 60_000 },
    { label: ar ? "شهر"      : "1 month",    ms: 30 * 24 * 60 * 60_000 },
    { label: ar ? "كاستم ⚙️" : "Custom ⚙️",  ms: -1 },
];

const UNITS = (ar: boolean) => [
    { label: ar ? "ثانية" : "Seconds", value: "seconds" as const },
    { label: ar ? "دقيقة" : "Minutes", value: "minutes" as const },
    { label: ar ? "ساعة"  : "Hours",   value: "hours"   as const },
    { label: ar ? "يوم"   : "Days",    value: "days"    as const },
    { label: ar ? "شهر"   : "Months",  value: "months"  as const },
];

function SchedulerModal(props: RenderModalProps & { channelId: string; }) {
    const { channelId, onClose } = props;
    const ar = settings.store.language === "ar";

    const [message, setMessage] = useState("");
    const [preset, setPreset]   = useState(PRESETS(ar)[0].ms);
    const [custom, setCustom]   = useState("");
    const [unit, setUnit]       = useState<"seconds" | "minutes" | "hours" | "days" | "months">("minutes");
    const [pending, setPending] = useState<ScheduledMessage[]>([...scheduled]);

    function getDelay(): number | null {
        if (preset !== -1) return preset;
        const n = parseFloat(custom);
        if (isNaN(n) || n <= 0) return null;
        const mult: Record<string, number> = {
            seconds: 1_000,
            minutes: 60_000,
            hours:   3_600_000,
            days:    86_400_000,
            months:  30 * 86_400_000,
        };
        return n * mult[unit];
    }

    function schedule() {
        if (!message.trim()) {
            Toasts.show({ message: ar ? "⚠️ اكتب الرسالة أولاً" : "⚠️ Write a message first", type: Toasts.Type.FAILURE, id: Toasts.genId() });
            return;
        }
        const delay = getDelay();
        if (!delay) {
            Toasts.show({ message: ar ? "⚠️ حدد وقت صحيح" : "⚠️ Enter a valid time", type: Toasts.Type.FAILURE, id: Toasts.genId() });
            return;
        }
        const msg: ScheduledMessage = {
            id: Math.random().toString(36).slice(2),
            channelId,
            content: message.trim(),
            sendAt: Date.now() + delay,
        };
        scheduled.push(msg);
        setPending([...scheduled]);
        setMessage("");
        const presets = PRESETS(ar);
        const label = presets.find(p => p.ms === preset)?.label ?? `${custom} ${UNITS(ar).find(u => u.value === unit)?.label}`;
        Toasts.show({ message: ar ? `⏰ مجدولة بعد ${label}` : `⏰ Scheduled in ${label}`, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
    }

    function cancel(id: string) {
        const i = scheduled.findIndex(m => m.id === id);
        if (i !== -1) scheduled.splice(i, 1);
        setPending([...scheduled]);
    }

    const presets = PRESETS(ar);

    return (
        <Modal
            {...props}
            title={ar ? "⏰ جدولة رسالة" : "⏰ Schedule Message"}
            actions={[{ text: ar ? "إغلاق" : "Close", variant: "secondary", onClick: onClose }]}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 0" }}>
                <div>
                    <Forms.FormTitle>{ar ? "📝 نص الرسالة" : "📝 Message"}</Forms.FormTitle>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.currentTarget.value)}
                        placeholder={ar ? "اكتب رسالتك هنا..." : "Type your message here..."}
                        rows={3}
                        style={{ width: "100%", background: "var(--background-secondary)", color: "var(--text-normal)", border: "1px solid var(--background-modifier-accent)", borderRadius: "8px", padding: "10px 12px", resize: "vertical", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                </div>

                <div>
                    <Forms.FormTitle>{ar ? "⏰ متى ترسل؟" : "⏰ When to send?"}</Forms.FormTitle>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                        {presets.map(p => (
                            <button key={p.ms} onClick={() => setPreset(p.ms)} style={{ padding: "5px 14px", borderRadius: "99px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: preset === p.ms ? 600 : 400, background: preset === p.ms ? "var(--brand-500)" : "var(--background-secondary)", color: preset === p.ms ? "#fff" : "var(--text-muted)", transition: "all .15s ease" }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {preset === -1 && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
                            <input type="number" value={custom} onChange={e => setCustom(e.currentTarget.value)} placeholder={ar ? "الكمية" : "Amount"} min="1" style={{ width: "90px", background: "var(--background-secondary)", color: "var(--text-normal)", border: "1px solid var(--background-modifier-accent)", borderRadius: "8px", padding: "7px 10px", fontSize: "14px" }} />
                            <select value={unit} onChange={e => setUnit(e.currentTarget.value as any)} style={{ background: "var(--background-secondary)", color: "var(--text-normal)", border: "1px solid var(--background-modifier-accent)", borderRadius: "8px", padding: "7px 10px", fontSize: "14px", cursor: "pointer" }}>
                                {UNITS(ar).map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <button onClick={schedule} style={{ background: "var(--brand-500)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer", width: "100%", transition: "opacity .15s ease" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    {ar ? "⏰ جدولة الرسالة" : "⏰ Schedule Message"}
                </button>

                {pending.length > 0 && (
                    <div>
                        <Forms.FormTitle>{ar ? `📋 المنتظرة (${pending.length})` : `📋 Pending (${pending.length})`}</Forms.FormTitle>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                            {pending.map(msg => (
                                <div key={msg.id} style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", border: "1px solid var(--brand-500, oklch(64% 0.19 258) / 0.2)" }}>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ fontSize: "13px", color: "var(--text-normal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.content}</div>
                                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                            🕐 {new Date(msg.sendAt).toLocaleString(ar ? "ar-SA" : "en-US")}
                                        </div>
                                    </div>
                                    <button onClick={() => cancel(msg.id)} style={{ background: "var(--status-danger, red)", opacity: 0.2, color: "var(--status-danger, red)", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", flexShrink: 0 }}>
                                        {ar ? "إلغاء" : "Cancel"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

const SchedulerIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;
    const channelId = SelectedChannelStore.getChannelId();
    const ar = settings.store.language === "ar";

    return (
        <ChatBarButton
            tooltip={ar ? "جدولة رسالة" : "Schedule Message"}
            onClick={() => channelId && openModal(props => <SchedulerModal {...props} channelId={channelId} />)}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "MessageScheduler",
    description: "Schedule messages to be sent at a later time",
    authors: [{ name: "hmood", id: 267110098252464131n }],
    dependencies: ["ChatInputButtonAPI"],
    settings,

    start() {
        startInterval();
        addChatBarButton("MessageScheduler", SchedulerIcon, () => (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
        ));
    },

    stop() {
        stopInterval();
        scheduled.length = 0;
        removeChatBarButton("MessageScheduler");
    },
});
