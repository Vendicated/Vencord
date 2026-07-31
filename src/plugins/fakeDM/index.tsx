import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import definePlugin from "@utils/types";
import { ChannelStore, FluxDispatcher, IconUtils, MessageStore, React, ReactDOM, SelectedChannelStore, UserStore } from "@webpack/common";

let _idCounter = 0;
function uniqueSnowflake(date: Date): string {
    const offset = _idCounter++ % 4096;
    const ms = Math.max(0, date.getTime() - 1420070400000);
    return ((BigInt(ms) << 22n) | BigInt(offset)).toString();
}

// ─── Random seconds helper ───────────────────────────────────────────────────
// Adds 1-59 random seconds so timestamps never land exactly on :00
function randomSeconds(date: Date): Date {
    const sec = 1 + Math.floor(Math.random() * 59);
    return new Date(date.getTime() + sec * 1000);
}

// ─── Persistence ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "vencord_fakedm_fakes";

interface PersistedMessage {
    type: "message";
    channelId: string;
    authorId: string;
    content: string;
    timestamp: string;
    snowflakeId: string;
}

interface PersistedCall {
    type: "call";
    channelId: string;
    callerId: string;
    otherId: string;
    missed: boolean;
    durationSec: number;
    timestamp: string;
    endedTimestamp: string | null;
    snowflakeId: string;
}

type PersistedFake = PersistedMessage | PersistedCall;

function loadPersisted(): PersistedFake[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function savePersisted(fakes: PersistedFake[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fakes)); } catch { }
}

function removePersisted(channelId: string, ids: Set<string>) {
    const fakes = loadPersisted().filter(f => !(f.channelId === channelId && ids.has(f.snowflakeId)));
    savePersisted(fakes);
}

// ─── Fake message ID storage ───────────────────────────────────────────────
const fakeIds = new Map<string, Set<string>>();

function registerFake(channelId: string, id: string) {
    if (!fakeIds.has(channelId)) fakeIds.set(channelId, new Set());
    fakeIds.get(channelId)!.add(id);
}

function clearFakes(channelId: string): number {
    const ids = fakeIds.get(channelId);
    if (!ids?.size) return 0;
    let n = 0;
    for (const id of ids) {
        FluxDispatcher.dispatch({ type: "MESSAGE_DELETE", channelId, id, mlDeleted: true });
        n++;
    }
    removePersisted(channelId, ids);
    ids.clear();
    return n;
}

// ─── Avatar URL ───────────────────────────────────────────────────────────────
function avatarUrl(user: any): string {
    if (!user) return "";
    return user.avatar ? IconUtils.getUserAvatarURL(user, false, 32) : IconUtils.getDefaultAvatarURL(user.id);
}

// ─── Channel helpers ─────────────────────────────────────────────────────────

/** Returns the current channel if it's a DM (type 1) or group DM (type 3), else null */
function getCurrentDMChannel(): any | null {
    try {
        const chId = SelectedChannelStore.getChannelId();
        if (!chId) return null;
        const ch = ChannelStore.getChannel(chId);
        if (!ch || (ch.type !== 1 && ch.type !== 3)) return null;
        return ch;
    } catch { return null; }
}

/** For a 1:1 DM (type 1), returns the other user. For groups, returns null (use getChannelMembers). */
function getOtherUser(): any | null {
    try {
        const ch = getCurrentDMChannel();
        if (!ch || ch.type !== 1) return null;
        const me = UserStore.getCurrentUser();
        const otherId = ch.recipients?.find((id: string) => id !== me?.id);
        return otherId ? (UserStore.getUser(otherId) ?? null) : null;
    } catch { return null; }
}

