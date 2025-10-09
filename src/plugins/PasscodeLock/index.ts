/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

// Importações do Vencord para APIs necessárias
const { getCurrentUser } = findByPropsLazy("getCurrentUser");
const { getVoiceChannelId } = findByPropsLazy("getVoiceChannelId");
const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel");

// Sistema de Localização
class Locale {
    static currentLanguage = "pt-BR";

    static translations = {
        "pt-BR": {
            "plugin.name": "PasscodeLock",
            "plugin.description": "Proteja seu Discord com uma senha personalizada",
            "settings.enabled": "Habilitado",
            "settings.password": "Senha",
            "settings.passwordType": "Tipo de Senha",
            "settings.language": "Idioma",
            "settings.autoLock": "Bloqueio Automático",
            "settings.enableKeyboardShortcut": "Atalho de Teclado (Ctrl+L)",
            "settings.usePasswordHashing": "Hash de Senha",
            "settings.protectVoiceChannels": "Proteger Canais de Voz",
            "settings.requirePasswordOnStart": "Exigir Senha na Inicialização",
            "settings.disableAutoUnlock": "Desabilitar Desbloqueio Automático",
            "settings.maxAttempts": "Máximo de Tentativas",
            "settings.cooldownBaseTime": "Tempo Base de Cooldown (segundos)",
            "lock.title": "Digite sua senha do Discord",
            "lock.biometric": "Toque para desbloquear com biometria",
            "lock.error": "Senha incorreta!",
            "lock.cooldown": "Muitas tentativas incorretas. Tente novamente em {time} segundos.",
            "lock.attempts": "Tentativas restantes: {attempts}",
            "roadmap.title": "🚀 ROADMAP - Próximas Funcionalidades",
            "roadmap.features": [
                "🔒 Atalho Personalizado - Configure seu próprio atalho de teclado",
                "👆 Autenticação Biométrica - Desbloqueie com impressão digital ou Face ID",
                "⌨️ Destacar Teclas - Visualize as teclas pressionadas",
                "🔔 Modo de Notificações - Configure como receber notificações",
                "🎨 Temas Personalizados - Múltiplos temas para a tela de bloqueio",
                "⏰ Bloqueio Automático por Inatividade - Configure tempo personalizado"
            ]
        },
        "en-US": {
            "plugin.name": "PasscodeLock",
            "plugin.description": "Protect your Discord with a custom password",
            "settings.enabled": "Enabled",
            "settings.password": "Password",
            "settings.passwordType": "Password Type",
            "settings.language": "Language",
            "settings.autoLock": "Auto Lock",
            "settings.enableKeyboardShortcut": "Keyboard Shortcut (Ctrl+L)",
            "settings.usePasswordHashing": "Password Hashing",
            "settings.protectVoiceChannels": "Protect Voice Channels",
            "settings.requirePasswordOnStart": "Require Password on Start",
            "settings.disableAutoUnlock": "Disable Auto Unlock",
            "settings.maxAttempts": "Max Attempts",
            "settings.cooldownBaseTime": "Base Cooldown Time (seconds)",
            "lock.title": "Enter your Discord password",
            "lock.biometric": "Tap to unlock with biometrics",
            "lock.error": "Incorrect password!",
            "lock.cooldown": "Too many incorrect attempts. Try again in {time} seconds.",
            "lock.attempts": "Attempts remaining: {attempts}",
            "roadmap.title": "🚀 ROADMAP - Upcoming Features",
            "roadmap.features": [
                "🔒 Custom Shortcut - Configure your own keyboard shortcut",
                "👆 Biometric Authentication - Unlock with fingerprint or Face ID",
                "⌨️ Highlight Keys - Visualize pressed keys",
                "🔔 Notification Mode - Configure how to receive notifications",
                "🎨 Custom Themes - Multiple themes for the lock screen",
                "⏰ Auto Lock by Inactivity - Configure custom time"
            ]
        },
        "es-ES": {
            "plugin.name": "PasscodeLock",
            "plugin.description": "Protege tu Discord con una contraseña personalizada",
            "settings.enabled": "Habilitado",
            "settings.password": "Contraseña",
            "settings.passwordType": "Tipo de Contraseña",
            "settings.language": "Idioma",
            "settings.autoLock": "Bloqueo Automático",
            "settings.enableKeyboardShortcut": "Atajo de Teclado (Ctrl+L)",
            "settings.usePasswordHashing": "Hash de Contraseña",
            "settings.protectVoiceChannels": "Proteger Canales de Voz",
            "settings.requirePasswordOnStart": "Requerir Contraseña al Iniciar",
            "settings.disableAutoUnlock": "Deshabilitar Desbloqueo Automático",
            "settings.maxAttempts": "Máximo de Intentos",
            "settings.cooldownBaseTime": "Tiempo Base de Cooldown (segundos)",
            "lock.title": "Ingresa tu contraseña de Discord",
            "lock.biometric": "Toca para desbloquear con biometría",
            "lock.error": "¡Contraseña incorrecta!",
            "lock.cooldown": "Demasiados intentos incorrectos. Intenta de nuevo en {time} segundos.",
            "lock.attempts": "Intentos restantes: {attempts}",
            "roadmap.title": "🚀 ROADMAP - Próximas Funcionalidades",
            "roadmap.features": [
                "🔒 Atajo Personalizado - Configura tu propio atajo de teclado",
                "👆 Autenticación Biométrica - Desbloquea con huella dactilar o Face ID",
                "⌨️ Resaltar Teclas - Visualiza las teclas presionadas",
                "🔔 Modo de Notificaciones - Configura cómo recibir notificaciones",
                "🎨 Temas Personalizados - Múltiples temas para la pantalla de bloqueo",
                "⏰ Bloqueo Automático por Inactividad - Configura tiempo personalizado"
            ]
        }
    };

