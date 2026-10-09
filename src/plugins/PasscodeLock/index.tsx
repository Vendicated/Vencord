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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, createRoot, SelectedChannelStore, showToast, Toasts, useCallback, useEffect, useState } from "@webpack/common";
import type { Root } from "react-dom/client";

type HashData = { hash: string; salt: string; iterations: number; };
type SetMode = false | "new" | "confirm";

type Lang = "en" | "ru";

const STRINGS = {
    en: {
        hintNew: "New unlock code",
        hintConfirm: "Confirm unlock code",
        hintLocked: "Discord is locked",
        subSetup: "Digits only, no spaces",
        subUnlock: "Enter your passcode",
        wrongPassword: "Wrong password",
        codesMismatch: "Codes do not match",
        passSet: "Passcode set",
        setCodeFirst: "Set a passcode first (PasscodeLock settings)",
        voiceSkip: "In a voice call — lock skipped",
        cancel: "Cancel",
        about: "Protect Discord from shoulder surfing. Does not replace your OS lock.",
        btnSetPass: "Set / change passcode",
        btnLockNow: "Lock now",
    },
    ru: {
        hintNew: "Новый код разблокировки",
        hintConfirm: "Повторите код",
        hintLocked: "Discord заблокирован",
        subSetup: "Только цифры, без пробелов",
        subUnlock: "Введите код доступа",
        wrongPassword: "Неверный пароль",
        codesMismatch: "Коды не совпадают",
        passSet: "Код установлен",
        setCodeFirst: "Сначала задай код (настройки PasscodeLock)",
        voiceSkip: "Сейчас в голосовом звонке — блокировка пропущена",
        cancel: "Отмена",
        about: "Защита от случайного просмотра. Не заменяет блокировку Windows.",
        btnSetPass: "Задать / сменить код",
        btnLockNow: "Заблокировать сейчас",
    },
} as const;

type StringKey = keyof typeof STRINGS.en;

function t(key: StringKey, vars?: Record<string, string | number>) {
    const lang = (settings.store.uiLanguage as Lang) || "en";
    let s: string = STRINGS[lang]?.[key] ?? STRINGS.en[key];
    if (vars) {
        for (const [k, v] of Object.entries(vars)) {
            s = s.split(`{${k}}`).join(String(v));
        }
    }
    return s;
}

const settings = definePluginSettings({
    uiLanguage: {
        type: OptionType.SELECT,
        description: "Plugin UI language",
        options: [
            { label: "English", value: "en", default: true },
            { label: "Русский", value: "ru" },
        ],
    },
    codeLength: {
        type: OptionType.SELECT,
        description: "Passcode length",
        options: [
            { label: "4 digits", value: "4", default: true },
            { label: "6 digits", value: "6" },
        ],
    },
    autoLockMinutes: {
        type: OptionType.SELECT,
        description: "Auto-lock after window loses focus",
        options: [
            { label: "Off", value: "0", default: true },
            { label: "1 minute", value: "1" },
            { label: "5 minutes", value: "5" },
            { label: "15 minutes", value: "15" },
            { label: "60 minutes", value: "60" },
        ],
    },
    lockOnStartup: {
        type: OptionType.BOOLEAN,
        description: "Lock Discord on startup",
        default: true,
    },
    wasLocked: {
        type: OptionType.BOOLEAN,
        description: "Internal last lock state",
        default: false,
        hidden: true,
    },
    hash: {
        type: OptionType.STRING,
        description: "Internal hash",
        default: "",
        hidden: true,
    },
    salt: {
        type: OptionType.STRING,
        description: "Internal salt",
        default: "",
        hidden: true,
    },
    iterations: {
        type: OptionType.NUMBER,
        description: "Internal iterations",
        default: 4000,
        hidden: true,
    },
});

function buf2hex(buffer: ArrayBuffer | Uint8Array) {
    const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(pass: string, saltHex: string, iterations: number): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(h => parseInt(h, 16)));
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        keyMaterial,
        256
    );
    return buf2hex(bits);
}

async function hashPasscode(pass: string): Promise<HashData> {
    const salt = buf2hex(crypto.getRandomValues(new Uint8Array(16)));
    const iterations = 4000;
    const hash = await pbkdf2(pass, salt, iterations);
    return { hash, salt, iterations };
}

async function checkPasscode(pass: string, data: HashData): Promise<boolean> {
    if (!data.hash || !data.salt) return false;
    return (await pbkdf2(pass, data.salt, data.iterations || 4000)) === data.hash;
}

function hasPasscode() {
    return !!settings.store.hash;
}

function isInVoiceCall() {
    try {
        return !!SelectedChannelStore.getVoiceChannelId();
    } catch {
        return false;
    }
}

const lockState = {
    locked: false,
    setPassMode: false as SetMode,
    pendingNew: "",
    listeners: new Set<() => void>(),
};