/** Returns all members of a DM or group DM channel (including self). */
function getChannelMembers(): any[] {
    try {
        const ch = getCurrentDMChannel();
        if (!ch) return [];
        const me = UserStore.getCurrentUser();
        const ids: string[] = ch.recipients ?? ch.rawRecipients?.map((r: any) => r.id) ?? [];
        const members: any[] = [];
        if (me) members.push(me);
        for (const id of ids) {
            if (id === me?.id) continue;
            const u = UserStore.getUser(id);
            if (u) members.push(u);
        }
        return members;
    } catch { return []; }
}

function buildAuthor(user: any) {
    return {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator ?? "0",
        avatar: user.avatar ?? null,
        public_flags: user.publicFlags ?? 0,
        flags: user.flags ?? 0,
        banner: user.banner ?? null,
        accent_color: null,
        global_name: user.globalName ?? user.username,
        avatar_decoration_data: user.avatarDecorationData
            ? { asset: user.avatarDecorationData.asset, sku_id: user.avatarDecorationData.skuId }
            : null,
        banner_color: null,
    };
}

function inject(channelId: string, author: any, content: string, date: Date, persistedId?: string) {
    const actualDate = persistedId ? date : randomSeconds(date);
    const id = persistedId ?? uniqueSnowflake(actualDate);
    FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE",
        channelId,
        message: {
            attachments: [], components: [], embeds: [], mention_roles: [], mentions: [],
            author: buildAuthor(author),
            channel_id: channelId,
            content,
            edited_timestamp: null,
            flags: 0,
            id,
            mention_everyone: false,
            nonce: id,
            pinned: false,
            timestamp: actualDate.toISOString(),
            tts: false,
            type: 0,
        },
        optimistic: false,
        isPushNotification: false,
    });
    registerFake(channelId, id);

    // Persist only new injections (not restores)
    if (!persistedId) {
        const fakes = loadPersisted();
        fakes.push({
            type: "message",
            channelId,
            authorId: author.id,
            content,
            timestamp: actualDate.toISOString(),
            snowflakeId: id,
        });
        savePersisted(fakes);
    }
}

function injectCall(
    channelId: string,
    caller: any,
    other: any,
    missed: boolean,
    durationSec: number,
    date: Date,
    persistedId?: string,
    persistedEndedTs?: string | null
) {
    const actualDate = persistedId ? date : randomSeconds(date);
    const id = persistedId ?? uniqueSnowflake(actualDate);
    const participants = missed ? [caller.id] : [caller.id, other.id];
    const endedDate = missed
        ? actualDate
        : (persistedEndedTs ? new Date(persistedEndedTs) : new Date(actualDate.getTime() + durationSec * 1000));

    FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE",
        channelId,
        message: {
            attachments: [], components: [], embeds: [], mention_roles: [], mentions: [],
            author: buildAuthor(caller),
            channel_id: channelId,
            content: "",
            edited_timestamp: null,
            flags: 0,
            id,
            mention_everyone: false,
            nonce: id,
            pinned: false,
            timestamp: actualDate.toISOString(),
            tts: false,
            type: 3, // CALL
            call: {
                participants,
                ended_timestamp: endedDate.toISOString(),
                duration: missed ? undefined : durationSec,
            },
        },
        optimistic: false,
        isPushNotification: false,
    });
    registerFake(channelId, id);

    if (!persistedId) {
        const fakes = loadPersisted();
        fakes.push({
            type: "call",
            channelId,
            callerId: caller.id,
            otherId: other.id,
            missed,
            durationSec,
            timestamp: actualDate.toISOString(),
            endedTimestamp: endedDate.toISOString(),
            snowflakeId: id,
        });
        savePersisted(fakes);
    }
}

// ─── Restore persisted fakes on startup ──────────────────────────────────────
let _restoreHandler: (() => void) | null = null;

function scheduleRestore() {
    _restoreHandler = () => {
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", _restoreHandler!);
        _restoreHandler = null;
        setTimeout(doRestore, 1200);
    };
    FluxDispatcher.subscribe("CONNECTION_OPEN", _restoreHandler);
}

