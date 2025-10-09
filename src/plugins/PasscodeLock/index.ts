import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

const { getCurrentUser } = findByPropsLazy("getCurrentUser");

// Localization system (inspired by BetterDiscord plugin)
class Locale {
    private static currentLanguage = "pt-BR";
    private static translations: { [key: string]: { [key: string]: string } } = {
        "pt-BR": {
            // Plugin info
            "plugin.name": "PasscodeLock by Nyxis Studio",
            "plugin.description": "Adiciona uma camada de segurança ao Discord, exigindo uma senha para acessar o aplicativo.",
            
            // Settings - Password Type
            "settings.passwordType": "Tipo de senha",
            "settings.passwordType4": "Código numérico de 4 dígitos",
            "settings.passwordType6": "Código numérico de 6 dígitos", 
            "settings.passwordTypeCustom": "Código numérico personalizado",
            "settings.password": "Defina sua senha",
            "settings.usePasswordHashing": "Usar hash seguro para armazenar a senha (recomendado)",
            "settings.hashedPassword": "Senha com hash (gerado automaticamente)",
            
            // Settings - Auto Lock
            "settings.autoLock": "Bloqueio automático",
            "settings.autoLockDescription": "Exigir senha ao ficar inativo",
            "settings.autoLockOff": "Desligado",
            "settings.autoLock1min": "em 1 minuto",
            "settings.autoLock5min": "em 5 minutos", 
            "settings.autoLock1hour": "em 1 hora",
            "settings.autoLock5hours": "em 5 horas",
            
            // Settings - Lock Shortcut
            "settings.lockShortcut": "Atalho para bloqueio",
            "settings.lockShortcutDescription": "Atalho de teclado para bloquear manualmente",
            "settings.requirePasswordOnStart": "Bloquear ao iniciar",
            "settings.requirePasswordOnStartDescription": "Bloqueia o Discord na inicialização, mesmo que não estivesse bloqueado antes de sair",
            
            // Settings - Visual
            "settings.showTypedKeys": "Mostrar teclas digitadas",
            "settings.showTypedKeysDescription": "Destaca as teclas ao digitar a senha no teclado",
            
            // Settings - Notifications
            "settings.notificationsWhenBlocked": "Notificações quando bloqueado",
            "settings.disableNotifications": "Desligar notificações",
            "settings.censorNotifications": "Censurar notificações",
            
            // Settings - Advanced
            "settings.maxAttempts": "Número máximo de tentativas de senha antes do bloqueio temporário",
            "settings.cooldownBaseTime": "Tempo base do cooldown em segundos (aumenta progressivamente)",
            "settings.protectVoiceChannels": "Bloquear canais de voz quando o Discord estiver bloqueado",
            "settings.language": "Idioma da interface",
            
            // Theme options
            "theme.dark": "Escuro",
            "theme.light": "Claro",
            "theme.discord": "Discord",
            
            // Lock screen
            "lock.title": "Digite sua senha do Discord",
            "lock.biometric": "Usar impressão digital",
            "lock.attempts": "Tentativas restantes: {count}",
            "lock.lockout": "Muitas tentativas. Tente novamente em {time}",
            "lock.lockoutLevel": " (Nível {level})",
            
            // Error messages
            "error.wrongPassword": "Senha incorreta. Tente novamente.",
            "error.wrongPasswordWarning": "Senha incorreta! Restam apenas {count} tentativas.",
            "error.lastAttempt": "Última tentativa! Cuidado com o bloqueio.",
            
            // Cooldown screen
            "cooldown.title": "Muitas tentativas incorretas",
            "cooldown.message": "Aguarde o tempo de cooldown para tentar novamente. O tempo aumenta a cada esgotamento de tentativas.",
            "cooldown.level": "Nível de Cooldown: {level}",
            "cooldown.first": "Primeiro Cooldown",
            
            // Logs
            "log.passwordHashed": "Senha com hash gerada com sucesso",
            "log.passwordHashError": "Erro ao gerar hash da senha:",
            "log.verificationError": "Erro na verificação de hash:",
            "log.voiceDisconnected": "Desconectado do canal de voz por segurança",
            "log.voiceProtectionError": "Erro ao proteger canais de voz:",
            "log.setupEventListeners": "Configurando event listeners...",
            "log.setupKeyboardShortcut": "Configurando atalho de teclado...",
            "log.keyPressed": "Tecla pressionada:",
            "log.ctrlLDetected": "Ctrl+L detectado!",
            "log.alreadyLocked": "Já está bloqueado, ignorando...",
            "log.manualLock": "Bloqueando manualmente...",
            "log.keyboardShortcutConfigured": "Atalho de teclado configurado!"
        },
        "en-US": {
            // Plugin info
            "plugin.name": "PasscodeLock by Nyxis Studio",
            "plugin.description": "Adds a security layer to Discord, requiring a password to access the application.",
            
            // Settings - Password Type
            "settings.passwordType": "Password type",
            "settings.passwordType4": "4-digit numeric code",
            "settings.passwordType6": "6-digit numeric code",
            "settings.passwordTypeCustom": "Custom numeric code",
            "settings.password": "Set your password",
            "settings.usePasswordHashing": "Use secure hash to store password (recommended)",
            "settings.hashedPassword": "Hashed password (auto-generated)",
            
            // Settings - Auto Lock
            "settings.autoLock": "Automatic lock",
            "settings.autoLockDescription": "Require password when inactive",
            "settings.autoLockOff": "Off",
            "settings.autoLock1min": "in 1 minute",
            "settings.autoLock5min": "in 5 minutes",
            "settings.autoLock1hour": "in 1 hour", 
            "settings.autoLock5hours": "in 5 hours",
            
            // Settings - Lock Shortcut
            "settings.lockShortcut": "Lock shortcut",
            "settings.lockShortcutDescription": "Keyboard shortcut to manually lock",
            "settings.requirePasswordOnStart": "Lock on startup",
            "settings.requirePasswordOnStartDescription": "Locks Discord on startup, even if it wasn't locked before exiting",
            
            // Settings - Visual
            "settings.showTypedKeys": "Show typed keys",
            "settings.showTypedKeysDescription": "Highlights the keys when typing the password on the keyboard",
            
            // Settings - Notifications
            "settings.notificationsWhenBlocked": "Notifications when blocked",
            "settings.disableNotifications": "Turn off notifications",
            "settings.censorNotifications": "Censor notifications",
            
            // Settings - Advanced
            "settings.maxAttempts": "Maximum password attempts before temporary lockout",
            "settings.cooldownBaseTime": "Base cooldown time in seconds (increases progressively)",
            "settings.protectVoiceChannels": "Disconnect from voice channels when Discord is locked",
            "settings.language": "Interface language",
            
            // Theme options
            "theme.dark": "Dark",
            "theme.light": "Light",
            "theme.discord": "Discord",
            
            // Lock screen
            "lock.title": "Enter your Discord password",
            "lock.biometric": "Use fingerprint",
            "lock.attempts": "Attempts remaining: {count}",
            "lock.lockout": "Too many attempts. Try again in {time}",
            "lock.lockoutLevel": " (Level {level})",
            
            // Error messages
            "error.wrongPassword": "Incorrect password. Try again.",
            "error.wrongPasswordWarning": "Incorrect password! Only {count} attempts remaining.",
            "error.lastAttempt": "Last attempt! Be careful with the lockout.",
            
            // Cooldown screen
            "cooldown.title": "Too many incorrect attempts",
            "cooldown.message": "Wait for the cooldown time to try again. The time increases with each attempt exhaustion.",
            "cooldown.level": "Cooldown Level: {level}",
            "cooldown.first": "First Cooldown",
            
            // Logs
            "log.passwordHashed": "Password hash generated successfully",
            "log.passwordHashError": "Error generating password hash:",
            "log.verificationError": "Error in hash verification:",
            "log.voiceDisconnected": "Disconnected from voice channel for security",
            "log.voiceProtectionError": "Error protecting voice channels:",
            "log.setupEventListeners": "Setting up event listeners...",
            "log.setupKeyboardShortcut": "Setting up keyboard shortcut...",
            "log.keyPressed": "Key pressed:",
            "log.ctrlLDetected": "Ctrl+L detected!",
            "log.alreadyLocked": "Already locked, ignoring...",
            "log.manualLock": "Manually locking...",
            "log.keyboardShortcutConfigured": "Keyboard shortcut configured!"
        },
        "es-ES": {
            // Plugin info
            "plugin.name": "PasscodeLock by Nyxis Studio",
            "plugin.description": "Añade una capa de seguridad a Discord, requiriendo una contraseña para acceder a la aplicación.",
            
            // Settings - Password Type
            "settings.passwordType": "Tipo de contraseña",
            "settings.passwordType4": "Código numérico de 4 dígitos",
            "settings.passwordType6": "Código numérico de 6 dígitos",
            "settings.passwordTypeCustom": "Código numérico personalizado",
            "settings.password": "Establece tu contraseña",
            "settings.usePasswordHashing": "Usar hash seguro para almacenar la contraseña (recomendado)",
            "settings.hashedPassword": "Contraseña con hash (generada automáticamente)",
            
            // Settings - Auto Lock
            "settings.autoLock": "Bloqueo automático",
            "settings.autoLockDescription": "Requerir contraseña al estar inactivo",
            "settings.autoLockOff": "Desactivado",
            "settings.autoLock1min": "en 1 minuto",
            "settings.autoLock5min": "en 5 minutos",
            "settings.autoLock1hour": "en 1 hora",
            "settings.autoLock5hours": "en 5 horas",
            
            // Settings - Lock Shortcut
            "settings.lockShortcut": "Atajo de bloqueo",
            "settings.lockShortcutDescription": "Atajo de teclado para bloquear manualmente",
            "settings.requirePasswordOnStart": "Bloquear al iniciar",
            "settings.requirePasswordOnStartDescription": "Bloquea Discord en el inicio, incluso si no estaba bloqueado antes de salir",
            
            // Settings - Visual
            "settings.showTypedKeys": "Mostrar teclas digitadas",
            "settings.showTypedKeysDescription": "Resalta las teclas al escribir la contraseña en el teclado",
            
            // Settings - Notifications
            "settings.notificationsWhenBlocked": "Notificaciones cuando está bloqueado",
            "settings.disableNotifications": "Desactivar notificaciones",
            "settings.censorNotifications": "Censurar notificaciones",
            
            // Settings - Advanced
            "settings.maxAttempts": "Número máximo de intentos de contraseña antes del bloqueo temporal",
            "settings.cooldownBaseTime": "Tiempo base de cooldown en segundos (aumenta progresivamente)",
            "settings.protectVoiceChannels": "Desconectar de canales de voz cuando Discord esté bloqueado",
            "settings.language": "Idioma de la interfaz",
            
            // Theme options
            "theme.dark": "Oscuro",
            "theme.light": "Claro",
            "theme.discord": "Discord",
            
            // Lock screen
            "lock.title": "Ingresa tu contraseña de Discord",
            "lock.biometric": "Usar huella dactilar",
            "lock.attempts": "Intentos restantes: {count}",
            "lock.lockout": "Demasiados intentos. Intenta de nuevo en {time}",
            "lock.lockoutLevel": " (Nivel {level})",
            
            // Error messages
            "error.wrongPassword": "Contraseña incorrecta. Intenta de nuevo.",
            "error.wrongPasswordWarning": "¡Contraseña incorrecta! Solo quedan {count} intentos.",
            "error.lastAttempt": "¡Último intento! Ten cuidado con el bloqueo.",
            
            // Cooldown screen
            "cooldown.title": "Demasiados intentos incorrectos",
            "cooldown.message": "Espera el tiempo de cooldown para intentar de nuevo. El tiempo aumenta con cada agotamiento de intentos.",
            "cooldown.level": "Nivel de Cooldown: {level}",
            "cooldown.first": "Primer Cooldown",
            
            // Logs
            "log.passwordHashed": "Hash de contraseña generado exitosamente",
            "log.passwordHashError": "Error generando hash de contraseña:",
            "log.verificationError": "Error en verificación de hash:",
            "log.voiceDisconnected": "Desconectado del canal de voz por seguridad",
            "log.voiceProtectionError": "Error protegiendo canales de voz:",
            "log.setupEventListeners": "Configurando event listeners...",
            "log.setupKeyboardShortcut": "Configurando atajo de teclado...",
            "log.keyPressed": "Tecla presionada:",
            "log.ctrlLDetected": "¡Ctrl+L detectado!",
            "log.alreadyLocked": "Ya está bloqueado, ignorando...",
            "log.manualLock": "Bloqueando manualmente...",
            "log.keyboardShortcutConfigured": "¡Atajo de teclado configurado!"
        }
    };