function emit() {
    lockState.listeners.forEach(l => l());
}

function setLocked(v: boolean) {
    lockState.locked = v;
    settings.store.wasLocked = v;
    emit();
}

function openSetPasscode() {
    lockState.setPassMode = "new";
    lockState.pendingNew = "";
    lockState.locked = true;
    emit();
}

function lockNow(opts?: { silent?: boolean; }) {
    if (isInVoiceCall()) {
        if (!opts?.silent) {
            showToast(t("voiceSkip"), Toasts.Type.MESSAGE);
        }
        return;
    }
    if (!hasPasscode()) {
        showToast(t("setCodeFirst"), Toasts.Type.FAILURE);
        openSetPasscode();
        return;
    }
    setLocked(true);
}

function LockIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M7 11V8a5 5 0 0 1 10 0v3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
            <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="12" cy="16" r="1.4" fill="currentColor" />
        </svg>
    );
}

function LockOverlay() {
    settings.use(["uiLanguage"]);
    const [, bump] = useState(0);
    useEffect(() => {
        const fn = () => bump(x => x + 1);
        lockState.listeners.add(fn);
        return () => { lockState.listeners.delete(fn); };
    }, []);

    const [digits, setDigits] = useState("");
    const [shake, setShake] = useState(false);
    const [busy, setBusy] = useState(false);
    const [enterAnim, setEnterAnim] = useState(true);
    const [errorText, setErrorText] = useState("");
    const len = Number(settings.store.codeLength) || 4;
    const mode = lockState.setPassMode;

    useEffect(() => {
        const t = window.setTimeout(() => setEnterAnim(false), 480);
        return () => window.clearTimeout(t);
    }, []);

    const hint =
        mode === "new" ? t("hintNew") :
            mode === "confirm" ? t("hintConfirm") :
                t("hintLocked");

    const subhint = mode ? t("subSetup") : t("subUnlock");

    useEffect(() => {
        setDigits("");
        setBusy(false);
        setErrorText("");
    }, [mode, lockState.locked]);

    const failShake = (message = t("wrongPassword")) => {
        setDigits("");
        setErrorText(message);
        setShake(false);
        requestAnimationFrame(() => {
            setShake(true);
            window.setTimeout(() => setShake(false), 420);
        });
    };

    const submit = useCallback(async (value: string) => {
        if (busy) return;
        setBusy(true);
        try {
            if (mode === "new") {
                lockState.pendingNew = value;
                lockState.setPassMode = "confirm";
                setDigits("");
                emit();
                return;
            }
            if (mode === "confirm") {
                if (value !== lockState.pendingNew) {
                    failShake(t("codesMismatch"));
                    lockState.setPassMode = "new";
                    lockState.pendingNew = "";
                    emit();
                    return;
                }
                const hashed = await hashPasscode(value);
                settings.store.hash = hashed.hash;
                settings.store.salt = hashed.salt;
                settings.store.iterations = hashed.iterations;
                lockState.setPassMode = false;
                lockState.pendingNew = "";
                setLocked(false);
                showToast(t("passSet"), Toasts.Type.SUCCESS);
                return;
            }

            const ok = await checkPasscode(value, {
                hash: settings.store.hash,
                salt: settings.store.salt,
                iterations: settings.store.iterations || 4000,
            });
            if (ok) {
                setLocked(false);
                return;
            }

            failShake(t("wrongPassword"));
        } finally {
            setBusy(false);
        }
    }, [mode, busy]);

    const push = useCallback((d: string) => {
        if (busy) return;
        setErrorText("");
        setDigits(prev => {
            if (prev.length >= len) return prev;
            const next = prev + d;
            if (next.length === len) setTimeout(() => submit(next), 50);
            return next;
        });
    }, [len, submit, busy]);

    const backspace = useCallback(() => {
        if (busy) return;
        setDigits(prev => prev.slice(0, -1));
    }, [busy]);

    useEffect(() => {
        if (!lockState.locked) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key >= "0" && e.key <= "9") {
                e.preventDefault();
                e.stopPropagation();
                push(e.key);
            } else if (e.key === "Backspace") {
                e.preventDefault();
                backspace();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [lockState.locked, push, backspace, mode]);

    if (!lockState.locked) return null;

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

    return (
        <div id="vc-passcodelock-overlay" className="vc-pcl-root" onMouseDown={e => e.stopPropagation()}>
            <div className="vc-pcl-bg" />
            <div className="vc-pcl-orb vc-pcl-orb-a" />
            <div className="vc-pcl-orb vc-pcl-orb-b" />

            <div className={`vc-pcl-card${enterAnim ? " vc-pcl-enter" : ""}${shake ? " vc-pcl-shake" : ""}`}>
                <div className="vc-pcl-icon-wrap">
                    <LockIcon />
                </div>
                <div className="vc-pcl-title">{hint}</div>
                <div className="vc-pcl-sub">{subhint}</div>

                <div className="vc-pcl-dots">
                    {Array.from({ length: len }, (_, i) => (
                        <div
                            key={i}
                            className={`vc-pcl-dot${i < digits.length ? " vc-pcl-dot-on" : ""}${errorText && !digits.length ? " vc-pcl-dot-err" : ""}`}
                        />
                    ))}
                </div>

                <div className={`vc-pcl-error${errorText ? " vc-pcl-error-on" : ""}`} aria-live="polite">
                    {errorText || "\u00A0"}
                </div>

                <div className="vc-pcl-pad">
                    {keys.map((k, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`vc-pcl-key${k ? "" : " vc-pcl-key-empty"}${k === "⌫" ? " vc-pcl-key-back" : ""}`}
                            disabled={!k || busy}
                            onClick={() => k === "⌫" ? backspace() : k && push(k)}
                        >
                            {k === "⌫" ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M9.5 6H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.5a1 1 0 0 1-.8-.4l-4.5-5a1 1 0 0 1 0-1.2l4.5-5a1 1 0 0 1 .8-.4Z" stroke="currentColor" strokeWidth="1.6" />
                                    <path d="m13 10 4 4M17 10l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                </svg>
                            ) : k}
                        </button>
                    ))}
                </div>

                {!!mode && (
                    <button
                        type="button"
                        className="vc-pcl-cancel"
                        onClick={() => {
                            lockState.setPassMode = false;
                            lockState.pendingNew = "";
                            if (hasPasscode()) setLocked(false);
                            emit();
                        }}
                    >
                        {t("cancel")}
                    </button>
                )}
            </div>

            <style>{`
                .vc-pcl-root {
                    position: fixed;
                    inset: 0;
                    z-index: 100000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--font-display), var(--font-primary), Georgia, serif;
                    color: #f4f1ea;
                    user-select: none;
                    overflow: hidden;
                }
                .vc-pcl-bg {
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(120% 80% at 50% -10%, rgba(56, 78, 92, 0.55), transparent 55%),
                        linear-gradient(165deg, #12151a 0%, #1a2228 42%, #0e1013 100%);
                }
                .vc-pcl-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(60px);
                    opacity: 0.45;
                    pointer-events: none;
                    animation: vc-pcl-float 12s ease-in-out infinite;
                }
                .vc-pcl-orb-a {
                    width: 340px;
                    height: 340px;
                    left: 12%;
                    top: 18%;
                    background: #3d6b6a;
                }
                .vc-pcl-orb-b {
                    width: 280px;
                    height: 280px;
                    right: 10%;
                    bottom: 12%;
                    background: #8b5a3c;
                    animation-delay: -4s;
                }
                .vc-pcl-card {
                    position: relative;
                    width: min(360px, calc(100vw - 32px));
                    padding: 36px 28px 28px;
                    border-radius: 28px;
                    text-align: center;
                    background: linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
                    border: 1px solid rgba(255,255,255,0.14);
                    box-shadow:
                        0 30px 80px rgba(0,0,0,0.45),
                        inset 0 1px 0 rgba(255,255,255,0.12);
                    backdrop-filter: blur(28px) saturate(1.2);
                    -webkit-backdrop-filter: blur(28px) saturate(1.2);
                    will-change: transform;
                }
                .vc-pcl-card.vc-pcl-enter {
                    animation: vc-pcl-in 0.45s cubic-bezier(.2,.8,.2,1) both;
                }
                .vc-pcl-card.vc-pcl-shake {
                    animation: vc-pcl-shake 0.4s ease both;
                }
                .vc-pcl-icon-wrap {
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 18px;
                    display: grid;
                    place-items: center;
                    border-radius: 20px;
                    color: #e8dfd2;
                    background: linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
                    border: 1px solid rgba(255,255,255,0.12);
                }
                .vc-pcl-title {
                    font-size: 22px;
                    font-weight: 600;
                    letter-spacing: 0.01em;
                    margin-bottom: 6px;
                }
                .vc-pcl-sub {
                    font-family: var(--font-primary), system-ui, sans-serif;
                    font-size: 13px;
                    color: rgba(244,241,234,0.62);
                    margin-bottom: 26px;
                    line-height: 1.35;
                }
                .vc-pcl-dots {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 28px;
                }
                .vc-pcl-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(244,241,234,0.45);
                    background: transparent;
                    transition: transform .15s ease, background .15s ease, box-shadow .15s ease, border-color .15s ease;
                }
                .vc-pcl-dot-on {
                    background: #f4f1ea;
                    border-color: #f4f1ea;
                    box-shadow: 0 0 0 4px rgba(244,241,234,0.12);
                    transform: scale(1.08);
                }
                .vc-pcl-dot-err {
                    border-color: rgba(255, 140, 120, 0.85);
                    background: rgba(255, 100, 90, 0.25);
                }
                .vc-pcl-error {
                    font-family: var(--font-primary), system-ui, sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    min-height: 1.2em;
                    margin: -8px 0 18px;
                    color: transparent;
                    transition: color .15s ease;
                }
                .vc-pcl-error-on {
                    color: #ff8f7a;
                }
                .vc-pcl-pad {
                    display: grid;
                    grid-template-columns: repeat(3, 74px);
                    gap: 12px;
                    justify-content: center;
                }
                .vc-pcl-key {
                    width: 74px;
                    height: 74px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.10);
                    background: rgba(255,255,255,0.07);
                    color: #f4f1ea;
                    font-size: 26px;
                    font-family: var(--font-primary), system-ui, sans-serif;
                    font-weight: 500;
                    cursor: pointer;
                    display: grid;
                    place-items: center;
                    transition: background .12s ease, transform .08s ease, border-color .12s ease;
                }
                .vc-pcl-key:hover:not(:disabled):not(.vc-pcl-key-empty) {
                    background: rgba(255,255,255,0.14);
                    border-color: rgba(255,255,255,0.18);
                }
                .vc-pcl-key:active:not(:disabled):not(.vc-pcl-key-empty) {
                    transform: scale(0.94);
                    background: rgba(255,255,255,0.18);
                }
                .vc-pcl-key-empty {
                    visibility: hidden;
                    pointer-events: none;
                }
                .vc-pcl-key-back {
                    font-size: 0;
                }
                .vc-pcl-cancel {
                    margin-top: 22px;
                    background: transparent;
                    border: none;
                    color: rgba(244,241,234,0.55);
                    cursor: pointer;
                    font-size: 14px;
                    font-family: var(--font-primary), system-ui, sans-serif;
                    padding: 6px 12px;
                }
                .vc-pcl-cancel:hover {
                    color: rgba(244,241,234,0.9);
                }
                @keyframes vc-pcl-shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-11px); }
                    40%, 80% { transform: translateX(11px); }
                }
                @keyframes vc-pcl-in {
                    from { opacity: 0; transform: translateY(14px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes vc-pcl-float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(18px, -22px); }
                }
            `}</style>
        </div>
    );
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let blurTimer: number | null = null;
let detachAutolock: (() => void) | null = null;