function doRestoreForChannel(channelId: string) {
    const fakes = loadPersisted().filter(f => f.channelId === channelId);
    if (!fakes.length) return;

    for (const f of fakes) {
        if (MessageStore.getMessage(channelId, f.snowflakeId)) continue;

        if (f.type === "message") {
            const author = UserStore.getUser(f.authorId);
            if (!author) continue;
            inject(f.channelId, author, f.content, new Date(f.timestamp), f.snowflakeId);
        } else {
            const caller = UserStore.getUser(f.callerId);
            const other = UserStore.getUser(f.otherId);
            if (!caller || !other) continue;
            injectCall(
                f.channelId, caller, other,
                f.missed, f.durationSec,
                new Date(f.timestamp),
                f.snowflakeId,
                f.endedTimestamp
            );
        }
    }
}

function doRestore() {
    const channelId = SelectedChannelStore.getChannelId();
    if (channelId) doRestoreForChannel(channelId);
}

function handleLoadMessages(e: any) {
    if (e.channelId) setTimeout(() => doRestoreForChannel(e.channelId), 50);
}

function handleChannelSelect(e: any) {
    if (e.channelId) setTimeout(() => doRestoreForChannel(e.channelId), 400);
}

function toLocal(d: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function UserAvatar({ user }: { user: any; }) {
    const [err, setErr] = React.useState(false);
    if (!user) return null;
    const url = avatarUrl(user);
    if (err || !url) return <div className="fdm-sender-avatar fdm-sender-avatar--ph">{user.username?.[0]?.toUpperCase() ?? "?"}</div>;
    return <img src={url} className="fdm-sender-avatar" alt="" onError={() => setErr(true)} />;
}

function MemberSelect({ members, value, onChange, label }: { members: any[]; value: string; onChange(id: string): void; label?: string; }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px" }}>
            {label && <span className="fdm-date-label">{label}</span>}
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6, color: "#fff", fontSize: 13, padding: "4px 6px", cursor: "pointer",
                }}
            >
                {members.map(m => (
                    <option key={m.id} value={m.id} style={{ background: "#2b2d31" }}>
                        {m.globalName || m.username}
                    </option>
                ))}
            </select>
        </div>
    );
}

