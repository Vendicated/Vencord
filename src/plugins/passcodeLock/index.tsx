import { definePluginSettings } from "@api/Settings";
import { React, useState, useEffect, Button, TextInput, Forms, showToast, Toasts, Modal, openModal } from "@webpack/common";
import type { RenderModalProps } from "@vencord/discord-types";
import definePlugin, { OptionType } from "@utils/types";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const PASSCODE_KEY = "PasscodeLock_Data";
const LOCKED_KEY = "PasscodeLock_Locked";
const RECOVERY_KEY = "PasscodeLock_Recovery";

function getStore(): Map<string, any> {
    if (!(window as any).__passcodeLockStore) {
        (window as any).__passcodeLockStore = new Map();
    }
    return (window as any).__passcodeLockStore;
}

function writeItem(key: string, value: any): void {
    getStore().set(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
}

function readItem<T>(key: string): T | undefined {
    const mem = getStore().get(key) as T | undefined;
    if (mem !== undefined) return mem;
    try {
        const raw = localStorage.getItem(key);
        if (raw) { const p = JSON.parse(raw); getStore().set(key, p); return p; }
    } catch { }
    return undefined;
}

function removeItem(key: string): void {
    getStore().delete(key);
    try { localStorage.removeItem(key); } catch { }
}

async function hashPasscode(passcode: string, salt: string): Promise<string> {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(passcode + salt));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateRecoveryKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const parts: string[] = [];
    for (let p = 0; p < 3; p++) {
        let s = "";
        for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
        parts.push(s);
    }
    return parts.join("-");
}

async function savePasscode(passcode: string, recoveryKey: string): Promise<void> {
    const salt = generateSalt();
    const hash = await hashPasscode(passcode, salt);
    writeItem(PASSCODE_KEY, { hash, salt });

    const recSalt = generateSalt();
    const recHash = await hashPasscode(recoveryKey, recSalt);
    writeItem(RECOVERY_KEY, { hash: recHash, salt: recSalt });
}

async function checkPasscode(passcode: string): Promise<boolean> {
    const d = readItem<{ hash: string; salt: string }>(PASSCODE_KEY);
    if (!d) return false;
    return (await hashPasscode(passcode, d.salt)) === d.hash;
}

async function checkRecoveryKey(key: string): Promise<boolean> {
    const d = readItem<{ hash: string; salt: string }>(RECOVERY_KEY);
    if (!d) return false;
    return (await hashPasscode(key, d.salt)) === d.hash;
}