function mountOverlay() {
    if (host) return;
    host = document.createElement("div");
    host.id = "vc-passcodelock-root";
    document.body.appendChild(host);
    root = createRoot(host);
    const rerender = () => root?.render(<LockOverlay />);
    lockState.listeners.add(rerender);
    root.render(<LockOverlay />);
}

function unmountOverlay() {
    try { root?.unmount(); } catch { }
    root = null;
    host?.remove();
    host = null;
}

function setupAutolock() {
    const onBlur = () => {
        const mins = Number(settings.store.autoLockMinutes) || 0;
        if (!mins || !hasPasscode()) return;
        if (blurTimer) window.clearTimeout(blurTimer);
        blurTimer = window.setTimeout(() => {
            if (!lockState.locked) lockNow({ silent: true });
        }, mins * 60 * 1000);
    };
    const onFocus = () => {
        if (blurTimer) {
            window.clearTimeout(blurTimer);
            blurTimer = null;
        }
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        if (blurTimer) window.clearTimeout(blurTimer);
    };
}

function SettingsAbout() {
    settings.use(["uiLanguage"]);
    return (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("about")}</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => openSetPasscode()}>{t("btnSetPass")}</Button>
                <Button color={Button.Colors.PRIMARY} look={Button.Looks.OUTLINED} onClick={() => lockNow()}>
                    {t("btnLockNow")}
                </Button>
            </div>
        </div>
    );
}

export default definePlugin({
    name: "PasscodeLock",
    description: "Lock Discord with a numeric passcode when you step away (inspired by BetterDiscord PasscodeLock)",
    authors: [Devs.johnny_pinkman],
    tags: ["Security", "Privacy"],
    settings,
    settingsAboutComponent: SettingsAbout,

    commands: [
        {
            name: "lock",
            description: "Lock Discord with PasscodeLock",
            execute() {
                lockNow();
            },
        },
    ],

    start() {
        mountOverlay();
        detachAutolock = setupAutolock();
        if (isInVoiceCall()) {
            // Don't lock over an active voice/video call
        } else if ((settings.store.lockOnStartup || settings.store.wasLocked) && hasPasscode()) {
            setLocked(true);
        } else if (!hasPasscode() && settings.store.lockOnStartup) {
            openSetPasscode();
        }
    },

    stop() {
        detachAutolock?.();
        detachAutolock = null;
        unmountOverlay();
    },
});