    static setLanguage(language: string) {
        this.currentLanguage = language;
    }

    static getLanguage() {
        return this.currentLanguage;
    }

    static t(key: string, params?: Record<string, string | number>): string {
        const translation = this.translations[this.currentLanguage]?.[key] ||
                          this.translations["pt-BR"][key] ||
                          key;

        if (params) {
            return translation.replace(/\{(\w+)\}/g, (match, param) =>
                params[param]?.toString() || match
            );
        }

        return translation;
    }

    static getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    static getLanguageName(code: string) {
        const names = {
            "pt-BR": "Português (Brasil)",
            "en-US": "English (United States)",
            "es-ES": "Español (España)"
        };
        return names[code] || code;
    }
}

// Sistema de Hash de Senha
class PasswordHasher {
    static async hashPassword(password: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const salt = crypto.getRandomValues(new Uint8Array(16));

        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            data,
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            256
        );

        const hashArray = new Uint8Array(derivedBits);
        const saltArray = new Uint8Array(salt);
        const combined = new Uint8Array(saltArray.length + hashArray.length);
        combined.set(saltArray);
        combined.set(hashArray, saltArray.length);

        return btoa(String.fromCharCode(...combined));
    }

    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        try {
            const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
            const salt = combined.slice(0, 16);
            const storedHash = combined.slice(16);

            const encoder = new TextEncoder();
            const data = encoder.encode(password);

            const keyMaterial = await crypto.subtle.importKey(
                "raw",
                data,
                { name: "PBKDF2" },
                false,
                ["deriveBits"]
            );

            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt: salt,
                    iterations: 100000,
                    hash: "SHA-256"
                },
                keyMaterial,
                256
            );

            const hashArray = new Uint8Array(derivedBits);

            return hashArray.every((byte, index) => byte === storedHash[index]);
        } catch (error) {
            return false;
        }
    }
}