function hasPasscode(): boolean { return !!readItem(PASSCODE_KEY); }
function hasRecoveryKey(): boolean { return !!readItem(RECOVERY_KEY); }
function clearPasscode(): void { removeItem(PASSCODE_KEY); removeItem(RECOVERY_KEY); }
function isLocked(): boolean { return !!readItem(LOCKED_KEY); }
function setLocked(v: boolean): void { v ? writeItem(LOCKED_KEY, true) : removeItem(LOCKED_KEY); }

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function SetPasscodeModal({ onSuccess, ...props }: { onSuccess: () => void } & RenderModalProps) {
    const [step, setStep] = useState<"passcode" | "saving" | "recovery">("passcode");
    const [pass, setPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [err, setErr] = useState("");
    const [key, setKey] = useState("");
    const [copied, setCopied] = useState(false);

    const handleSave = async () => {
        if (!pass) { setErr("Passcode cannot be empty"); return; }
        if (pass.length < 4) { setErr("Passcode must be at least 4 characters"); return; }
        if (pass !== confirm) { setErr("Passcodes do not match"); return; }
        setStep("saving");
        const recovery = generateRecoveryKey();
        await savePasscode(pass, recovery);
        setKey(recovery);
        setCopied(false);
        onSuccess();
        setStep("recovery");
    };

    if (step === "saving") {
        return <Modal {...props} title="Set Passcode" size="small">
            <div style={{ padding: 24, textAlign: "center" }}><Forms.FormText>Saving passcode...</Forms.FormText></div>
        </Modal>;
    }

    if (step === "recovery") {
        return <Modal {...props} title="Recovery Key" size="small">
            <div style={{ padding: "16px 0" }}>
                <Forms.FormText style={{ color: "var(--text-danger)", fontWeight: 600, marginBottom: 8 }}>
                    Save this key! It will NEVER be shown again.
                </Forms.FormText>
                <Forms.FormText style={{ marginBottom: 16 }}>
                    If you forget your passcode, use this to unlock Discord.
                </Forms.FormText>
                <div style={{ background: "var(--background-secondary)", borderRadius: 8, padding: "16px 20px", fontFamily: "monospace", fontSize: 18, letterSpacing: 2, textAlign: "center", color: "var(--text-normal)", marginBottom: 12, userSelect: "all" }}>
                    {key}
                </div>
                <Button onClick={() => { navigator.clipboard.writeText(key).catch(() => { }); setCopied(true); setTimeout(() => setCopied(false), 2000); }} color={Button.Colors.BRAND} size={Button.Sizes.SMALL}>
                    {copied ? "Copied!" : "Copy Key"}
                </Button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={props.onClose} color={Button.Colors.PRIMARY}>Done</Button>
            </div>
        </Modal>;
    }

    return <Modal {...props} title="Set Passcode" size="small">
        <div style={{ padding: "16px 0" }}>
            <Forms.FormTitle tag="h5">New Passcode</Forms.FormTitle>
            <TextInput type="password" value={pass} onChange={v => { setPass(v); setErr(""); }} placeholder="Enter passcode" minLength={4} />
            <div style={{ marginTop: 16 }}>
                <Forms.FormTitle tag="h5">Confirm Passcode</Forms.FormTitle>
                <TextInput type="password" value={confirm} onChange={v => { setConfirm(v); setErr(""); }} placeholder="Confirm passcode" />
            </div>
            {err && <Forms.FormText style={{ color: "var(--text-danger)", marginTop: 8 }}>{err}</Forms.FormText>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={handleSave} color={Button.Colors.BRAND}>Save Passcode</Button>
            <Button onClick={props.onClose} look={Button.Looks.LINK} color={Button.Colors.PRIMARY}>Cancel</Button>
        </div>
    </Modal>;
}

function SettingsPanel({ onLock }: { onLock: () => void }) {
    const [tick, setTick] = useState(0);
    const [locked, setLocked] = useState(() => isLocked());

    useEffect(() => {
        const iv = setInterval(() => {
            setTick(t => t + 1);
            setLocked(isLocked());
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    const hasCode = hasPasscode();

    return <div>
        <Forms.FormTitle tag="h3">Passcode Lock</Forms.FormTitle>
        <Forms.FormText style={{ marginBottom: 16, color: "var(--text-muted)" }}>
            {hasCode ? "Passcode is set. Press Ctrl+Shift+L to lock." : "No passcode set. Set one below."}
        </Forms.FormText>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {hasCode ? (
                <>
                    <Button onClick={() => openModal(p => <SetPasscodeModal {...p} onSuccess={() => setTick(t => t + 1)} />)} color={Button.Colors.BRAND}>Change Passcode</Button>
                    <Button onClick={async () => { await onLock(); setLocked(true); }} color={Button.Colors.BRAND} disabled={locked}>{locked ? "Locked" : "Lock Now"}</Button>
                    <Button onClick={() => { if (window.confirm("Remove passcode?")) { clearPasscode(); setTick(t => t + 1); setLocked(false); showToast("Passcode removed", Toasts.Type.SUCCESS); } }} color={Button.Colors.RED} look={Button.Looks.LINK}>Remove Passcode</Button>
                </>
            ) : (
                <Button onClick={() => openModal(p => <SetPasscodeModal {...p} onSuccess={() => setTick(t => t + 1)} />)} color={Button.Colors.BRAND}>Set Passcode</Button>
            )}
        </div>
    </div>;
}

// ---------------------------------------------------------------------------
// Lock screen
// ---------------------------------------------------------------------------

let overlay: HTMLDivElement | null = null;

function showLockScreen() {
    if (overlay) return;
    if (!document.getElementById("vpl-styles")) {
        const style = document.createElement("style");
        style.id = "vpl-styles";
        style.textContent = `
#vpl-overlay{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:2147483647!important;background:rgba(0,0,0,0.85)!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:16px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important}
#vpl-overlay *{pointer-events:inherit!important}
#vpl-inp{width:280px!important;padding:12px 16px!important;border-radius:8px!important;border:none!important;background:rgba(255,255,255,0.1)!important;color:#fff!important;font-size:20px!important;text-align:center!important;letter-spacing:6px!important;outline:2px solid transparent!important;transition:outline-color .15s!important;box-sizing:border-box!important;font-family:inherit!important;pointer-events:auto!important;cursor:text!important;position:relative;z-index:1}
#vpl-inp:focus{outline-color:#5865f2!important}
#vpl-inp::placeholder{color:rgba(255,255,255,0.3)!important}
#vpl-err{color:#ed4245!important;font-size:13px!important;min-height:18px!important;text-align:center!important}
#vpl-forgot{color:rgba(255,255,255,0.4)!important;font-size:12px!important;cursor:pointer!important;text-decoration:underline!important;margin-top:4px!important;pointer-events:auto!important}
#vpl-forgot:hover{color:rgba(255,255,255,0.7)!important}
#vpl-rec-inp{width:280px!important;padding:12px 16px!important;border-radius:8px!important;border:none!important;background:rgba(255,255,255,0.1)!important;color:#fff!important;font-size:16px!important;text-align:center!important;letter-spacing:2px!important;outline:2px solid transparent!important;transition:outline-color .15s!important;box-sizing:border-box!important;font-family:inherit!important;pointer-events:auto!important;cursor:text!important;position:relative;z-index:1}
#vpl-rec-inp:focus{outline-color:#5865f2!important}
#vpl-rec-btn{background:#5865f2!important;color:#fff!important;border:none!important;border-radius:4px!important;padding:8px 24px!important;font-size:14px!important;cursor:pointer!important;font-family:inherit!important;pointer-events:auto!important}
#vpl-rec-btn:hover{background:#4752c4!important}
#vpl-rec-back{background:transparent!important;color:rgba(255,255,255,0.6)!important;border:none!important;font-size:13px!important;cursor:pointer!important;text-decoration:underline!important;font-family:inherit!important;pointer-events:auto!important}
#vpl-rec-back:hover{color:#fff!important}
`;
        document.head.appendChild(style);
    }

    overlay = document.createElement("div");
    overlay.innerHTML = `<div id="vpl-overlay">
<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(255,255,255,0.5);flex-shrink:0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
<h1 style="color:#fff;font-size:24px;font-weight:700;margin:0;text-align:center">Discord Locked</h1>
<p id="vpl-sub" style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 8px 0;text-align:center">Enter your passcode</p>
<input type="password" id="vpl-inp" autocomplete="off" placeholder="······" style="width:280px;padding:12px 16px;border-radius:8px;border:none;background:rgba(255,255,255,0.1);color:#fff;font-size:20px;text-align:center;letter-spacing:6px;outline:2px solid transparent;box-sizing:border-box;font-family:inherit;pointer-events:auto;cursor:text">
<div id="vpl-err" style="color:#ed4245;font-size:13px;min-height:18px;text-align:center"></div>
<div id="vpl-forgot" style="color:rgba(255,255,255,0.4);font-size:12px;cursor:pointer;text-decoration:underline;margin-top:4px;pointer-events:auto">Forgot passcode?</div>
<div id="vpl-rec" style="display:none;flex-direction:column;align-items:center;gap:8px">
<input type="text" id="vpl-rec-inp" autocomplete="off" placeholder="XXXX-XXXX-XXXX" style="width:280px;padding:12px 16px;border-radius:8px;border:none;background:rgba(255,255,255,0.1);color:#fff;font-size:16px;text-align:center;letter-spacing:2px;text-transform:uppercase;outline:2px solid transparent;box-sizing:border-box;font-family:inherit;pointer-events:auto;cursor:text">
<button id="vpl-rec-btn" style="background:#5865f2;color:#fff;border:none;border-radius:4px;padding:8px 24px;font-size:14px;cursor:pointer;font-family:inherit;pointer-events:auto">Recover</button>
<button id="vpl-rec-back" style="background:transparent;color:rgba(255,255,255,0.6);border:none;font-size:13px;cursor:pointer;text-decoration:underline;font-family:inherit;pointer-events:auto">Back</button>
</div></div>`;
    document.body.appendChild(overlay);

    const inp = document.getElementById("vpl-inp") as HTMLInputElement;
    const err = document.getElementById("vpl-err")!;
    const forgot = document.getElementById("vpl-forgot")!;
    const rec = document.getElementById("vpl-rec")!;
    const recInp = document.getElementById("vpl-rec-inp") as HTMLInputElement;
    const recBtn = document.getElementById("vpl-rec-btn")!;
    const backBtn = document.getElementById("vpl-rec-back")!;
    const sub = document.getElementById("vpl-sub")!;

    if (!hasRecoveryKey()) forgot.style.display = "none";

    setTimeout(() => inp?.focus(), 100);

    function showRec() { inp.style.display = "none"; forgot.style.display = "none"; err.textContent = ""; rec.style.display = "flex"; sub.textContent = "Enter recovery key"; setTimeout(() => recInp?.focus(), 100); }
    function showPass() { inp.style.display = ""; forgot.style.display = hasRecoveryKey() ? "" : "none"; rec.style.display = "none"; err.textContent = ""; sub.textContent = "Enter your passcode"; setTimeout(() => inp?.focus(), 100); }

    forgot.addEventListener("click", showRec);
    backBtn.addEventListener("click", showPass);

    const tryRec = async () => {
        const k = recInp.value.trim().toUpperCase();
        if (!k) return;
        if (await checkRecoveryKey(k)) {
            clearPasscode();
            hideLockScreen();
            showToast("Recovery OK! Set a new passcode in settings.", Toasts.Type.SUCCESS);
        } else {
            err.textContent = "Invalid key";
            recInp.value = ""; recInp.focus();
        }
    };

    recBtn.addEventListener("click", tryRec);

    const onKey = async (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            if (rec.style.display === "flex") { tryRec(); return; }
            if (await checkPasscode(inp.value)) { hideLockScreen(); }
            else { err.textContent = "Wrong passcode"; inp.value = ""; inp.focus(); }
        }
        if (e.key === "Escape") e.preventDefault();
    };

    const onRecKey = (e: KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); tryRec(); }
        if (e.key === "Escape") { e.preventDefault(); showPass(); }
    };

    inp?.addEventListener("keydown", onKey);
    recInp?.addEventListener("keydown", onRecKey);
    (overlay as any)._cleanup = () => { inp?.removeEventListener("keydown", onKey); recInp?.removeEventListener("keydown", onRecKey); };
}

function hideLockScreen() {
    if (overlay) { (overlay as any)._cleanup?.(); overlay.remove(); overlay = null; }
    setLocked(false);
}

async function lock() {
    if (overlay) return;
    if (!hasPasscode()) { showToast("Set a passcode first", Toasts.Type.FAILURE); return; }
    setLocked(true);
    showLockScreen();
}

// ---------------------------------------------------------------------------
// Idle detection
// ---------------------------------------------------------------------------

let idleTimer: number | null = null;
let lastActivity = Date.now();
let idleListeners: (() => void)[] = [];

function resetIdleTimer() { lastActivity = Date.now(); }

function startIdleDetection() {
    stopIdleDetection();
    const min = settings.store.autoLockMinutes;
    if (!min || min <= 0) return;
    const events = ["mousedown", "keydown", "touchstart", "mousemove", "wheel"];
    for (const e of events) document.addEventListener(e, resetIdleTimer);
    idleListeners = events.map(e => () => document.removeEventListener(e, resetIdleTimer));
    idleTimer = window.setInterval(async () => {
        if (overlay) return;
        if (Date.now() - lastActivity >= min * 60000) await lock();
    }, 5000);
}

function stopIdleDetection() {
    if (idleTimer !== null) { clearInterval(idleTimer); idleTimer = null; }
    for (const r of idleListeners) r();
    idleListeners = [];
}

const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === "L") { e.preventDefault(); lock(); }
};

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const settings = definePluginSettings({
    autoLockMinutes: {
        type: OptionType.SELECT,
        description: "Auto-lock after inactivity",
        options: [
            { label: "Off", value: 0, default: true },
            { label: "1 minute", value: 1 },
            { label: "5 minutes", value: 5 },
            { label: "15 minutes", value: 15 },
            { label: "30 minutes", value: 30 },
        ],
    },
});

export default definePlugin({
    name: "PasscodeLock",
    description: "Lock Discord with a passcode. Press Ctrl+Shift+L to lock.",
    authors: [{ name: "iiCanaanDev", id: 0n }],
    tags: ["Security", "Privacy"],
    settings,
    settingsAboutComponent: () => <SettingsPanel onLock={lock} />,

    toolboxActions: { "Lock Discord": lock },

    start() {
        if (isLocked()) showLockScreen();
        startIdleDetection();
        document.addEventListener("keydown", onKeyDown);
    },

    stop() {
        hideLockScreen();
        stopIdleDetection();
        document.removeEventListener("keydown", onKeyDown);
    },
});