function FakeDMPanel({ onClose, btnRect }: { onClose(): void; btnRect: DOMRect; }) {
    const me = UserStore.getCurrentUser();
    const ch = getCurrentDMChannel();
    const channelId = SelectedChannelStore.getChannelId();
    const isGroup = ch?.type === 3;
    const other = getOtherUser(); // only set for 1:1 DMs
    const members = getChannelMembers(); // set for both 1:1 and group DMs
    const isInDMOrGroup = !!ch; // true for type 1 AND type 3

    // Mode: "message" | "call"
    const [mode, setMode] = React.useState<"message" | "call">("message");

    // Message mode state — for groups we use a member ID string; for 1:1 we keep "me"/"other"
    const [senderId, setSenderId] = React.useState<string>(() => me?.id ?? "");

    // Call mode state
    const [callerId, setCallerId] = React.useState<string>(() => me?.id ?? "");
    const [callReceiverId, setCallReceiverId] = React.useState<string>(() => {
        // Default "other" for calls = first non-me member
        return members.find(m => m.id !== me?.id)?.id ?? me?.id ?? "";
    });
    const [callMissed, setCallMissed] = React.useState(false);
    const [callDuration, setCallDuration] = React.useState("5");

    const [text, setText] = React.useState("");
    const [dateStr, setDateStr] = React.useState(() => toLocal(new Date()));
    const [status, setStatus] = React.useState<{ msg: string; ok: boolean; } | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);

    const [pos, setPos] = React.useState<React.CSSProperties>({ opacity: 0, position: "fixed", zIndex: 1000000, width: "430px" });

    React.useLayoutEffect(() => {
        const PW = 430, PH = 360, margin = 12;
        let left = btnRect.left + btnRect.width / 2 - PW / 2;
        let top = btnRect.top - PH - margin;
        left = Math.max(margin, Math.min(left, window.innerWidth - PW - margin));
        if (top < margin) top = btnRect.bottom + margin;
        setPos({ left: `${left}px`, top: `${top}px`, opacity: 1, position: "fixed", zIndex: 1000000, width: `${PW}px`, height: "auto", visibility: "visible", display: "flex", flexDirection: "column", pointerEvents: "auto" });
    }, [btnRect]);

    React.useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 80); }, []);
    React.useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", h, true);
        return () => document.removeEventListener("keydown", h, true);
    }, [onClose]);

    function setMsg(msg: string, ok: boolean) {
        setStatus({ msg, ok });
        setTimeout(() => setStatus(null), 2500);
    }

    function send() {
        if (!text.trim() || !channelId) return;
        const author = members.find(m => m.id === senderId) ?? me;
        if (!author) return;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) { setMsg("Invalid Date!", false); return; }
        inject(channelId, author, text.trim(), date);
        setText("");
        setMsg("Message injected ✓", true);
        setDateStr(toLocal(new Date(date.getTime() + 60_000)));
        setTimeout(() => textareaRef.current?.focus(), 10);
    }

    function sendCall() {
        if (!channelId) return;
        const callerUser = members.find(m => m.id === callerId);
        const receiverUser = members.find(m => m.id === callReceiverId);
        if (!callerUser || !receiverUser) return;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) { setMsg("Invalid Date!", false); return; }
        const durSec = callMissed ? 0 : Math.max(1, Math.round((parseFloat(callDuration) || 0) * 60));
        injectCall(channelId, callerUser, receiverUser, callMissed, durSec, date);
        setMsg(callMissed ? "Missed call injected ✓" : "Call injected ✓", true);
        setDateStr(toLocal(new Date(date.getTime() + 60_000)));
    }

    // For 1:1 DMs keep the simple two-button sender row; for groups use a select
    const meName = (me as any)?.globalName || me?.username || "Me";
    const otherName = other?.globalName || other?.username || "Other";

    const SenderRow = isGroup ? (
        <MemberSelect members={members} value={senderId} onChange={setSenderId} label="From :" />
    ) : (
        <div className="fdm-sender-row">
            <button className={`fdm-sender-btn${senderId === me?.id ? " fdm-sender-btn--active" : ""}`} onClick={() => setSenderId(me?.id ?? "")}>
                <UserAvatar user={me} /><span className="fdm-sender-name">{meName}</span>
            </button>
            <button className={`fdm-sender-btn${senderId !== me?.id ? " fdm-sender-btn--active" : ""}`} onClick={() => setSenderId(other?.id ?? "")}>
                <UserAvatar user={other} /><span className="fdm-sender-name">{otherName}</span>
            </button>
        </div>
    );

    const CallerRow = isGroup ? (
        <>
            <MemberSelect members={members} value={callerId} onChange={setCallerId} label="Caller :" />
            <MemberSelect members={members} value={callReceiverId} onChange={setCallReceiverId} label="Recvr :" />
        </>
    ) : (
        <div className="fdm-sender-row">
            <button className={`fdm-sender-btn${callerId === me?.id ? " fdm-sender-btn--active" : ""}`} onClick={() => { setCallerId(me?.id ?? ""); setCallReceiverId(other?.id ?? ""); }}>
                <UserAvatar user={me} /><span className="fdm-sender-name">{meName}</span>
            </button>
            <button className={`fdm-sender-btn${callerId !== me?.id ? " fdm-sender-btn--active" : ""}`} onClick={() => { setCallerId(other?.id ?? ""); setCallReceiverId(me?.id ?? ""); }}>
                <UserAvatar user={other} /><span className="fdm-sender-name">{otherName}</span>
            </button>
        </div>
    );

    return (
        <>
            <div className="fdm-backdrop" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999999, backgroundColor: "rgba(0,0,0,0.4)" }} />
            <div
                ref={panelRef}
                className="fdm-panel"
                style={{ ...pos, backgroundColor: "#2b2d31", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 16px 48px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)", overflow: "hidden" }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onMouseUp={e => e.stopPropagation()}
            >
                <div className="fdm-header">
                    <span className="fdm-title">{mode === "message" ? "✏ Fake DM" : "📞 Fake Call"}{isGroup ? " (Group)" : ""}</span>
                    <button className="fdm-close" onClick={onClose}>✕</button>
                </div>

                {/* Mode tabs */}
                <div style={{ display: "flex", gap: 6, padding: "0 12px 10px" }}>
                    <button onClick={() => setMode("message")} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: mode === "message" ? "#5865f2" : "rgba(255,255,255,0.07)", color: mode === "message" ? "#fff" : "rgba(255,255,255,0.5)" }}>💬 Message</button>
                    <button onClick={() => setMode("call")} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: mode === "call" ? "#5865f2" : "rgba(255,255,255,0.07)", color: mode === "call" ? "#fff" : "rgba(255,255,255,0.5)" }}>📞 Call</button>
                </div>

                {!isInDMOrGroup ? (
                    <div style={{ padding: "16px 14px", color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center" }}>Open a DM or group DM to use FakeDM.</div>
                ) : mode === "message" ? (
                    <>
                        {SenderRow}
                        <div className="fdm-date-row">
                            <span className="fdm-date-label">Date :</span>
                            <input type="datetime-local" className="fdm-date-input" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                            <button className="fdm-date-now" onClick={() => setDateStr(toLocal(new Date()))}>Now</button>
                        </div>
                        <div className="fdm-input-row">
                            <textarea
                                ref={textareaRef}
                                className="fdm-textarea"
                                rows={2}
                                placeholder={"Message… (↵ send)"}
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                            />
                            <div className="fdm-actions">
                                <button className="fdm-send-btn" disabled={!text.trim()} onClick={send}>Send</button>
                                <button className="fdm-clear-btn" onClick={() => {
                                    if (!channelId) return;
                                    const n = clearFakes(channelId);
                                    setMsg(`${n} msg${n !== 1 ? "s" : ""} deleted ✓`, true);
                                }}>🗑 Clear</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {CallerRow}

                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}>
                            <button onClick={() => setCallMissed(false)} style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: !callMissed ? "#3ba55c" : "rgba(255,255,255,0.07)", color: !callMissed ? "#fff" : "rgba(255,255,255,0.45)" }}>✅ Answered</button>
                            <button onClick={() => setCallMissed(true)} style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: callMissed ? "#ed4245" : "rgba(255,255,255,0.07)", color: callMissed ? "#fff" : "rgba(255,255,255,0.45)" }}>❌ Missed</button>
                            {!callMissed && (
                                <>
                                    <input type="number" min="0" step="1" className="fdm-date-input" style={{ width: 52, textAlign: "center", flexShrink: 0 }} value={callDuration} onChange={e => setCallDuration(e.target.value)} />
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>min</span>
                                </>
                            )}
                        </div>

                        <div className="fdm-date-row">
                            <span className="fdm-date-label">Date :</span>
                            <input type="datetime-local" className="fdm-date-input" value={dateStr} onChange={e => setDateStr(e.target.value)} />
                            <button className="fdm-date-now" onClick={() => setDateStr(toLocal(new Date()))}>Now</button>
                        </div>

                        <div style={{ display: "flex", gap: 6, padding: "6px 12px 4px" }}>
                            <button className="fdm-send-btn" style={{ flex: 1 }} onClick={sendCall}>Inject Call</button>
                            <button className="fdm-clear-btn" onClick={() => {
                                if (!channelId) return;
                                const n = clearFakes(channelId);
                                setMsg(`${n} msg${n !== 1 ? "s" : ""} deleted ✓`, true);
                            }}>🗑 Clear</button>
                        </div>
                    </>
                )}

                <div className={`fdm-status${status ? (status.ok ? " fdm-status--ok" : " fdm-status--err") : ""}`}>
                    {status?.msg ?? "\u00a0"}
                </div>
            </div>
        </>
    );
}