// Configurações do Plugin
const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: Locale.t("settings.enabled"),
        default: true,
    },
    password: {
        type: OptionType.STRING,
        description: Locale.t("settings.password"),
        default: "",
    },
    passwordType: {
        type: OptionType.SELECT,
        description: Locale.t("settings.passwordType"),
        options: [
            { label: "4 dígitos", value: 4 },
            { label: "5 dígitos", value: 5 },
            { label: "6 dígitos", value: 6 },
            { label: "7 dígitos", value: 7 },
            { label: "8 dígitos", value: 8 }
        ],
        default: 6,
    },
    language: {
        type: OptionType.SELECT,
        description: Locale.t("settings.language"),
        options: [
            { label: Locale.getLanguageName("pt-BR"), value: "pt-BR" },
            { label: Locale.getLanguageName("en-US"), value: "en-US" },
            { label: Locale.getLanguageName("es-ES"), value: "es-ES" }
        ],
        default: "pt-BR",
    },
    autoLock: {
        type: OptionType.BOOLEAN,
        description: Locale.t("settings.autoLock"),
        default: true,
    },
    enableKeyboardShortcut: {
        type: OptionType.BOOLEAN,
        description: Locale.t("settings.enableKeyboardShortcut"),
        default: true,
    },
    usePasswordHashing: {
        type: OptionType.BOOLEAN,
        description: Locale.t("settings.usePasswordHashing"),
        default: true,
    },
    hashedPassword: {
        type: OptionType.STRING,
        description: "Hash da senha (gerado automaticamente)",
        default: "",
    },
    protectVoiceChannels: {
        type: OptionType.BOOLEAN,
        description: Locale.t("settings.protectVoiceChannels"),
        default: true,
    },
    requirePasswordOnStart: {
        type: OptionType.BOOLEAN,
        description: Locale.t("settings.requirePasswordOnStart"),
        default: false,
    },
    disableAutoUnlock: {
        type: OptionType.BOOLEAN,
        description: Locale.t("settings.disableAutoUnlock"),
        default: false,
    },
    maxAttempts: {
        type: OptionType.NUMBER,
        description: Locale.t("settings.maxAttempts"),
        default: 3,
    },
    cooldownBaseTime: {
        type: OptionType.NUMBER,
        description: Locale.t("settings.cooldownBaseTime"),
        default: 30,
    },
    roadmapInfo: {
        type: OptionType.COMPONENT,
        description: Locale.t("roadmap.title"),
        component: () => React.createElement("div", {
            style: {
                padding: "16px",
                backgroundColor: "var(--background-secondary)",
                borderRadius: "8px",
                marginTop: "16px"
            }
        }, [
            React.createElement("h3", {
                key: "title",
                style: { margin: "0 0 12px 0", color: "var(--text-normal)" }
            }, Locale.t("roadmap.title")),
            React.createElement("ul", {
                key: "features",
                style: { margin: 0, paddingLeft: "20px" }
            }, (Locale.t("roadmap.features") as unknown as string[]).map((feature: string, index: number) =>
                React.createElement("li", {
                    key: index,
                    style: {
                        marginBottom: "8px",
                        color: "var(--text-muted)",
                        fontSize: "14px"
                    }
                }, feature)
            ))
        ])
    }
});