    static setLanguage(language: string) {
        if (this.translations[language]) {
            this.currentLanguage = language;
        }
    }

    static getLanguage(): string {
        return this.currentLanguage;
    }

    static t(key: string, params?: { [key: string]: string | number }): string {
        const translation = this.translations[this.currentLanguage]?.[key] || 
                          this.translations["en-US"]?.[key] || 
                          key;
        
        if (params) {
            return translation.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param]?.toString() || match;
            });
        }
        
        return translation;
    }

    static getAvailableLanguages(): string[] {
        return Object.keys(this.translations);
    }

    static getLanguageName(code: string): string {
        const names: { [key: string]: string } = {
            "pt-BR": "Português (Brasil)",
            "en-US": "English (US)",
            "es-ES": "Español (España)"
        };
        return names[code] || code;
    }
}

// Password hashing utilities (inspired by BetterDiscord plugin)
class PasswordHasher {
    private static async pbkdf2(password: string, salt: string, iterations: number = 10000): Promise<string> {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: encoder.encode(salt),
                iterations: iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        
        return Array.from(new Uint8Array(derivedBits))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    static async hashPassword(password: string): Promise<string> {
        const salt = crypto.randomUUID();
        const hash = await this.pbkdf2(password, salt);
        return `${salt}:${hash}`;
    }
    
    static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
        const [salt, hash] = hashedPassword.split(':');
        if (!salt || !hash) return false;
        
        const computedHash = await this.pbkdf2(password, salt);
        return computedHash === hash;
    }
}

