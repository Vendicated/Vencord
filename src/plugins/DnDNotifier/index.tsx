import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findByProps } from "@webpack";
import { React } from "@webpack/common";

// ── DataStore (Vencord API) — büyük veri için güvenli depolama
let DataStore: any;
const DS_KEY = "DnDNotifier_userSounds";

// ── Dış store referansları
let UserStore: any;
let PresenceStore: any;
let ChannelStore: any;

// ── Ses motoru
let audio: HTMLAudioElement = new Audio();
let currentSoundUrl: string = "";

// ── Cooldown takibi
let lastPlayedAt: number = 0;

// ── Varsayılan ses (boş = çalma)
const defaultSound: string = "";

// ── Config versiyonu — migration için
const CONFIG_VERSION = 1;

// ── Kullanıcı başına ses verisi tipi
interface UserSound {
    userId: string;
    label: string;
    url: string;
    fileName: string;
    needsReupload?: boolean;
}

// ── Export config şeması
interface ExportConfig {
    version: number;
    exportedAt: string;
    language: string;
    customSoundUrl: string;
    volume: number;
    enabled: boolean;
    onlyMentions: boolean;
    includeGroupDMs: boolean;
    cooldownSeconds: number;
    userSounds: UserSound[];
}

// ── Discord kanal tipleri
const CHANNEL_TYPE_DM    = 1;
const CHANNEL_TYPE_GROUP = 3;

// ══════════════════════════════════════════════════════════════
//  i18n
// ══════════════════════════════════════════════════════════════
const i18n = {
    en: {
        langLabel:             "Language",
        sectionDefault:        "🔔  Default Sound",
        urlLabel:              "Sound URL",
        urlPlaceholder:        "https://files.catbox.moe/xxx.mp3",
        urlDesc:               "Direct MP3 / WAV / OGG / AAC / WEBM link",
        uploadBtn:             "📁  Upload Sound File",
        testBtn:               "🔊  Test",
        resetBtn:              "🔄  Reset",
        fileLoaded:            "✅  Loaded: ",
        invalidUrl:            "⚠️  Invalid URL! Must end with .mp3 / .wav / .ogg / .aac / .webm",
        sectionVolume:         "🔈  Volume",
        sectionBehavior:       "⚙️  Behavior",
        enabledLabel:          "Enable Sounds",
        enabledDesc:           "Quickly pause/resume without disabling the plugin.",
        onlyMentionsLabel:     "@Mentions Only",
        onlyMentionsDesc:      "Only play sound when you are directly mentioned.",
        groupDMsLabel:         "Include Group DMs",
        groupDMsDesc:          "Also play for messages in group DM channels.",
        cooldownLabel:         "Cooldown (seconds)",
        cooldownDesc:          "Minimum wait time between sounds to prevent spam. (0 = disabled)",
        sectionConfig:         "🗂️  Configuration",
        exportBtn:             "💾  Export Config",
        importBtn:             "📂  Import Config",
        importSuccess:         "✅  Config imported successfully!",
        importError:           "⚠️  Invalid or incompatible config file.",
        dragDropHint:          "or drag & drop a .json file here",
        dragging:              "📂  Drop to import…",
        needsReupload:         "⚠️  Sound file needs to be re-uploaded (local files don't export)",
        perUserTitle:          "🎵  Per-User Custom Sounds",
        perUserDesc:           "Assign a different sound to specific users.",
        addUserBtn:            "➕  Add User",
        removeBtn:             "✕",
        userIdPlaceholder:     "Discord User ID",
        userLabelPlaceholder:  "Note (e.g. John)",
        userUrlPlaceholder:    "Sound URL",
        uploadForUser:         "📁",
        testForUser:           "🔊",
        noUsers:               "No custom users added yet.",
    },
    tr: {
        langLabel:             "Dil",
        sectionDefault:        "🔔  Varsayılan Ses",
        urlLabel:              "Ses URL'si",
        urlPlaceholder:        "https://files.catbox.moe/xxx.mp3",
        urlDesc:               "Direkt MP3 / WAV / OGG / AAC / WEBM linki gir",
        uploadBtn:             "📁  Bilgisayardan Ses Yükle",
        testBtn:               "🔊  Test",
        resetBtn:              "🔄  Sıfırla",
        fileLoaded:            "✅  Yüklendi: ",
        invalidUrl:            "⚠️  Geçersiz URL! .mp3 / .wav / .ogg / .aac / .webm ile bitmeli.",
        sectionVolume:         "🔈  Ses Seviyesi",
        sectionBehavior:       "⚙️  Davranış Ayarları",
        enabledLabel:          "Sesleri Etkinleştir",
        enabledDesc:           "Plugin'i devre dışı bırakmadan hızlıca duraklat/devam et.",
        onlyMentionsLabel:     "Yalnızca @Bahsetme",
        onlyMentionsDesc:      "Yalnızca doğrudan bahsedildiğinde ses çal.",
        groupDMsLabel:         "Grup DM'leri Dahil Et",
        groupDMsDesc:          "Grup DM kanallarındaki mesajlarda da ses çal.",
        cooldownLabel:         "Bekleme Süresi (saniye)",
        cooldownDesc:          "Ses spam'ini önlemek için minimum bekleme. (0 = devre dışı)",
        sectionConfig:         "🗂️  Yapılandırma",
        exportBtn:             "💾  Dışa Aktar",
        importBtn:             "📂  İçe Aktar",
        importSuccess:         "✅  Yapılandırma başarıyla içe aktarıldı!",
        importError:           "⚠️  Geçersiz veya uyumsuz yapılandırma dosyası.",
        dragDropHint:          "veya .json dosyasını buraya sürükle & bırak",
        dragging:              "📂  Bırak ve içe aktar…",
        needsReupload:         "⚠️  Ses dosyası yeniden yüklenmeli (yerel dosyalar dışa aktarılmaz)",
        perUserTitle:          "🎵  Kişiye Özel Sesler",
        perUserDesc:           "Belirli kullanıcılar için farklı ses ayarla.",
        addUserBtn:            "➕  Kullanıcı Ekle",
        removeBtn:             "✕",
        userIdPlaceholder:     "Discord Kullanıcı ID",
        userLabelPlaceholder:  "Not (örn. Ahmet)",
        userUrlPlaceholder:    "Ses URL'si",
        uploadForUser:         "📁",
        testForUser:           "🔊",
        noUsers:               "Henüz kullanıcı eklenmedi.",
    }
};