// Plugin Principal
export default definePlugin({
    name: "PasscodeLock",
    description: "Proteja seu Discord com uma senha personalizada",
    authors: [Devs.NyxisStudio],
    settings,
    patches: [],

    start() {
        // Inicializar idioma
        Locale.setLanguage(this.settings.store.language || "pt-BR");

        // Inicializar hash de senha se necessário
        this.initializePasswordHashing();

        // Configurar watcher de configurações
        this.setupSettingsWatcher();

        // Configurar event listeners
        this.setupEventListeners();

        // Mostrar tela de bloqueio se necessário
        if (this.settings.store.requirePasswordOnStart) {
            this.initializeLock();
        }
    },

    stop() {
        this.removeEventListeners();
        this.removeSettingsWatcher();
        this.hideLockScreen();
        this.hideCooldownScreen();
    },

    // Estado do plugin
    isLocked: false,
    currentPassword: "",
    attempts: 0,
    lockoutUntil: null as number | null,
    cooldownLevel: 0,
    cooldownMultiplier: 1,
    errorMessage: "",
    showError: false,
    lastActivity: Date.now(),
    activityHandler: null as (() => void) | null,
    inactivityInterval: null as number | null,
    keyboardHandler: null as ((e: KeyboardEvent) => void) | null,
    cooldownScreen: null as HTMLDivElement | null,
    cooldownInterval: null as number | null,
    settingsWatcher: null as number | null,
    lastPasswordHash: "",

    async initializePasswordHashing() {
        if (this.settings.store.usePasswordHashing && this.settings.store.password && !this.settings.store.hashedPassword) {
            this.settings.store.hashedPassword = await PasswordHasher.hashPassword(this.settings.store.password);
        }
    },

    setupSettingsWatcher() {
        this.lastPasswordHash = this.settings.store.hashedPassword;

        this.settingsWatcher = setInterval(() => {
            // Verificar mudanças na senha
            if (this.settings.store.password !== this.currentPassword) {
                this.updatePasswordDisplay();
                this.recalculatePasswordHash();
            }

            // Verificar mudanças no idioma
            if (this.settings.store.language !== Locale.getLanguage()) {
                Locale.setLanguage(this.settings.store.language || "pt-BR");
                this.updateInterfaceTexts();
            }

            // Verificar mudanças no hash de senha
            if (this.settings.store.usePasswordHashing !== (this.lastPasswordHash !== "")) {
                this.initializePasswordHashing();
            }

            // Truncar senha se exceder o tipo selecionado
            const maxLength = this.settings.store.passwordType;
            if (this.settings.store.password.length > (maxLength || 6)) {
                this.settings.store.password = this.settings.store.password.substring(0, maxLength);
            }
        }, 1000) as unknown as number;
    },

    removeSettingsWatcher() {
        if (this.settingsWatcher) {
            clearInterval(this.settingsWatcher);
            this.settingsWatcher = null;
        }
    },

    async recalculatePasswordHash() {
        if (this.settings.store.usePasswordHashing && this.settings.store.password) {
            this.settings.store.hashedPassword = await PasswordHasher.hashPassword(this.settings.store.password);
        } else {
            this.settings.store.hashedPassword = "";
        }
        this.lastPasswordHash = this.settings.store.hashedPassword;
    },

    updateInterfaceTexts() {
        // Atualizar textos da interface se a tela de bloqueio estiver visível
        const titleElement = document.querySelector(".passcode-lock-title");
        if (titleElement) {
            titleElement.textContent = Locale.t("lock.title");
        }
    },

    setupEventListeners() {
        this.activityHandler = () => {
            this.lastActivity = Date.now();
            if (!this.settings.store.disableAutoUnlock && this.isLocked) {
                this.unlock();
            }
        };

        // Eventos de atividade
        document.addEventListener("mousedown", this.activityHandler);
        document.addEventListener("mousemove", this.activityHandler);
        document.addEventListener("keypress", this.activityHandler);
        document.addEventListener("scroll", this.activityHandler);
        document.addEventListener("touchstart", this.activityHandler);

        // Verificação de inatividade
        this.inactivityInterval = setInterval(() => {
            this.inactivityCheck();
        }, 1000) as unknown as number;

        // Atalho de teclado
        if (this.settings.store.enableKeyboardShortcut) {
            this.setupKeyboardShortcut();
        }
    },

    removeEventListeners() {
        if (this.activityHandler) {
            document.removeEventListener("mousedown", this.activityHandler);
            document.removeEventListener("mousemove", this.activityHandler);
            document.removeEventListener("keypress", this.activityHandler);
            document.removeEventListener("scroll", this.activityHandler);
            document.removeEventListener("touchstart", this.activityHandler);
        }

        if (this.keyboardHandler) {
            document.removeEventListener("keydown", this.keyboardHandler);
        }

        if (this.inactivityInterval) {
            clearInterval(this.inactivityInterval);
        }
    },

    setupKeyboardShortcut() {
        this.keyboardHandler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "l") {
                e.preventDefault();
                this.lock();
            }
        };
        document.addEventListener("keydown", this.keyboardHandler);
    },

    inactivityCheck() {
        if (!this.settings.store.autoLock || this.isLocked) return;

        const now = Date.now();
        const timeSinceActivity = now - this.lastActivity;
        const timeout = 300 * 1000; // 5 minutos

        if (timeSinceActivity > timeout) {
            this.lock();
        }
    },

    lock() {
        if (this.isLocked) return;

        this.isLocked = true;
        this.currentPassword = "";
        this.showLockScreen();
        this.protectVoiceChannels();
    },

    unlock() {
        if (!this.isLocked) return;

        this.isLocked = false;
        this.attempts = 0;
        this.cooldownLevel = 0;
        this.cooldownMultiplier = 1;
        this.lockoutUntil = null;
        this.hideLockScreen();
        this.hideCooldownScreen();
    },

    async protectVoiceChannels() {
        if (!this.settings.store.protectVoiceChannels) return;

        try {
            const voiceChannelId = getVoiceChannelId();
            if (voiceChannelId) {
                selectVoiceChannel(null);
            }
        } catch (error) {
            // Ignorar erros de API de voz
        }
    },

    initializeLock() {
        this.lock();
    },

    showLockScreen() {
        if (this.isLocked) {
            this.createLockScreen();
        }
    },

    hideLockScreen() {
        const overlay = document.getElementById("passcode-lock-overlay");
        if (overlay) {
            overlay.remove();
        }
    },

    createLockScreen() {
        this.hideLockScreen();

        const overlay = document.createElement("div");
        overlay.id = "passcode-lock-overlay";
        overlay.className = "passcode-lock-overlay";

        const container = document.createElement("div");
        container.className = "passcode-lock-container";

        // Ícone
        const icon = document.createElement("div");
        icon.className = "passcode-lock-icon";
        icon.innerHTML = "🔒";

        // Título
        const title = document.createElement("h1");
        title.className = "passcode-lock-title";
        title.textContent = Locale.t("lock.title");

        // Display de senha (dots)
        const dotsContainer = document.createElement("div");
        dotsContainer.className = "passcode-lock-dots";

        const maxLength = this.settings.store.passwordType;
        for (let i = 0; i < (maxLength || 6); i++) {
            const dot = document.createElement("div");
            dot.className = "passcode-lock-dot";
            dotsContainer.appendChild(dot);
        }

        // Teclado numérico
        const keypad = document.createElement("div");
        keypad.className = "passcode-lock-keypad";

        const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
        numbers.forEach(num => {
            const button = document.createElement("button");
            button.className = "passcode-lock-key";
            button.textContent = num;

            if (num === "⌫") {
                button.addEventListener("click", () => this.deleteDigit());
            } else if (num !== "") {
                button.addEventListener("click", () => this.addDigit(num));
            }

            keypad.appendChild(button);
        });

        // Logo Nyxis
        const logoContainer = document.createElement("div");
        logoContainer.className = "passcode-lock-logo-container";

        const logo = document.createElement("div");
        logo.className = "passcode-lock-logo";
        logo.textContent = "NYXÍS";

        logoContainer.appendChild(logo);

        // Mensagem de erro
        const errorDiv = document.createElement("div");
        errorDiv.className = "passcode-lock-error";
        errorDiv.style.display = "none";

        // Biometric (placeholder para futuro)
        // if (this.settings.store.enableBiometric) {
        //     const biometricDiv = document.createElement("div");
        //     biometricDiv.className = "passcode-lock-biometric";
        //     biometricDiv.textContent = Locale.t("lock.biometric");
        //     container.appendChild(biometricDiv);
        // }

        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(dotsContainer);
        container.appendChild(keypad);
        container.appendChild(logoContainer);
        container.appendChild(errorDiv);

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        this.addStyles();
    },

    addDigit(digit: string) {
        const maxLength = this.settings.store.passwordType;
        if (this.currentPassword.length < (maxLength || 6)) {
            this.currentPassword += digit;
            this.updatePasswordDisplay();

            if (this.currentPassword.length === maxLength) {
                this.validatePassword();
            }
        }
    },

    deleteDigit() {
        if (this.currentPassword.length > 0) {
            this.currentPassword = this.currentPassword.slice(0, -1);
            this.updatePasswordDisplay();
        }
    },

    updatePasswordDisplay() {
        const dots = document.querySelectorAll(".passcode-lock-dot");
        dots.forEach((dot, index) => {
            if (index < this.currentPassword.length) {
                dot.classList.add("filled");
            } else {
                dot.classList.remove("filled");
            }
        });
    },

    async validatePassword() {
        let isValid = false;

        if (this.settings.store.usePasswordHashing && this.settings.store.hashedPassword) {
            isValid = await PasswordHasher.verifyPassword(this.currentPassword, this.settings.store.hashedPassword);
        } else {
            isValid = this.currentPassword === this.settings.store.password;
        }

        if (isValid) {
            this.unlock();
        } else {
            this.handleFailedAttempt();
        }
    },

    handleFailedAttempt() {
        this.attempts++;
        this.showErrorMessage(Locale.t("lock.error"));
        this.shakeScreen();

        if (this.attempts >= this.settings.store.maxAttempts) {
            const cooldownTime = this.settings.store.cooldownBaseTime * this.cooldownMultiplier;
            this.lockoutUntil = Date.now() + (cooldownTime * 1000);
            this.cooldownLevel++;
            this.cooldownMultiplier = Math.min(this.cooldownMultiplier * 2, 16);
            this.showCooldownScreen();
        }
    },

    showErrorMessage(message: string) {
        this.errorMessage = message;
        this.showError = true;

        const errorDiv = document.querySelector(".passcode-lock-error") as HTMLElement;
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = "block";

            setTimeout(() => {
                errorDiv.style.display = "none";
                this.showError = false;
            }, 3000);
        }
    },

    shakeScreen() {
        const container = document.querySelector(".passcode-lock-container");
        if (container) {
            container.classList.add("shake");
            setTimeout(() => {
                container.classList.remove("shake");
            }, 500);
        }
    },

    showCooldownScreen() {
        this.hideCooldownScreen();

        const overlay = document.createElement("div");
        overlay.id = "passcode-lock-cooldown-overlay";
        overlay.className = "passcode-lock-cooldown-overlay";

        const container = document.createElement("div");
        container.className = "passcode-lock-cooldown-container";

        const icon = document.createElement("div");
        icon.className = "passcode-lock-cooldown-icon";
        icon.innerHTML = "⏰";

        const title = document.createElement("h1");
        title.className = "passcode-lock-cooldown-title";
        title.textContent = Locale.t("lock.cooldown", { time: "..." });

        container.appendChild(icon);
        container.appendChild(title);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        this.cooldownScreen = overlay;
        this.updateCooldownDisplay();
    },

    hideCooldownScreen() {
        if (this.cooldownScreen) {
            this.cooldownScreen.remove();
            this.cooldownScreen = null;
        }

        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
        }
    },

    updateCooldownDisplay() {
        if (!this.lockoutUntil) return;

        this.cooldownInterval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.ceil((this.lockoutUntil! - now) / 1000);

            if (remaining <= 0) {
                this.hideCooldownScreen();
                this.attempts = 0;
                this.lockoutUntil = null;
            } else {
                const title = document.querySelector(".passcode-lock-cooldown-title") as HTMLElement;
                if (title) {
                    title.textContent = Locale.t("lock.cooldown", { time: remaining.toString() });
                }
            }
        }, 1000) as unknown as number;
    },

    addStyles() {
        if (document.getElementById("passcode-lock-styles")) return;

        const style = document.createElement("style");
        style.id = "passcode-lock-styles";
        style.textContent = `
            .passcode-lock-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(20, 20, 20, 0.95));
                backdrop-filter: blur(20px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
                animation: passcode-fade-in 0.3s ease-out;
            }

            .passcode-lock-container {
                background: rgba(30, 30, 30, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                animation: passcode-slide-up 0.4s ease-out;
                max-width: 400px;
                width: 90%;
            }

            .passcode-lock-icon {
                font-size: 48px;
                margin-bottom: 20px;
                filter: drop-shadow(0 0 10px rgba(114, 137, 218, 0.5));
            }

            .passcode-lock-title {
                color: #ffffff;
                font-size: 24px;
                font-weight: 600;
                margin: 0 0 30px 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .passcode-lock-dots {
                display: flex;
                justify-content: center;
                gap: 12px;
                margin-bottom: 30px;
            }

            .passcode-lock-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
            }

            .passcode-lock-dot.filled {
                background: #7289da;
                border-color: #7289da;
                box-shadow: 0 0 15px rgba(114, 137, 218, 0.6);
            }

            .passcode-lock-keypad {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 30px;
                max-width: 240px;
                margin-left: auto;
                margin-right: auto;
            }

            .passcode-lock-key {
                width: 60px;
                height: 60px;
                border: none;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                font-size: 20px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid rgba(255, 255, 255, 0.1);
            }

            .passcode-lock-key:hover {
                background: rgba(114, 137, 218, 0.3);
                border-color: #7289da;
                transform: scale(1.05);
                box-shadow: 0 5px 15px rgba(114, 137, 218, 0.3);
            }

            .passcode-lock-key:active {
                transform: scale(0.95);
            }

            .passcode-lock-logo-container {
                margin-top: 20px;
            }

            .passcode-lock-logo {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 18px;
                font-weight: 700;
                color: #7289da;
                letter-spacing: 2px;
                text-shadow: 0 0 10px rgba(114, 137, 218, 0.5);
                transition: all 0.3s ease;
            }

            .passcode-lock-logo:hover {
                color: #ffffff;
                text-shadow: 0 0 15px rgba(114, 137, 218, 0.8);
                transform: scale(1.05);
            }

            .passcode-lock-error {
                color: #ff6b6b;
                font-size: 14px;
                margin-top: 15px;
                font-weight: 500;
            }

            .passcode-lock-cooldown-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(20, 0, 0, 0.98));
                backdrop-filter: blur(25px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000000;
                animation: passcode-fade-in 0.3s ease-out;
            }

            .passcode-lock-cooldown-container {
                background: rgba(40, 20, 20, 0.95);
                border: 1px solid rgba(255, 100, 100, 0.3);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(255, 0, 0, 0.2);
                animation: passcode-slide-up 0.4s ease-out;
                max-width: 400px;
                width: 90%;
            }

            .passcode-lock-cooldown-icon {
                font-size: 48px;
                margin-bottom: 20px;
                filter: drop-shadow(0 0 10px rgba(255, 100, 100, 0.5));
            }

            .passcode-lock-cooldown-title {
                color: #ff6b6b;
                font-size: 24px;
                font-weight: 600;
                margin: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            @keyframes passcode-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes passcode-slide-up {
                from { 
                    opacity: 0;
                    transform: translateY(30px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }

            .shake {
                animation: shake 0.5s ease-in-out;
            }
        `;

        document.head.appendChild(style);
    }
});