export default definePlugin({
    name: Locale.t("plugin.name"),
    description: Locale.t("plugin.description"),
    authors: [
        {
            id: 123456789012345678n,
            name: "Nyxis Studio",
        }
    ],
    version: "1.0.0",

    settings: definePluginSettings({
        // ===== CONFIGURAÇÕES GERAIS =====
        enabled: {
            type: OptionType.BOOLEAN,
            description: "Ativar PasscodeLock",
            default: true,
        },
        language: {
            type: OptionType.SELECT,
            description: Locale.t("settings.language"),
            default: "pt-BR",
            options: Locale.getAvailableLanguages().map(lang => ({
                label: Locale.getLanguageName(lang),
                value: lang
            })),
            onChange: (newValue: string) => {
                Locale.setLanguage(newValue);
            }
        },

        // ===== TIPO DE SENHA =====
        passwordType: {
            type: OptionType.SELECT,
            description: Locale.t("settings.passwordType"),
            default: "4",
            options: [
                { label: Locale.t("settings.passwordType4"), value: "4" },
                { label: Locale.t("settings.passwordType6"), value: "6" },
                { label: Locale.t("settings.passwordTypeCustom"), value: "custom" },
            ],
        },
        password: {
            type: OptionType.STRING,
            description: Locale.t("settings.password"),
            default: "",
            secret: true,
        },
        usePasswordHashing: {
            type: OptionType.BOOLEAN,
            description: Locale.t("settings.usePasswordHashing"),
            default: true,
        },
        hashedPassword: {
            type: OptionType.STRING,
            description: Locale.t("settings.hashedPassword"),
            default: "",
            secret: true,
        },

        // ===== BLOQUEIO AUTOMÁTICO =====
        autoLock: {
            type: OptionType.SELECT,
            description: Locale.t("settings.autoLockDescription"),
            default: "off",
            options: [
                { label: Locale.t("settings.autoLockOff"), value: "off" },
                { label: Locale.t("settings.autoLock1min"), value: "1min" },
                { label: Locale.t("settings.autoLock5min"), value: "5min" },
                { label: Locale.t("settings.autoLock1hour"), value: "1hour" },
                { label: Locale.t("settings.autoLock5hours"), value: "5hours" },
            ],
        },
        requirePasswordOnStart: {
            type: OptionType.BOOLEAN,
            description: Locale.t("settings.requirePasswordOnStartDescription"),
            default: true,
        },
        disableAutoUnlock: {
            type: OptionType.BOOLEAN,
            description: "Desabilitar desbloqueio automático ao detectar atividade",
            default: false,
        },

        // ===== ATALHOS E CONTROLES =====
        enableKeyboardShortcut: {
            type: OptionType.BOOLEAN,
            description: "Ativar atalho de teclado para bloqueio manual (Ctrl+L)",
            default: true,
        },

        // ===== SEGURANÇA =====
        maxAttempts: {
            type: OptionType.NUMBER,
            description: Locale.t("settings.maxAttempts"),
            default: 5,
            min: 1,
            max: 10,
        },
        cooldownBaseTime: {
            type: OptionType.NUMBER,
            description: Locale.t("settings.cooldownBaseTime"),
            default: 30,
        },
        protectVoiceChannels: {
            type: OptionType.BOOLEAN,
            description: Locale.t("settings.protectVoiceChannels"),
            default: true,
        },

        // ===== ROADMAP =====
        roadmapInfo: {
            type: OptionType.COMPONENT,
            description: "🚀 Funcionalidades em Desenvolvimento",
            component: () => {
                return React.createElement("div", {
                    style: {
                        padding: "16px",
                        backgroundColor: "var(--background-secondary)",
                        borderRadius: "8px",
                        margin: "8px 0",
                        border: "1px solid var(--background-tertiary)"
                    }
                }, [
                    React.createElement("h3", {
                        key: "title",
                        style: {
                            color: "var(--text-normal)",
                            margin: "0 0 12px 0",
                            fontSize: "16px",
                            fontWeight: "600"
                        }
                    }, "🚀 Roadmap - Próximas Funcionalidades"),
                    
                    React.createElement("div", {
                        key: "features",
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                        }
                    }, [
                        React.createElement("div", {
                            key: "biometric",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px",
                                backgroundColor: "var(--background-primary)",
                                borderRadius: "4px"
                            }
                        }, [
                            React.createElement("span", { key: "icon", style: { fontSize: "16px" } }, "🔐"),
                            React.createElement("span", { key: "text", style: { color: "var(--text-normal)" } }, "Autenticação Biométrica")
                        ]),
                        
                        React.createElement("div", {
                            key: "themes",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px",
                                backgroundColor: "var(--background-primary)",
                                borderRadius: "4px"
                            }
                        }, [
                            React.createElement("span", { key: "icon", style: { fontSize: "16px" } }, "🎨"),
                            React.createElement("span", { key: "text", style: { color: "var(--text-normal)" } }, "Temas Personalizados")
                        ]),
                        
                        React.createElement("div", {
                            key: "notifications",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px",
                                backgroundColor: "var(--background-primary)",
                                borderRadius: "4px"
                            }
                        }, [
                            React.createElement("span", { key: "icon", style: { fontSize: "16px" } }, "🔔"),
                            React.createElement("span", { key: "text", style: { color: "var(--text-normal)" } }, "Modo de Notificações Avançado")
                        ]),
                        
                        React.createElement("div", {
                            key: "shortcuts",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px",
                                backgroundColor: "var(--background-primary)",
                                borderRadius: "4px"
                            }
                        }, [
                            React.createElement("span", { key: "icon", style: { fontSize: "16px" } }, "⌨️"),
                            React.createElement("span", { key: "text", style: { color: "var(--text-normal)" } }, "Atalhos Personalizados")
                        ]),
                        
                        React.createElement("div", {
                            key: "autolock",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px",
                                backgroundColor: "var(--background-primary)",
                                borderRadius: "4px"
                            }
                        }, [
                            React.createElement("span", { key: "icon", style: { fontSize: "16px" } }, "⏰"),
                            React.createElement("span", { key: "text", style: { color: "var(--text-normal)" } }, "Bloqueio Automático por Inatividade")
                        ]),
                        
                        React.createElement("div", {
                            key: "visual",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px",
                                backgroundColor: "var(--background-primary)",
                                borderRadius: "4px"
                            }
                        }, [
                            React.createElement("span", { key: "icon", style: { fontSize: "16px" } }, "✨"),
                            React.createElement("span", { key: "text", style: { color: "var(--text-normal)" } }, "Destacar Teclas ao Digitar")
                        ])
                    ]),
                    
                    React.createElement("div", {
                        key: "note",
                        style: {
                            marginTop: "12px",
                            padding: "8px",
                            backgroundColor: "var(--info-warning-foreground)",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "var(--text-normal)",
                            fontStyle: "italic"
                        }
                    }, "💡 Essas funcionalidades estão em desenvolvimento e serão adicionadas em futuras atualizações!")
                ]);
            }
        }
    }),

    isLocked: false,
    attempts: 0,
    lockoutUntil: null as number | null,
    lastActivity: 0,
    currentPassword: "",
    activityHandler: null as (() => void) | null,
    keyboardHandler: null as ((event: KeyboardEvent) => void) | null,
    inactivityCheck: null as NodeJS.Timeout | null,
    errorMessage: "",
    showError: false,
    cooldownLevel: 0,
    cooldownMultiplier: 1,
    cooldownScreen: null as HTMLElement | null,
    cooldownInterval: null as NodeJS.Timeout | null,
    settingsWatcher: null as NodeJS.Timeout | null,
    lastPasswordHash: "",

    start() {
        this.addStyles();
        this.initializePasswordHashing();
        this.initializeLock();
        this.setupEventListeners();
        this.setupSettingsWatcher();
    },

    stop() {
        this.hideLockScreen();
        this.hideCooldownScreen();
        this.removeEventListeners();
        this.removeSettingsWatcher();
        if (this.inactivityCheck) {
            clearInterval(this.inactivityCheck);
        }
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
        }
    },

    addStyles() {
        if (document.getElementById("passcode-lock-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "passcode-lock-styles";
        style.textContent = `
            .passcode-lock-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: #1e2124;
                opacity: 0.9;
                backdrop-filter: blur(40px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
            }

            .passcode-lock-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px;
                min-width: 320px;
                max-width: 380px;
            }

            .passcode-lock-icon {
                font-size: 48px;
                margin-bottom: 24px;
                color: #b9bbbe;
                filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
            }

            .passcode-lock-title {
                font-size: 18px;
                font-weight: 400;
                color: #b9bbbe;
                margin-bottom: 32px;
                letter-spacing: 0.3px;
            }

            .passcode-lock-input-display {
                display: flex;
                justify-content: center;
                margin-bottom: 40px;
            }

            .passcode-lock-dots {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin: 20px auto;
                padding: 0 20px;
            }
            
            .passcode-lock-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #4e5058;
                border: 2px solid #4e5058;
                transition: all 0.3s ease;
                position: relative;
            }
            
            .passcode-lock-dot.filled {
                background: #5865f2;
                border-color: #5865f2;
                box-shadow: 0 0 8px rgba(88, 101, 242, 0.6);
                transform: scale(1.1);
            }
            
            .passcode-lock-dot.filled::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 4px;
                height: 4px;
                background: white;
                border-radius: 50%;
                animation: dotPulse 0.3s ease;
            }
            
            @keyframes dotPulse {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }

            .passcode-lock-keypad {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 24px;
                margin-bottom: 20px;
                max-width: 280px;
            }

            .passcode-lock-logo-container {
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 20px 0;
                padding: 10px 0;
            }

            .passcode-lock-logo {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 18px;
                font-weight: 600;
                color: #5865f2;
                letter-spacing: 2px;
                text-transform: uppercase;
                opacity: 0.8;
                transition: all 300ms ease-in-out;
                text-shadow: 0 0 10px rgba(88, 101, 242, 0.3);
            }

            .passcode-lock-logo:hover {
                opacity: 1;
                color: #7289da;
                text-shadow: 0 0 15px rgba(88, 101, 242, 0.5);
                transform: scale(1.05);
            }

            .passcode-lock-key {
                width: 70px;
                height: 70px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 200ms ease-out;
                color: #dcddde;
                font-size: 26px;
                font-weight: 300;
                user-select: none;
            }

            .passcode-lock-key:hover {
                color: white;
                transform: scale(1.1);
            }

            .passcode-lock-key:active {
                transform: scale(0.95);
            }

            .passcode-lock-key-letters {
                font-size: 10px;
                color: #72767d;
                margin-top: 4px;
                font-weight: 400;
                letter-spacing: 0.08em;
            }

            .passcode-lock-key.delete {
                color: #dcddde;
                font-size: 24px;
                font-weight: 300;
            }

            .passcode-lock-key.delete:hover {
                color: white;
                transform: scale(1.1);
            }

            .passcode-lock-key.delete:active {
                transform: scale(0.95);
            }

            .passcode-lock-attempts {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                margin-bottom: 10px;
            }

            .passcode-lock-lockout {
                color: #ff3b30;
                font-size: 14px;
                font-weight: 600;
                background: rgba(255, 59, 48, 0.1);
                padding: 12px;
                border-radius: 12px;
                border: 1px solid rgba(255, 59, 48, 0.3);
            }

            .passcode-lock-biometric {
                margin-top: 20px;
                padding: 16px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .passcode-lock-biometric:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateY(-2px);
            }

            .passcode-lock-biometric-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }

            .passcode-lock-biometric-text {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                font-weight: 500;
            }

            /* Shake animation for wrong password */
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                20%, 40%, 60%, 80% { transform: translateX(10px); }
            }

            .passcode-lock-container.shake {
                animation: shake 0.5s ease-in-out;
            }

            .passcode-lock-error {
                color: #ff3b30;
                font-size: 14px;
                font-weight: 500;
                margin-top: 16px;
                padding: 12px 16px;
                background: rgba(255, 59, 48, 0.1);
                border: 1px solid rgba(255, 59, 48, 0.3);
                border-radius: 8px;
                text-align: center;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
            }

            .passcode-lock-error.show {
                opacity: 1;
                transform: translateY(0);
            }

            .passcode-lock-cooldown {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, rgba(35, 39, 42, 0.95) 0%, rgba(44, 47, 51, 0.9) 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                backdrop-filter: blur(20px);
                animation: passcode-fade-in 0.4s ease-out;
            }

            .passcode-lock-cooldown-container {
                background: rgba(35, 39, 42, 0.8);
                backdrop-filter: blur(25px);
                border-radius: 24px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
                text-align: center;
                min-width: 320px;
                max-width: 380px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                animation: passcode-slide-up 0.4s ease-out;
            }

            .passcode-lock-cooldown-icon {
                font-size: 48px;
                margin-bottom: 24px;
                color: #ff3b30;
                filter: drop-shadow(0 2px 8px rgba(255, 59, 48, 0.3));
                animation: pulse 2s infinite;
            }

            .passcode-lock-cooldown-title {
                font-size: 18px;
                font-weight: 400;
                color: #99AAB5;
                margin-bottom: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                letter-spacing: 0.3px;
            }

            .passcode-lock-cooldown-timer {
                font-size: 32px;
                font-weight: 600;
                color: #ff3b30;
                margin-bottom: 16px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-shadow: 0 0 20px rgba(255, 59, 48, 0.5);
            }

            .passcode-lock-cooldown-level {
                font-size: 14px;
                color: #72767d;
                margin-bottom: 24px;
                font-weight: 500;
            }

            .passcode-lock-cooldown-message {
                font-size: 14px;
                color: #99AAB5;
                line-height: 1.5;
                max-width: 280px;
                margin: 0 auto;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
    },

    async initializePasswordHashing() {
        if (this.settings.store.usePasswordHashing && this.settings.store.password) {
            try {
                // Sempre recalcular o hash para garantir que está correto
                const hashedPassword = await PasswordHasher.hashPassword(this.settings.store.password);
                this.settings.store.hashedPassword = hashedPassword;
            } catch (error) {
                // Se falhar, usar a senha em texto plano
                this.settings.store.hashedPassword = "";
            }
        } else if (!this.settings.store.usePasswordHashing) {
            // Se o hashing foi desabilitado, limpar o hash
            this.settings.store.hashedPassword = "";
        }
    },

    setupEventListeners() {
        
        // Sempre configurar o atalho de teclado se estiver habilitado
        if (this.settings.store.enableKeyboardShortcut) {
            this.setupKeyboardShortcut();
        }
        
        if (!this.settings.store.autoLock) return;

        // Detectar atividade do usuário
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        this.activityHandler = () => {
            this.lastActivity = Date.now();

            // Só desbloquear automaticamente se a configuração permitir
            // E se não estivermos na tela de bloqueio (usuário digitando senha)
            if (!this.settings.store.disableAutoUnlock && this.isLocked) {
                const lockScreen = document.getElementById("passcode-lock-overlay");
                if (!lockScreen) {
                    // Só desbloquear se não há tela de bloqueio visível
                    this.hideLockScreen();
                    this.isLocked = false;
                }
            }
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, this.activityHandler!, true);
        });


        // Verificar inatividade periodicamente
        this.inactivityCheck = setInterval(() => {
            if (this.isLocked) return;

            const now = Date.now();
            const inactiveTime = now - this.lastActivity;
            const lockTimeoutMs = 300 * 1000; // autoLockTimeout será implementado em breve

            if (inactiveTime >= lockTimeoutMs) {
                this.showLockScreen();
                this.isLocked = true;
            }
        }, 5000); // Verificar a cada 5 segundos
    },

    setupKeyboardShortcut() {
        
        // Atalho de teclado para bloquear manualmente (Ctrl + L) e entrada numérica
        this.keyboardHandler = (event: KeyboardEvent) => {
            // Bloquear atalhos de desenvolvedor
            if (event.ctrlKey && event.shiftKey) {
                // Ctrl + Shift + I (console do desenvolvedor)
                if (event.key === 'I') {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                // Ctrl + Shift + C (inspecionar elemento)
                if (event.key === 'C') {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                // Ctrl + Shift + J (console do desenvolvedor - Firefox)
                if (event.key === 'J') {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }
            
            // Bloquear F12 (console do desenvolvedor)
            if (event.key === 'F12') {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            
            // Bloquear Ctrl + U (ver código fonte)
            if (event.ctrlKey && event.key === 'u') {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            
            // Se estivermos na tela de bloqueio, aceitar entrada do teclado físico
            if (this.isLocked && document.getElementById("passcode-lock-overlay")) {
                // Aceitar teclas numéricas (0-9)
                if (event.key >= '0' && event.key <= '9') {
                    event.preventDefault();
                    this.addDigit(event.key);
                    return;
                }
                
                // Backspace para apagar
                if (event.key === 'Backspace') {
                    event.preventDefault();
                    this.deleteDigit();
                    return;
                }
                
                // Enter para validar (se a senha estiver completa)
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (this.currentPassword.length === this.settings.store.password.length) {
                        this.validatePassword();
                    }
                    return;
                }
            }
            
            // Verificar se o atalho está habilitado e se é Ctrl + L
            if (this.settings.store.enableKeyboardShortcut && event.ctrlKey && event.key === 'l') {
                event.preventDefault(); // Prevenir comportamento padrão do navegador
                
                if (this.isLocked) {
                    return;
                }
                
                // Bloquear manualmente
                this.lock();
            }
        };

        document.addEventListener('keydown', this.keyboardHandler, true);
    },

    removeEventListeners() {
        if (this.activityHandler) {
            const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
            activityEvents.forEach(event => {
                document.removeEventListener(event, this.activityHandler!, true);
            });
            this.activityHandler = null;
        }

        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler, true);
            this.keyboardHandler = null;
        }

        if (this.inactivityCheck) {
            clearInterval(this.inactivityCheck);
            this.inactivityCheck = null;
        }
    },

    setupSettingsWatcher() {
        // Armazenar o hash inicial da senha
        this.lastPasswordHash = this.settings.store.hashedPassword || this.settings.store.password;
        
        // Verificar mudanças nas configurações a cada 1 segundo
        this.settingsWatcher = setInterval(() => {
            const currentPassword = this.settings.store.password;
            const currentPasswordHash = this.settings.store.hashedPassword || currentPassword;
            const passwordType = this.settings.store.passwordType;
            
            // Validar o tamanho da senha baseado no tipo selecionado
            if (passwordType === "4" && currentPassword.length > 4) {
                // Se for 4 dígitos, limitar a 4 caracteres
                this.settings.store.password = currentPassword.substring(0, 4);
                return; // Sair da verificação para evitar loop
            } else if (passwordType === "6" && currentPassword.length > 6) {
                // Se for 6 dígitos, limitar a 6 caracteres
                this.settings.store.password = currentPassword.substring(0, 6);
                return; // Sair da verificação para evitar loop
            }
            
            // Se a senha mudou (comparando a senha em texto plano)
            if (currentPassword !== this.lastPasswordHash && currentPassword !== this.settings.store.hashedPassword) {
                this.lastPasswordHash = currentPassword;
                
                // Se o hashing estiver habilitado, recalcular o hash da nova senha
                if (this.settings.store.usePasswordHashing && currentPassword) {
                    this.recalculatePasswordHash(currentPassword);
                }
                
                // Se estivermos na tela de bloqueio, atualizar as bolinhas
                if (this.isLocked && document.getElementById("passcode-lock-overlay")) {
                    this.updatePasswordDisplay();
                }
                
                // Re-inicializar o sistema de hash
                this.initializePasswordHashing();
            }
            
            // Se o idioma mudou, atualizar a interface
            const currentLanguage = this.settings.store.language;
            if (currentLanguage && currentLanguage !== Locale.getLanguage()) {
                Locale.setLanguage(currentLanguage);
                
                // Se estivermos na tela de bloqueio, atualizar os textos
                if (this.isLocked && document.getElementById("passcode-lock-overlay")) {
                    this.updateInterfaceTexts();
                }
            }
        }, 1000);
    },

    removeSettingsWatcher() {
        if (this.settingsWatcher) {
            clearInterval(this.settingsWatcher);
            this.settingsWatcher = null;
        }
    },

    updateInterfaceTexts() {
        // Atualizar textos da interface quando o idioma muda
        const titleElement = document.getElementById("passcode-lock-title");
        if (titleElement) {
            titleElement.textContent = Locale.t("ui.enterPassword");
        }
        
        const biometricElement = document.getElementById("passcode-lock-biometric");
        if (biometricElement) {
            biometricElement.textContent = Locale.t("ui.biometricUnlock");
        }
        
        const errorElement = document.getElementById("passcode-lock-error");
        if (errorElement && this.showError) {
            errorElement.textContent = this.errorMessage;
        }
    },

    async recalculatePasswordHash(newPassword: string) {
        try {
            const hashedPassword = await PasswordHasher.hashPassword(newPassword);
            this.settings.store.hashedPassword = hashedPassword;
        } catch (error) {
            // Se falhar, usar a senha em texto plano
            this.settings.store.hashedPassword = "";
        }
    },

    initializeLock() {
        if (!this.settings.store.enabled || !this.settings.store.password) {
            return;
        }

        this.isLocked = this.settings.store.requirePasswordOnStart;
        this.attempts = 0;
        this.lockoutUntil = null;
        this.lastActivity = Date.now();

        if (this.isLocked) {
            this.showLockScreen();
        }
    },

    showLockScreen() {
        
        if (document.getElementById("passcode-lock-overlay")) {
            return; // Já está sendo exibido
        }
        
        // Evitar mostrar a tela se acabamos de desbloquear
        if (!this.isLocked) {
            return;
        }

        const overlay = document.createElement("div");
        overlay.id = "passcode-lock-overlay";
        overlay.className = "passcode-lock-overlay";

        const container = document.createElement("div");
        container.className = `passcode-lock-container discord`; // theme será implementado em breve

        const icon = document.createElement("div");
        icon.className = "passcode-lock-icon";
        icon.textContent = "🔒";

        const title = document.createElement("div");
        title.className = "passcode-lock-title";
        title.textContent = Locale.t("lock.title");

        // Input simples com linha
        const inputDisplay = document.createElement("div");
        inputDisplay.className = "passcode-lock-input-display";
        
        // Criar container para as bolinhas
        const dotsContainer = document.createElement("div");
        dotsContainer.className = "passcode-lock-dots";
        dotsContainer.id = "passcode-dots-container";
        
        // Criar bolinhas baseadas no tamanho da senha configurada
        const passwordLength = this.settings.store.password.length;
        for (let i = 0; i < passwordLength; i++) {
            const dot = document.createElement("div");
            dot.className = "passcode-lock-dot";
            dot.id = `passcode-dot-${i}`;
            dotsContainer.appendChild(dot);
        }
        
        inputDisplay.appendChild(dotsContainer);

        // Teclado numérico
        const keypad = document.createElement("div");
        keypad.className = "passcode-lock-keypad";

        // Números 1-9
        for (let i = 1; i <= 9; i++) {
            const key = document.createElement("div");
            key.className = "passcode-lock-key";
            key.innerHTML = `
                <div>${i}</div>
                <div class="passcode-lock-key-letters">${this.getKeypadLetters(i)}</div>
            `;
            key.onclick = () => this.addDigit(i.toString());
            keypad.appendChild(key);
        }

        // Linha inferior: 0, ponto, delete
        const bottomRow = document.createElement("div");
        bottomRow.style.gridColumn = "1 / -1";
        bottomRow.style.display = "flex";
        bottomRow.style.justifyContent = "space-between";
        bottomRow.style.alignItems = "center";

        // 0
        const zeroKey = document.createElement("div");
        zeroKey.className = "passcode-lock-key";
        zeroKey.innerHTML = `
            <div>0</div>
            <div class="passcode-lock-key-letters">+</div>
        `;
        zeroKey.onclick = () => this.addDigit("0");
        bottomRow.appendChild(zeroKey);

        // Ponto (placeholder)
        const dotKey = document.createElement("div");
        dotKey.className = "passcode-lock-key";
        dotKey.innerHTML = `<div>•</div>`;
        dotKey.style.opacity = "0.3";
        bottomRow.appendChild(dotKey);

        // Delete
        const deleteKey = document.createElement("div");
        deleteKey.className = "passcode-lock-key delete";
        deleteKey.innerHTML = `<div>⌫</div>`;
        deleteKey.onclick = () => this.removeDigit();
        bottomRow.appendChild(deleteKey);

        keypad.appendChild(bottomRow);

        const attemptsDiv = document.createElement("div");
        attemptsDiv.className = "passcode-lock-attempts";

        const lockoutDiv = document.createElement("div");
        lockoutDiv.className = "passcode-lock-lockout";
        lockoutDiv.style.display = "none";

        // Mensagem de erro
        const errorDiv = document.createElement("div");
        errorDiv.className = "passcode-lock-error";
        errorDiv.id = "passcode-error-message";
        errorDiv.style.display = "none";

        // Biometric authentication (se habilitado) - será implementado em breve
        // let biometricDiv: HTMLDivElement | null = null;
        // if (false && this.isBiometricAvailable()) { // enableBiometric será implementado em breve
        //     biometricDiv = document.createElement("div");
        //     biometricDiv.className = "passcode-lock-biometric";
        //     biometricDiv.innerHTML = `
        //         <div class="passcode-lock-biometric-icon">👆</div>
        //         <div class="passcode-lock-biometric-text">${Locale.t("lock.biometric")}</div>
        //     `;
        //     biometricDiv.onclick = () => this.authenticateBiometric();
        // }

        // Adicionar logo da Nyxis
        const logoContainer = document.createElement("div");
        logoContainer.className = "passcode-lock-logo-container";
        logoContainer.id = "passcode-logo-container";
        
        const logo = document.createElement("div");
        logo.className = "passcode-lock-logo";
        logo.id = "passcode-logo";
        logo.textContent = "NYXÍS";
        
        logoContainer.appendChild(logo);

        // Montar elementos
        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(inputDisplay);
        container.appendChild(keypad);
        container.appendChild(logoContainer);
        container.appendChild(errorDiv);
        container.appendChild(attemptsDiv);
        container.appendChild(lockoutDiv);
        
        // if (biometricDiv) {
        //     container.appendChild(biometricDiv);
        // }

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Atualizar tentativas
        this.updateAttemptsDisplay(attemptsDiv, lockoutDiv);
        
    },

    hideLockScreen() {
        const overlay = document.getElementById("passcode-lock-overlay");
        if (overlay) {
            overlay.remove();
        }
    },

    addDigit(digit: string) {
        const passwordType = this.settings.store.passwordType;
        const maxLength = passwordType === "4" ? 4 : passwordType === "6" ? 6 : this.settings.store.password.length;
        
        if (this.currentPassword.length >= maxLength) return;

        this.currentPassword += digit;
        this.updatePasswordDisplay();

        // Verificar se a senha está completa baseada no tipo selecionado
        if (this.currentPassword.length === maxLength) {
            this.validatePassword();
        }
    },

    removeDigit() {
        if (this.currentPassword.length > 0) {
            this.currentPassword = this.currentPassword.slice(0, -1);
            this.updatePasswordDisplay();
        }
    },

    updatePasswordDisplay() {
        const passwordType = this.settings.store.passwordType;
        const passwordLength = passwordType === "4" ? 4 : passwordType === "6" ? 6 : this.settings.store.password.length;
        const dotsContainer = document.getElementById("passcode-dots-container");
        
        if (!dotsContainer) return;
        
        // Verificar se o número de bolinhas precisa ser atualizado
        const currentDots = dotsContainer.children.length;
        
        if (currentDots !== passwordLength) {
            // Recriar as bolinhas se o tamanho da senha mudou
            dotsContainer.innerHTML = '';
            
            for (let i = 0; i < passwordLength; i++) {
                const dot = document.createElement("div");
                dot.className = "passcode-lock-dot";
                dot.id = `passcode-dot-${i}`;
                dotsContainer.appendChild(dot);
            }
        }
        
        // Atualizar cada bolinha individualmente
        for (let i = 0; i < passwordLength; i++) {
            const dot = document.getElementById(`passcode-dot-${i}`);
            if (dot) {
                if (i < this.currentPassword.length) {
                    // "Ligar" a bolinha se há um caractere correspondente
                    dot.classList.add("filled");
                } else {
                    // "Desligar" a bolinha se não há caractere correspondente
                    dot.classList.remove("filled");
                }
            }
        }
    },

    getKeypadLetters(num: number): string {
        const letters: { [key: number]: string } = {
            2: "ABC", 3: "DEF", 4: "GHI", 5: "JKL",
            6: "MNO", 7: "PQRS", 8: "TUV", 9: "WXYZ"
        };
        return letters[num] || "";
    },

    async validatePassword() {
        
        let isValid = false;
        
        if (this.settings.store.usePasswordHashing && this.settings.store.hashedPassword) {
            // Usar verificação com hash
            try {
                isValid = await PasswordHasher.verifyPassword(this.currentPassword, this.settings.store.hashedPassword);
            } catch (error) {
                console.error('PasscodeLock:', Locale.t("log.verificationError"), error);
                isValid = false;
            }
        } else {
            // Usar verificação simples (fallback)
            isValid = this.currentPassword === this.settings.store.password;
        }
        
        if (isValid) {
            this.unlock();
        } else {
            this.handleFailedAttempt();
            
            // Mensagens diferentes baseadas no número de tentativas
            const remainingAttempts = this.settings.store.maxAttempts - this.attempts;
            let errorMessage = Locale.t("error.wrongPassword");
            
            if (remainingAttempts <= 2) {
                errorMessage = Locale.t("error.wrongPasswordWarning", { count: remainingAttempts.toString() });
            } else if (remainingAttempts <= 1) {
                errorMessage = Locale.t("error.lastAttempt");
            }
            
            this.showErrorMessage(errorMessage);
            this.shakeScreen();
            this.clearPassword();
        }
    },

    clearPassword() {
        this.currentPassword = "";
        this.updatePasswordDisplay();
    },

    showCooldownScreen() {
        // Esconder tela de senha se estiver visível
        this.hideLockScreen();
        
        // Criar tela de cooldown
        const cooldownOverlay = document.createElement("div");
        cooldownOverlay.className = "passcode-lock-cooldown";
        cooldownOverlay.id = "passcode-cooldown-screen";

        const container = document.createElement("div");
        container.className = "passcode-lock-cooldown-container";

        // Ícone de bloqueio
        const icon = document.createElement("div");
        icon.className = "passcode-lock-cooldown-icon";
        icon.textContent = "🔒";

        // Título
        const title = document.createElement("div");
        title.className = "passcode-lock-cooldown-title";
        title.textContent = Locale.t("cooldown.title");

        // Timer
        const timer = document.createElement("div");
        timer.className = "passcode-lock-cooldown-timer";
        timer.id = "cooldown-timer";

        // Nível de cooldown
        const level = document.createElement("div");
        level.className = "passcode-lock-cooldown-level";
        level.id = "cooldown-level";

        // Mensagem
        const message = document.createElement("div");
        message.className = "passcode-lock-cooldown-message";
        message.textContent = Locale.t("cooldown.message");

        // Montar elementos
        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(timer);
        container.appendChild(level);
        container.appendChild(message);
        cooldownOverlay.appendChild(container);

        // Adicionar ao DOM
        document.body.appendChild(cooldownOverlay);
        this.cooldownScreen = cooldownOverlay;

        // Iniciar atualização do timer
        this.startCooldownTimer();
    },

    startCooldownTimer() {
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
        }

        this.cooldownInterval = setInterval(() => {
            if (!this.lockoutUntil) {
                this.hideCooldownScreen();
                return;
            }

            const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
            
            if (remainingTime <= 0) {
                this.hideCooldownScreen();
                return;
            }

            // Atualizar timer
            const timerElement = document.getElementById("cooldown-timer");
            if (timerElement) {
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                
                if (minutes > 0) {
                    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    timerElement.textContent = `${seconds}s`;
                }
            }

            // Atualizar nível
            const levelElement = document.getElementById("cooldown-level");
            if (levelElement) {
                if (this.cooldownLevel > 1) {
                    levelElement.textContent = Locale.t("cooldown.level", { level: this.cooldownLevel.toString() });
                } else {
                    levelElement.textContent = Locale.t("cooldown.first");
                }
            }
        }, 1000);
    },

    hideCooldownScreen() {
        if (this.cooldownInterval) {
            clearInterval(this.cooldownInterval);
            this.cooldownInterval = null;
        }

        if (this.cooldownScreen) {
            this.cooldownScreen.remove();
            this.cooldownScreen = null;
        }

        // Se ainda estiver bloqueado, mostrar tela de senha novamente
        if (this.isLocked) {
            this.showLockScreen();
        }
    },

    showErrorMessage(message: string) {
        this.errorMessage = message;
        this.showError = true;
        
        const errorDiv = document.getElementById("passcode-error-message");
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = "block";
            errorDiv.classList.add("show");
            
            // Esconder a mensagem após 3 segundos
            setTimeout(() => {
                errorDiv.classList.remove("show");
                setTimeout(() => {
                    errorDiv.style.display = "none";
                    this.showError = false;
                }, 300);
            }, 3000);
        }
    },

    shakeScreen() {
        const container = document.querySelector(".passcode-lock-container");
        if (container) {
            container.classList.add("shake");
            
            // Remover a classe após a animação
            setTimeout(() => {
                container.classList.remove("shake");
            }, 500);
        }
    },

    lock() {
        if (!this.settings.store.enabled || !this.settings.store.password) {
            return;
        }
        
        this.isLocked = true;
        this.currentPassword = "";
        this.attempts = 0;
        this.lockoutUntil = null;
        
        // Proteger canais de voz se habilitado
        if (this.settings.store.protectVoiceChannels) {
            this.protectVoiceChannels();
        }
        
        this.showLockScreen();
    },

    unlock() {
        
        // Limpar senha ANTES de esconder a tela
        this.currentPassword = "";
        
        // Definir isLocked como false ANTES de esconder a tela
        this.isLocked = false;
        
        this.hideLockScreen();
        this.hideCooldownScreen();
        this.attempts = 0;
        this.lockoutUntil = null;
        // Resetar cooldown progressivo quando desbloqueia com sucesso
        this.cooldownLevel = 0;
        this.cooldownMultiplier = 1;
        
    },

    handleFailedAttempt() {
        this.attempts++;
        
        if (this.attempts >= this.settings.store.maxAttempts) {
            // Calcular cooldown progressivo: tempo base * multiplicador
            const baseCooldown = this.settings.store.cooldownBaseTime;
            const cooldownTime = baseCooldown * this.cooldownMultiplier;
            
            this.lockoutUntil = Date.now() + (cooldownTime * 1000);
            
            // Aumentar o multiplicador para a próxima vez (máximo 10x = 5 minutos)
            this.cooldownLevel++;
            this.cooldownMultiplier = Math.min(this.cooldownLevel, 10);
            
            // Resetar tentativas para a próxima rodada
            this.attempts = 0;
            
            // Mostrar tela de cooldown
            this.showCooldownScreen();
        }
    },

    updateAttemptsDisplay(attemptsDiv: HTMLElement, lockoutDiv: HTMLElement) {
        if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
            const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            
            let timeText = "";
            if (minutes > 0) {
                timeText = `${minutes}m ${seconds}s`;
            } else {
                timeText = `${seconds}s`;
            }
            
            // Mostrar nível de cooldown se for maior que 1
            let cooldownInfo = "";
            if (this.cooldownLevel > 1) {
                cooldownInfo = ` ${Locale.t("lock.lockoutLevel", { level: this.cooldownLevel.toString() })}`;
            }
            
            lockoutDiv.textContent = Locale.t("lock.lockout", { time: timeText }) + cooldownInfo;
            lockoutDiv.style.display = "block";
            attemptsDiv.style.display = "none";
        } else if (this.attempts > 0) {
            attemptsDiv.textContent = Locale.t("lock.attempts", { count: (this.settings.store.maxAttempts - this.attempts).toString() });
            attemptsDiv.style.display = "block";
            lockoutDiv.style.display = "none";
        } else {
            attemptsDiv.style.display = "none";
            lockoutDiv.style.display = "none";
        }
    },

    isBiometricAvailable(): boolean {
        return 'credentials' in navigator && 'create' in navigator.credentials;
    },

    protectVoiceChannels() {
        // Desconectar de canais de voz se estiver conectado
        try {
            // Tentar encontrar e usar a API de voz do Discord
            const voiceModule = findByPropsLazy("getVoiceChannelId", "getVoiceState");
            if (voiceModule && voiceModule.getVoiceChannelId) {
                const currentChannelId = voiceModule.getVoiceChannelId();
                if (currentChannelId) {
                    // Desconectar do canal de voz
                    const voiceActions = findByPropsLazy("disconnect", "selectVoiceChannel");
                    if (voiceActions && voiceActions.disconnect) {
                        voiceActions.disconnect();
                    }
                }
            }
        } catch (error) {
            console.error('PasscodeLock:', Locale.t("log.voiceProtectionError"), error);
        }
    },

    async authenticateBiometric() {
        try {
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: new Uint8Array(32),
                    rp: { name: "Discord" },
                    user: {
                        id: new Uint8Array(16),
                        name: "user",
                        displayName: "User"
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform"
                    },
                    timeout: 60000,
                    attestation: "direct"
                }
            });

            if (credential) {
                this.unlock();
            }
        } catch (error) {
            console.error("Biometric authentication failed:", error);
        }
    }
});