function FakeDMIcon({ height = 20, width = 20, className }: any) {
    return (
        <svg className={className} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={width} height={height} fill="none" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.35 7.24C15.9 6.67 16 5.8 16 5a3 3 0 1 1 3 3c-.8 0-1.67.09-2.24.65a1.5 1.5 0 0 0 0 2.11l.4.4.46.43c.25.25.12.66-.18.84A3 3 0 0 0 16 15v.5a.5.5 0 0 1-.5.5H15c-.43 0-.84.1-1.21.26a.56.56 0 0 1-.63-.1L6.91 9.91 4.3 12.54a1 1 0 0 0 0 1.42l2.17 2.17.83-.84a1 1 0 0 1 1.42 1.42l-.84.83.59.59 1.83-1.84a1 1 0 0 1 1.42 1.42l-1.84 1.83.17.17a1 1 0 0 0 1.42 0c.2-.2.6-.07.69.22a3 3 0 0 0 .56 1c.09.11.09.27-.02.36a3 3 0 0 1-4.06-.16l-5.76-5.76a3 3 0 0 1 0-4.24L6.9 7.09h.01l.97-.97a3 3 0 0 1 4.24 0l1.12 1.12a1.5 1.5 0 0 0 2.1 0Z" />
            <path fill="currentColor" d="M19 14a1 1 0 0 1 1 1v3h3a1 1 0 0 1 0 2h-3v3a1 1 0 0 1-2 0v-3h-3a1 1 0 1 1 0-2h3v-3a1 1 0 0 1 1-1Z" />
        </svg>
    );
}