// ══════════════════════════════════════════════════════════════
//  DataStore yardımcıları
// ══════════════════════════════════════════════════════════════
const getUserSoundsAsync = async (): Promise<UserSound[]> => {
    try {
        if (DataStore) {
            const data = await DataStore.get(DS_KEY);
            return Array.isArray(data) ? data : [];
        }
        return JSON.parse(settings.store._userSounds || "[]");
    } catch { return []; }
};

const saveUserSoundsAsync = async (list: UserSound[]) => {
    try {
        if (DataStore) {
            await DataStore.set(DS_KEY, list);
            settings.store._userSounds = JSON.stringify(list);
        } else {
            settings.store._userSounds = JSON.stringify(list);
        }
    } catch {}
};

const getUserSoundsSync = (): UserSound[] => {
    try { return JSON.parse(settings.store._userSounds || "[]"); }
    catch { return []; }
};

// ══════════════════════════════════════════════════════════════
//  Yardımcı fonksiyonlar
// ══════════════════════════════════════════════════════════════
const isValidUrl = (url: string): boolean => {
    if (url.startsWith("data:audio/")) return true; // Base64 Desteği eklendi
    try {
        const u = new URL(url);
        return (u.protocol === "http:" || u.protocol === "https:") &&
            /\.(mp3|wav|ogg|aac|webm)$/i.test(u.pathname);
    } catch { return false; }
};

const safeBlobRevoke = (url: string | undefined) => {
    if (url?.startsWith("blob:")) {
        try { URL.revokeObjectURL(url); } catch {}
    }
};

const sanitizeBlobsOnStart = () => {
    // Sadece eski blob'ları temizler, data (Base64) kalıcıdır.
    if (settings.store.customSoundUrl?.startsWith("blob:")) {
        settings.store.customSoundUrl = "";
        settings.store._localFileName = "";
    }
    const list = getUserSoundsSync();
    let changed = false;
    for (const u of list) {
        if (u.url.startsWith("blob:")) {
            u.url = "";
            u.fileName = "";
            u.needsReupload = true;
            changed = true;
        }
    }
    if (changed) {
        settings.store._userSounds = JSON.stringify(list);
        if (DataStore) DataStore.set(DS_KEY, list).catch(() => {});
    }
};

// ── Export (Base64 artık dışa aktarılıyor)
const exportConfig = async (userSounds: UserSound[]) => {
    const snapshot: ExportConfig = {
        version:        CONFIG_VERSION,
        exportedAt:     new Date().toISOString(),
        language:       settings.store.language ?? "en",
        customSoundUrl: settings.store.customSoundUrl?.startsWith("blob:") ? "" : (settings.store.customSoundUrl ?? ""),
        volume:         settings.store.volume ?? 100,
        enabled:        settings.store.enabled ?? true,
        onlyMentions:   settings.store.onlyMentions ?? false,
        includeGroupDMs: settings.store.includeGroupDMs ?? false,
        cooldownSeconds: settings.store.cooldownSeconds ?? 3,
        userSounds: userSounds.map(u => ({
            userId:   u.userId,
            label:    u.label,
            url:      u.url.startsWith("blob:") ? "" : u.url,
            fileName: u.url.startsWith("blob:") ? "" : u.fileName,
            needsReupload: u.url.startsWith("blob:") ? true : (u.needsReupload ?? false),
        })),
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href     = blobUrl;
    a.download = `DnDNotifier-config-v${CONFIG_VERSION}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
};

// ── Import
const applyImport = async (raw: string): Promise<"ok" | "error"> => {
    try {
        const data = JSON.parse(raw);
        if (typeof data !== "object" || data === null) return "error";

        const version = typeof data.version === "number" ? data.version : 0;
        if (version > CONFIG_VERSION) return "error";

        if (typeof data.language        === "string")  settings.store.language        = data.language;
        if (typeof data.customSoundUrl  === "string")  settings.store.customSoundUrl  = data.customSoundUrl;
        if (typeof data.volume          === "number")  settings.store.volume          = data.volume;
        if (typeof data.enabled         === "boolean") settings.store.enabled         = data.enabled;
        if (typeof data.onlyMentions    === "boolean") settings.store.onlyMentions    = data.onlyMentions;
        if (typeof data.includeGroupDMs === "boolean") settings.store.includeGroupDMs = data.includeGroupDMs;
        if (typeof data.cooldownSeconds === "number")  settings.store.cooldownSeconds = data.cooldownSeconds;

        if (Array.isArray(data.userSounds)) {
            const validated: UserSound[] = data.userSounds
                .filter((u: any) => typeof u === "object" && u !== null)
                .map((u: any) => ({
                    userId:        typeof u.userId   === "string" ? u.userId   : "",
                    label:         typeof u.label    === "string" ? u.label    : "",
                    url:           typeof u.url      === "string" ? u.url      : "",
                    fileName:      typeof u.fileName === "string" ? u.fileName : "",
                    needsReupload: u.needsReupload === true,
                }));
            await saveUserSoundsAsync(validated);
        }

        settings.store._localFileName = "";
        return "ok";
    } catch { return "error"; }
};

// ══════════════════════════════════════════════════════════════
//  Stil sabitleri
// ══════════════════════════════════════════════════════════════
const btnBase: React.CSSProperties = {
    background:    "rgba(255,255,255,0.08)",
    color:         "rgba(255,255,255,0.85)",
    border:        "1px solid rgba(255,255,255,0.15)",
    borderRadius:  "6px",
    padding:       "7px 14px",
    cursor:        "pointer",
    fontWeight:    "700",
    fontSize:      "13px",
    letterSpacing: "0.2px",
    transition:    "background 0.2s",
};

const btnReset: React.CSSProperties = {
    ...btnBase,
    background: "rgba(255,255,255,0.04)",
    color:      "rgba(255,255,255,0.45)",
    border:     "1px solid rgba(255,255,255,0.08)",
};

const btnDanger: React.CSSProperties = {
    ...btnBase,
    background: "rgba(255,60,60,0.15)",
    color:      "rgba(255,100,100,0.9)",
    border:     "1px solid rgba(255,60,60,0.2)",
    padding:    "5px 10px",
    fontSize:   "12px",
};

const btnSmall: React.CSSProperties = {
    ...btnBase,
    padding:  "5px 10px",
    fontSize: "12px",
};

const btnSuccess: React.CSSProperties = {
    ...btnBase,
    background: "rgba(59,165,93,0.18)",
    color:      "rgba(100,210,130,0.9)",
    border:     "1px solid rgba(59,165,93,0.25)",
};

const labelStyle: React.CSSProperties = {
    fontSize:      "11px",
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
};

const inputStyle: React.CSSProperties = {
    width:        "100%",
    background:   "rgba(255,255,255,0.06)",
    border:       "1px solid rgba(255,255,255,0.12)",
    borderRadius: "6px",
    padding:      "7px 10px",
    color:        "rgba(255,255,255,0.85)",
    fontSize:     "13px",
    fontWeight:   "600",
    outline:      "none",
    boxSizing:    "border-box" as const,
};

const dividerStyle: React.CSSProperties = {
    borderTop: "1px solid rgba(255,255,255,0.07)",
    margin:    "4px 0",
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize:      "13px",
    fontWeight:    "800",
    color:         "rgba(255,255,255,0.7)",
    letterSpacing: "0.3px",
};

const toggleRowStyle: React.CSSProperties = {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    gap:            "12px",
};

const toggleLabelGroupStyle: React.CSSProperties = {
    display:       "flex",
    flexDirection: "column",
    gap:           "2px",
};

// ══════════════════════════════════════════════════════════════
//  Toggle Bileşeni
// ══════════════════════════════════════════════════════════════
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    const trackStyle: React.CSSProperties = {
        width:        "36px",
        height:       "20px",
        borderRadius: "10px",
        background:   value ? "rgba(88,101,242,0.85)" : "rgba(255,255,255,0.12)",
        border:       "1px solid " + (value ? "rgba(88,101,242,1)" : "rgba(255,255,255,0.18)"),
        position:     "relative",
        cursor:       "pointer",
        flexShrink:   0,
        transition:   "background 0.2s, border-color 0.2s",
    };
    const thumbStyle: React.CSSProperties = {
        position:     "absolute",
        top:          "2px",
        left:         value ? "17px" : "2px",
        width:        "14px",
        height:       "14px",
        borderRadius: "50%",
        background:   "rgba(255,255,255,0.95)",
        transition:   "left 0.2s",
    };
    return React.createElement(
        "div",
        { style: trackStyle, onClick: () => onChange(!value), role: "switch", "aria-checked": value },
        React.createElement("div", { style: thumbStyle })
    );
}

// ══════════════════════════════════════════════════════════════
//  Ayarlar Paneli
// ══════════════════════════════════════════════════════════════
const settings = definePluginSettings({
    mainPanel: {
        type:        OptionType.COMPONENT,
        description: "",
        component:   () => {
            const [, forceUpdate]   = React.useReducer((x: number) => x + 1, 0);
            const [statusMsg, setStatusMsg]       = React.useState<string>("");
            const [userSounds, setUserSounds]     = React.useState<UserSound[]>([]);
            const [isDragging, setIsDragging]     = React.useState<boolean>(false);

            React.useEffect(() => {
                getUserSoundsAsync().then(list => setUserSounds(list));
            }, []);

            const lang          = (settings.store.language ?? "en") as "en" | "tr";
            const t             = i18n[lang];
            const url           = settings.store.customSoundUrl ?? "";
            const fileName      = settings.store._localFileName ?? "";
            const volume        = settings.store.volume ?? 100;
            const enabled       = settings.store.enabled ?? true;
            const onlyMentions  = settings.store.onlyMentions ?? false;
            const includeGroups = settings.store.includeGroupDMs ?? false;
            const cooldown      = settings.store.cooldownSeconds ?? 3;

            const showInvalidWarning =
                url !== "" && !url.startsWith("blob:") && !url.startsWith("data:") && !isValidUrl(url);

            const showStatus = (msg: string) => {
                setStatusMsg(msg);
                setTimeout(() => setStatusMsg(""), 3500);
            };

            const saveAndRefresh = async (list: UserSound[]) => {
                await saveUserSoundsAsync(list);
                setUserSounds([...list]);
            };

            // ── Dosya Yükleme (Base64'e dönüştürülür)
            const handleUploadDefault = () => {
                const input    = document.createElement("input");
                input.type     = "file";
                input.accept   = "audio/*";
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    
                    // 2MB Sınırı - JSON şişmesini ve performansı korumak için
                    if (file.size > 2 * 1024 * 1024) {
                        alert(lang === "tr" ? "Dosya çok büyük! JSON ayar dosyasının şişmemesi için maksimum 2MB izin verilir." : "File is too large! Max 2MB allowed to prevent JSON bloating.");
                        return;
                    }

                    const reader = new FileReader();
                    reader.onloadend = () => {
                        safeBlobRevoke(settings.store.customSoundUrl);
                        settings.store.customSoundUrl = reader.result as string;
                        settings.store._localFileName = file.name;
                        forceUpdate();
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            };

            // ── Dosya Yükleme (Kişiye Özel - Base64'e dönüştürülür)
            const handleUploadForUser = (index: number) => {
                const input    = document.createElement("input");
                input.type     = "file";
                input.accept   = "audio/*";
                input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;

                    if (file.size > 2 * 1024 * 1024) {
                        alert(lang === "tr" ? "Dosya çok büyük! JSON ayar dosyasının şişmemesi için maksimum 2MB izin verilir." : "File is too large! Max 2MB allowed to prevent JSON bloating.");
                        return;
                    }

                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const list = [...userSounds];
                        safeBlobRevoke(list[index]?.url);
                        list[index].url          = reader.result as string;
                        list[index].fileName     = file.name;
                        list[index].needsReupload = false;
                        await saveAndRefresh(list);
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            };

            const playSound = (soundUrl: string) => {
                if (!soundUrl?.trim()) return;
                const a = new Audio(soundUrl);
                a.volume = Math.min(1, Math.max(0, volume / 100));
                a.play().catch((e: Error) =>
                    console.error("[DnDNotifier] Test sound failed:", e)
                );
            };

            const handleImportRaw = async (raw: string) => {
                const result = await applyImport(raw);
                if (result === "ok") {
                    const updated = await getUserSoundsAsync();
                    setUserSounds(updated);
                    forceUpdate();
                    showStatus(t.importSuccess);
                } else {
                    showStatus(t.importError);
                }
            };

            const handleImportClick = () => {
                const input   = document.createElement("input");
                input.type    = "file";
                input.accept  = "application/json,.json";
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => handleImportRaw(reader.result as string);
                    reader.readAsText(file);
                };
                input.click();
            };

            const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
            };

            const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDragging(false);
            };

            const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (!file || !file.name.endsWith(".json")) {
                    showStatus(t.importError);
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => handleImportRaw(reader.result as string);
                reader.readAsText(file);
            };

            const dropZoneStyle: React.CSSProperties = {
                border:        isDragging
                    ? "2px dashed rgba(88,101,242,0.8)"
                    : "2px dashed rgba(255,255,255,0.1)",
                borderRadius:  "8px",
                padding:       "12px 16px",
                display:       "flex",
                flexDirection: "column",
                gap:           "8px",
                background:    isDragging ? "rgba(88,101,242,0.08)" : "transparent",
                transition:    "border-color 0.2s, background 0.2s",
            };

            return React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: "16px" } },

                React.createElement(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                    React.createElement("span", { style: labelStyle }, t.langLabel),
                    React.createElement(
                        "div",
                        { style: { display: "flex", gap: "6px" } },
                        ...["en", "tr"].map(code =>
                            React.createElement(
                                "button",
                                {
                                    key:     code,
                                    style:   {
                                        ...btnBase,
                                        flex:       1,
                                        background: lang === code ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
                                        border:     lang === code ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.08)",
                                        color:      lang === code ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
                                    },
                                    onClick: () => { settings.store.language = code; forceUpdate(); }
                                },
                                code === "en" ? "🇬🇧  English" : "🇹🇷  Türkçe"
                            )
                        )
                    )
                ),

                React.createElement("div", { style: dividerStyle }),

                React.createElement("span", { style: sectionTitleStyle }, t.sectionBehavior),

                React.createElement(
                    "div",
                    { style: toggleRowStyle },
                    React.createElement(
                        "div",
                        { style: toggleLabelGroupStyle },
                        React.createElement("span", { style: { fontSize: "13px", fontWeight: "700", color: "rgba(255,255,255,0.75)" } }, t.enabledLabel),
                        React.createElement("span", { style: { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "600" } }, t.enabledDesc)
                    ),
                    React.createElement(Toggle, {
                        value:    enabled,
                        onChange: (v) => { settings.store.enabled = v; forceUpdate(); }
                    })
                ),

                React.createElement(
                    "div",
                    { style: toggleRowStyle },
                    React.createElement(
                        "div",
                        { style: toggleLabelGroupStyle },
                        React.createElement("span", { style: { fontSize: "13px", fontWeight: "700", color: "rgba(255,255,255,0.75)" } }, t.onlyMentionsLabel),
                        React.createElement("span", { style: { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "600" } }, t.onlyMentionsDesc)
                    ),
                    React.createElement(Toggle, {
                        value:    onlyMentions,
                        onChange: (v) => { settings.store.onlyMentions = v; forceUpdate(); }
                    })
                ),

                React.createElement(
                    "div",
                    { style: toggleRowStyle },
                    React.createElement(
                        "div",
                        { style: toggleLabelGroupStyle },
                        React.createElement("span", { style: { fontSize: "13px", fontWeight: "700", color: "rgba(255,255,255,0.75)" } }, t.groupDMsLabel),
                        React.createElement("span", { style: { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "600" } }, t.groupDMsDesc)
                    ),
                    React.createElement(Toggle, {
                        value:    includeGroups,
                        onChange: (v) => { settings.store.includeGroupDMs = v; forceUpdate(); }
                    })
                ),

                React.createElement(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                    React.createElement(
                        "div",
                        { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline" } },
                        React.createElement("span", { style: labelStyle }, t.cooldownLabel),
                        React.createElement(
                            "span",
                            { style: { fontSize: "13px", fontWeight: "700", color: "rgba(255,255,255,0.6)" } },
                            cooldown + "s"
                        )
                    ),
                    React.createElement("span", { style: { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "600" } }, t.cooldownDesc),
                    React.createElement("input", {
                        type:     "range",
                        min:      0,
                        max:      30,
                        step:     1,
                        value:    cooldown,
                        style:    { width: "100%", accentColor: "rgba(255,255,255,0.5)", cursor: "pointer" },
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                            settings.store.cooldownSeconds = Number(e.target.value);
                            forceUpdate();
                        }
                    })
                ),

                React.createElement("div", { style: dividerStyle }),

                React.createElement("span", { style: sectionTitleStyle }, t.sectionConfig),

                React.createElement(
                    "div",
                    {
                        style:       dropZoneStyle,
                        onDragOver:  handleDragOver,
                        onDragLeave: handleDragLeave,
                        onDrop:      handleDrop,
                    },
                    React.createElement(
                        "div",
                        { style: { display: "flex", gap: "8px" } },
                        React.createElement(
                            "button",
                            {
                                style:   { ...btnBase, flex: 1 },
                                onClick: () => exportConfig(userSounds)
                            },
                            t.exportBtn
                        ),
                        React.createElement(
                            "button",
                            { style: { ...btnSuccess, flex: 1 }, onClick: handleImportClick },
                            t.importBtn
                        )
                    ),
                    React.createElement(
                        "span",
                        {
                            style: {
                                fontSize:  "11px",
                                color:     isDragging ? "rgba(88,101,242,0.9)" : "rgba(255,255,255,0.2)",
                                fontWeight: "600",
                                textAlign: "center" as const,
                                transition: "color 0.2s",
                            }
                        },
                        isDragging ? t.dragging : t.dragDropHint
                    )
                ),

                statusMsg !== "" && React.createElement(
                    "span",
                    {
                        style: {
                            fontSize:   "12px",
                            fontWeight: "700",
                            color:      statusMsg.startsWith("✅")
                                ? "rgba(100,210,130,0.9)"
                                : "var(--status-danger)",
                        }
                    },
                    statusMsg
                ),

                React.createElement("div", { style: dividerStyle }),

                React.createElement("span", { style: sectionTitleStyle }, t.sectionDefault),

                React.createElement(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                    React.createElement("span", { style: labelStyle }, t.urlLabel),
                    React.createElement("span", { style: { fontSize: "12px", color: "rgba(255,255,255,0.3)", fontWeight: "600" } }, t.urlDesc),
                    React.createElement("input", {
                        type:        "text",
                        placeholder: url.startsWith("data:") ? `[Yerel Dosya: ${fileName || "Ses"}]` : t.urlPlaceholder,
                        value:       url.startsWith("blob:") || url.startsWith("data:") ? "" : url, // devasa Base64 metnini arayüzde gizlemek için
                        style:       inputStyle,
                        onChange:    (e: React.ChangeEvent<HTMLInputElement>) => {
                            safeBlobRevoke(settings.store.customSoundUrl);
                            settings.store.customSoundUrl = e.target.value;
                            settings.store._localFileName = "";
                            forceUpdate();
                        }
                    }),
                    showInvalidWarning && React.createElement(
                        "span",
                        { style: { fontSize: "12px", color: "var(--status-danger)", fontWeight: "700" } },
                        t.invalidUrl
                    )
                ),

                React.createElement(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                    React.createElement("button", { style: btnBase, onClick: handleUploadDefault }, t.uploadBtn),
                    fileName !== "" && React.createElement(
                        "span",
                        { style: { fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "600" } },
                        t.fileLoaded + fileName
                    )
                ),

                React.createElement(
                    "div",
                    { style: { display: "flex", gap: "8px", flexWrap: "wrap" as const } },
                    React.createElement("button", {
                        style:   btnBase,
                        onClick: () => playSound(settings.store.customSoundUrl?.trim())
                    }, t.testBtn),
                    React.createElement("button", {
                        style:   btnReset,
                        onClick: () => {
                            safeBlobRevoke(settings.store.customSoundUrl);
                            settings.store.customSoundUrl = defaultSound;
                            settings.store._localFileName = "";
                            settings.store.volume         = 100;
                            audio.pause();
                            audio.src       = "";
                            currentSoundUrl = "";
                            lastPlayedAt    = 0;
                            forceUpdate();
                        }
                    }, t.resetBtn)
                ),

                React.createElement("div", { style: dividerStyle }),

                React.createElement("span", { style: sectionTitleStyle }, t.sectionVolume),
                React.createElement(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                    React.createElement(
                        "span",
                        { style: { fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: "700" } },
                        volume + "%"
                    ),
                    React.createElement("input", {
                        type:     "range",
                        min:      0,
                        max:      100,
                        step:     1,
                        value:    volume,
                        style:    { width: "100%", accentColor: "rgba(255,255,255,0.5)", cursor: "pointer" },
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                            settings.store.volume = Number(e.target.value);
                            forceUpdate();
                        }
                    })
                ),

                React.createElement("div", { style: dividerStyle }),

                React.createElement("span", { style: sectionTitleStyle }, t.perUserTitle),
                React.createElement(
                    "span",
                    { style: { fontSize: "12px", color: "rgba(255,255,255,0.3)", fontWeight: "600" } },
                    t.perUserDesc
                ),

                ...userSounds.map((entry, index) => {
                    const perUserInvalid =
                        entry.url !== "" && !entry.url.startsWith("blob:") && !entry.url.startsWith("data:") && !isValidUrl(entry.url);

                    return React.createElement(
                        "div",
                        {
                            key:   index,
                            style: {
                                background:    "rgba(255,255,255,0.04)",
                                border:        "1px solid rgba(255,255,255,0.09)",
                                borderRadius:  "8px",
                                padding:       "12px",
                                display:       "flex",
                                flexDirection: "column" as const,
                                gap:           "8px",
                            }
                        },

                        React.createElement(
                            "div",
                            { style: { display: "flex", gap: "6px", alignItems: "center" } },
                            React.createElement("input", {
                                type:        "text",
                                placeholder: t.userLabelPlaceholder,
                                value:       entry.label,
                                style:       { ...inputStyle, flex: 1 },
                                onChange:    async (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const list = [...userSounds];
                                    list[index].label = e.target.value;
                                    await saveAndRefresh(list);
                                }
                            }),
                            React.createElement("input", {
                                type:        "text",
                                placeholder: t.userIdPlaceholder,
                                value:       entry.userId,
                                style:       { ...inputStyle, flex: 1 },
                                onChange:    async (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const list = [...userSounds];
                                    list[index].userId = e.target.value.trim();
                                    await saveAndRefresh(list);
                                }
                            }),
                            React.createElement(
                                "button",
                                {
                                    style:   btnDanger,
                                    onClick: async () => {
                                        const list = [...userSounds];
                                        safeBlobRevoke(list[index]?.url);
                                        list.splice(index, 1);
                                        await saveAndRefresh(list);
                                    }
                                },
                                t.removeBtn
                            )
                        ),

                        React.createElement(
                            "div",
                            { style: { display: "flex", gap: "6px", alignItems: "center" } },
                            React.createElement("input", {
                                type:        "text",
                                placeholder: entry.url.startsWith("data:") ? `[Yerel: ${entry.fileName || "Ses"}]` : t.userUrlPlaceholder,
                                value:       entry.url.startsWith("blob:") || entry.url.startsWith("data:") ? "" : entry.url,
                                style:       { ...inputStyle, flex: 1 },
                                onChange:    async (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const list = [...userSounds];
                                    safeBlobRevoke(list[index]?.url);
                                    list[index].url          = e.target.value;
                                    list[index].fileName     = "";
                                    list[index].needsReupload = false;
                                    await saveAndRefresh(list);
                                }
                            }),
                            React.createElement(
                                "button",
                                { style: btnSmall, onClick: () => handleUploadForUser(index) },
                                t.uploadForUser
                            ),
                            React.createElement(
                                "button",
                                { style: btnSmall, onClick: () => playSound(entry.url) },
                                t.testForUser
                            )
                        ),

                        entry.needsReupload && React.createElement(
                            "span",
                            { style: { fontSize: "12px", color: "rgba(250,166,26,0.9)", fontWeight: "700" } },
                            t.needsReupload
                        ),

                        perUserInvalid && React.createElement(
                            "span",
                            { style: { fontSize: "12px", color: "var(--status-danger)", fontWeight: "700" } },
                            t.invalidUrl
                        ),

                        entry.fileName !== "" && React.createElement(
                            "span",
                            { style: { fontSize: "11px", color: "rgba(255,255,255,0.35)", fontWeight: "600" } },
                            t.fileLoaded + entry.fileName
                        )
                    );
                }),

                userSounds.length === 0 && React.createElement(
                    "span",
                    { style: { fontSize: "12px", color: "rgba(255,255,255,0.25)", fontWeight: "600" } },
                    t.noUsers
                ),

                React.createElement(
                    "button",
                    {
                        style:   btnBase,
                        onClick: async () => {
                            const list = [...userSounds, { userId: "", label: "", url: "", fileName: "", needsReupload: false }];
                            await saveAndRefresh(list);
                        }
                    },
                    t.addUserBtn
                )
            );
        }
    },

    language:        { type: OptionType.STRING,  default: "en",  description: "", hidden: true },
    customSoundUrl:  { type: OptionType.STRING,  default: "",    description: "", hidden: true },
    volume:          { type: OptionType.NUMBER,  default: 100,   description: "", hidden: true },
    _localFileName:  { type: OptionType.STRING,  default: "",    description: "", hidden: true },
    _userSounds:     { type: OptionType.STRING,  default: "[]",  description: "", hidden: true },
    enabled:         { type: OptionType.BOOLEAN, default: true,  description: "", hidden: true },
    onlyMentions:    { type: OptionType.BOOLEAN, default: false, description: "", hidden: true },
    includeGroupDMs: { type: OptionType.BOOLEAN, default: false, description: "", hidden: true },
    cooldownSeconds: { type: OptionType.NUMBER,  default: 3,     description: "", hidden: true },
});

// ══════════════════════════════════════════════════════════════
//  Plugin tanımı
// ══════════════════════════════════════════════════════════════
export default definePlugin({
    name:        "DnDNotifier",
    description: "Plays a custom notification sound for DMs while in DND mode.",
    authors:     [{ name: "Caney", id: 123456789n }],
    settings,

    flux: {
        MESSAGE_CREATE(data: any) {
            if (!UserStore || !PresenceStore) return;
            if (!(settings.store.enabled ?? true)) return;

            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            const message = data.message;
            if (message.author?.id === currentUser.id) return;
            if (message.guild_id) return;

            const channelId   = message.channel_id;
            const channel     = ChannelStore?.getChannel?.(channelId);
            const channelType = channel?.type;
            const isDM        = channelType === CHANNEL_TYPE_DM;
            const isGroup     = channelType === CHANNEL_TYPE_GROUP;

            if (!isDM && !(isGroup && (settings.store.includeGroupDMs ?? false))) return;

            const status = PresenceStore.getStatus(currentUser.id);
            if (status !== "dnd") return;

            if (settings.store.onlyMentions ?? false) {
                const mentions: any[] = message.mentions ?? [];
                if (!mentions.some((m: any) => m.id === currentUser.id)) return;
            }

            const cooldownMs = (settings.store.cooldownSeconds ?? 3) * 1000;
            const now        = Date.now();
            if (cooldownMs > 0 && now - lastPlayedAt < cooldownMs) return;
            lastPlayedAt = now;

            const userSounds = getUserSoundsSync();
            const authorId   = message.author?.id ?? "";
            const perUser    = userSounds.find(u => u.userId === authorId && u.url?.trim());
            const defaultUrl = settings.store.customSoundUrl?.trim();
            const soundUrl   = perUser?.url?.trim() || defaultUrl || defaultSound;

            if (!soundUrl) return;

            try {
                if (currentSoundUrl !== soundUrl) {
                    audio.src       = soundUrl;
                    audio.load();
                    currentSoundUrl = soundUrl;
                }
                audio.volume      = Math.min(1, Math.max(0, (settings.store.volume ?? 100) / 100));
                audio.currentTime = 0;
                audio.play().catch((e: Error) =>
                    console.error("[DnDNotifier] Failed to play sound:", e)
                );
            } catch (e) {
                console.error("[DnDNotifier] Error:", e);
            }
        }
    },

    start() {
        UserStore     = findByProps("getCurrentUser", "getUser");
        PresenceStore = findByProps("getStatus", "getActivities");
        ChannelStore  = findByProps("getChannel", "getDMFromUserId");

        try {
            DataStore = findByProps("get", "set", "del", "keys");
        } catch {
            DataStore = null;
            console.warn("[DnDNotifier] DataStore unavailable, falling back to settings store.");
        }

        sanitizeBlobsOnStart();
    },

    stop() {
        audio.pause();
        audio.src       = "";
        currentSoundUrl = "";
        lastPlayedAt    = 0;
    }
});