// ─── Chat Bar Button ──────────────────────────────────────────────────────────
const FakeDMButton: ChatBarButtonFactory = (props: any) => {
    const { isMainChat } = props;
    const [btnRect, setBtnRect] = React.useState<DOMRect | null>(null);

    const ch = getCurrentDMChannel();
    if (!isMainChat && !ch) return null;

    function handleClick(e: React.MouseEvent) {
        if (btnRect) { setBtnRect(null); } else {
            const el = (e.currentTarget as HTMLElement).closest("button") ?? e.currentTarget as HTMLElement;
            setBtnRect(el.getBoundingClientRect());
        }
    }

    return (
        <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()} style={{ display: "contents" }}>
            <ChatBarButton tooltip="Fake DM, inject a fake message" onClick={handleClick}>
                <FakeDMIcon />
            </ChatBarButton>
            {btnRect && ReactDOM.createPortal(
                <FakeDMPanel onClose={() => setBtnRect(null)} btnRect={btnRect} />,
                document.body
            )}
        </div>
    );
};

export default definePlugin({
    name: "FakeDM",
    enabledByDefault: true,
    description: "Injects fake local messages into a DM or group DM. Button in the text bar. Persists across restarts.",
    authors: [{ name: "moat", id: 1058070604227559606 }],
    dependencies: ["ChatInputButtonAPI"],

    chatBarButton: {
        icon: FakeDMIcon,
        render: FakeDMButton,
    },

    start() {
        scheduleRestore();
        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessages);
        FluxDispatcher.subscribe("CHANNEL_SELECT", handleChannelSelect);
    },

    stop() {
        if (_restoreHandler) {
            FluxDispatcher.unsubscribe("CONNECTION_OPEN", _restoreHandler);
            _restoreHandler = null;
        }
        FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessages);
        FluxDispatcher.unsubscribe("CHANNEL_SELECT", handleChannelSelect);
        fakeIds.clear();
        _idCounter = 0;
    },
});