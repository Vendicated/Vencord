import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { OptionType } from "@utils/types";
import { RenderModalProps } from "@vencord/discord-types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Button, Menu, React, Modal, openModal } from "@webpack/common";

const MediaEngineActions = findByPropsLazy("toggleSelfMute");
const SelectedChannelStore = findStoreLazy("SelectedChannelStore");
const ChannelStore = findByPropsLazy("getChannel", "getDMFromUserId");
const wsModule = findByPropsLazy("getSocket");
const soundModule = findByPropsLazy("playSound");

let originalGetSocket: any = null;

const PLUGIN_VERSION = "1.1.0";
const GITHUB_REPO = "aeryin/fakedeafen-vencord";
const UPDATE_CHECK_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const UPDATE_CHECK_ENABLED = false;



function compareVersions(v1: string, v2: string): number {
    const clean1 = v1.replace(/[^0-9.]/g, '');
    const clean2 = v2.replace(/[^0-9.]/g, '');

    const parts1 = clean1.split('.').map(n => parseInt(n) || 0);
    const parts2 = clean2.split('.').map(n => parseInt(n) || 0);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

async function checkForUpdates(): Promise<void> {
    if (!UPDATE_CHECK_ENABLED) return;

    try {
        const lastDismissed = await DataStore.get("FakeDeafen-dismissed-version") as string | undefined;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(UPDATE_CHECK_URL, {
            signal: controller.signal,
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        clearTimeout(timeoutId);

        if (response.status === 404) return;
        if (!response.ok) return;

        const data = await response.json();
        let latestVersion = data.tag_name || data.name || "";
        latestVersion = latestVersion.replace(/^v/i, '').trim();

        if (!latestVersion) return;

        const comparison = compareVersions(latestVersion, PLUGIN_VERSION);

        if (comparison > 0 && lastDismissed !== latestVersion) {
            const releaseNotes = data.body || "No release notes available.";
            showUpdateModal(latestVersion, releaseNotes);
        }
    } catch (e) {
        console.warn("[FakeDeafen] Update check failed:", e);
    }
}

const UpdateModal = ({ props, version, releaseNotes }: { props: RenderModalProps; version: string; releaseNotes: string; }) => {
    const cleanNotes = releaseNotes
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .substring(0, 500);

    return (
        <Modal
            {...props}
            title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div>
                        <div style={{ color: "var(--text-positive)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}> Update Available </div>
                        <span style={{ color: "#fff", fontSize: "20px", fontWeight: 600 }}> FakeDeafen </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}> v{PLUGIN_VERSION} </span>
                        <span style={{ color: "var(--text-muted)" }}>→</span>
                        <span style={{ background: "var(--text-positive)", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600 }}> v{version} </span>
                    </div>
                </div>
            }
            actions={[
                {
                    text: "Later",
                    variant: "secondary",
                    onClick: async () => {
                        await DataStore.set('FakeDeafen-dismissed-version', version);
                        props.onClose();
                    }
                },
                {
                    text: "Update Now",
                    variant: "primary",
                    onClick: async () => {
                        window.open(GITHUB_RELEASE_URL, '_blank');
                        await DataStore.set('FakeDeafen-dismissed-version', version);
                        props.onClose();
                    }
                }
            ]}
        >
            <div style={{ padding: "8px 0" }}>
                <div style={{ background: "var(--background-secondary)", borderRadius: "12px", padding: "16px", maxHeight: "200px", overflowY: "auto" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}> What's New</div>
                    <div style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-normal)", whiteSpace: "pre-wrap" }}> {cleanNotes} </div>
                </div>
            </div>
        </Modal>
    );
};

function showUpdateModal(version: string, releaseNotes: string) {
    openModal((modalProps: RenderModalProps) => (
        <UpdateModal props={modalProps} version={version} releaseNotes={releaseNotes} />
    ));
}



const VersionDisplay = () => {
    const [updateStatus, setUpdateStatus] = React.useState<string | null>(null);

    const checkUpdate = async () => {
        setUpdateStatus("Checking...");
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(UPDATE_CHECK_URL, {
                signal: controller.signal,
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            clearTimeout(timeoutId);

            if (response.status === 404) {
                setUpdateStatus("No releases yet");
                return;
            }

            if (!response.ok) {
                setUpdateStatus("Failed to check");
                return;
            }

            const data = await response.json();
            let latestVersion = data.tag_name || data.name || "";
            latestVersion = latestVersion.replace(/^v/i, '').trim();

            if (!latestVersion) {
                setUpdateStatus("No releases found");
                return;
            }

            const comparison = compareVersions(latestVersion, PLUGIN_VERSION);

            if (comparison > 0) {
                setUpdateStatus(`Update available: v${latestVersion}`);
                setTimeout(() => {
                    showUpdateModal(latestVersion, data.body || "No release notes available.");
                }, 500);
            } else {
                setUpdateStatus("You're up to date!");
            }
        } catch (e) {
            setUpdateStatus("Check failed");
        }
    };

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px",
            background: "var(--background-secondary)",
            borderRadius: "8px",
            marginBottom: "16px"
        }
        }>
            <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                    FakeDeafen
                </div>
                < div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Version: <span style={{ color: "#5865f2", fontWeight: 600 }}> v{PLUGIN_VERSION} </span>
                    {
                        updateStatus && (
                            <span style={
                                {
                                    marginLeft: "10px",
                                    color: updateStatus.includes("available") ? "#43b581" :
                                        updateStatus.includes("up to date") ? "#43b581" :
                                            updateStatus.includes("failed") || updateStatus.includes("Failed") ? "#f04747" : "var(--text-muted)"
                                }
                            }>
                                • {updateStatus}
                            </span>
                        )
                    }
                </div>
            </div>
            < button
                onClick={checkUpdate}
                disabled={updateStatus === "Checking..."}
                style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    background: "#5865f2",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: updateStatus === "Checking..." ? "not-allowed" : "pointer",
                    opacity: updateStatus === "Checking..." ? 0.7 : 1,
                    transition: "all 0.2s"
                }}
            >
                {updateStatus === "Checking..." ? "Checking..." : "Check for Updates"}
            </button>
        </div>
    );
};



function KeybindRecorder({ setValue, option }: { setValue: (v: string) => void; option: { default?: string; }; }) {
    const [recording, setRecording] = React.useState(false);
    const [keybind, setKeybind] = React.useState(settings.store.keybind || "");

    React.useEffect(() => {
        if (!recording) return;

        function onKeyDown(e: KeyboardEvent) {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === "Escape") {
                setRecording(false);
                return;
            }

            if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

            const parts: string[] = [];
            if (e.ctrlKey) parts.push("Ctrl");
            if (e.shiftKey) parts.push("Shift");
            if (e.altKey) parts.push("Alt");
            parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

            const combo = parts.join("+");
            setKeybind(combo);
            setValue(combo);
            setRecording(false);
        }

        document.addEventListener("keydown", onKeyDown, true);
        return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [recording]);

    return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }
        }>
            <button
                onClick={() => setRecording(!recording)}
                style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    background: recording ? "#ed4245" : "#5865f2",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "14px",
                    minWidth: "180px"
                }}
            >
                {recording ? "Press a key combo..." : keybind || "Click to set keybind"}
            </button>
            {
                keybind && !recording && (
                    <button
                        onClick={
                            () => {
                                setKeybind("");
                                setValue("");
                            }
                        }
                        style={{
                            padding: "8px 12px",
                            borderRadius: "4px",
                            border: "none",
                            background: "#4f545c",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "14px"
                        }
                        }
                    >
                        Clear
                    </button>
                )}
        </div>
    );
}



const settings = definePluginSettings({
    versionInfo: {
        type: OptionType.COMPONENT,
        description: "",
        component: VersionDisplay
    },
    fakeDeafen: {
        type: OptionType.BOOLEAN,
        description: "Fake Deafen",
        default: false,
        hidden: true,
    },
    keybind: {
        type: OptionType.COMPONENT,
        description: "Keybind to toggle Fake Deafen",
        component: (props) => <KeybindRecorder {...props} />
    }
});



function isInVoiceChannel(): boolean {
    try {
        return !!SelectedChannelStore.getVoiceChannelId();
    } catch {
        return false;
    }
}

function patchSocket() {
    if (!wsModule) return;

    if (!originalGetSocket && wsModule.getSocket) {
        originalGetSocket = wsModule.getSocket;
        wsModule.getSocket = function (this: any, ...args: any[]) {
            const socket = originalGetSocket.apply(this, args);
            if (socket && !socket.send.__patched) {
                const originalSend = socket.send;
                socket.send = function (this: any, op: number, data: any, ...sendArgs: any[]) {
                    if (op === 4 && settings.store.fakeDeafen && data) {
                        data.self_mute = true;
                        data.self_deaf = true;
                    }
                    return originalSend.apply(this, [op, data, ...sendArgs]);
                };
                socket.send.__patched = true;
            }
            return socket;
        };
    }

    try {
        const socket = wsModule.getSocket();
        if (socket && !socket.send.__patched) {
            const originalSend = socket.send;
            socket.send = function (this: any, op: number, data: any, ...sendArgs: any[]) {
                if (op === 4 && settings.store.fakeDeafen && data) {
                    data.self_mute = true;
                    data.self_deaf = true;
                }
                return originalSend.apply(this, [op, data, ...sendArgs]);
            };
            socket.send.__patched = true;
        }
    } catch { }
}

function refreshVoiceState() {
    const socket = wsModule?.getSocket();
    const channelId = SelectedChannelStore?.getVoiceChannelId();
    if (!socket || !channelId) return;

    const channel = ChannelStore?.getChannel(channelId);

    try {
        socket.send(4, {
            guild_id: channel?.guild_id ?? null,
            channel_id: channelId,
            self_mute: settings.store.fakeDeafen,
            self_deaf: settings.store.fakeDeafen,
            self_video: false,
            flags: 0
        });
    } catch (e) {
        console.error("[FakeDeafen] Failed to refresh voice state:", e);
    }
}

function toggleFakeDeafen() {
    settings.store.fakeDeafen = !settings.store.fakeDeafen;
    patchSocket();
    refreshVoiceState();

    try {
        if (settings.store.fakeDeafen) {
            soundModule?.playSound("deafen");
        } else {
            soundModule?.playSound("undeafen");
        }
    } catch (e) {
        console.error("[FakeDeafen] Failed to play sound effect:", e);
    }
}

function parseKeybind(keybind: string) {
    if (!keybind) return null;

    const parts = keybind.split("+").map(p => p.trim());
    const key = parts.pop()!;
    const modifiers = {
        ctrl: parts.includes("Ctrl"),
        shift: parts.includes("Shift"),
        alt: parts.includes("Alt"),
    };

    return { key, ...modifiers };
}

function handleKeyDown(e: KeyboardEvent) {
    const kb = parseKeybind(settings.store.keybind);
    if (!kb) return;

    if (
        e.key.toLowerCase() === kb.key.toLowerCase() &&
        e.ctrlKey === kb.ctrl &&
        e.shiftKey === kb.shift &&
        e.altKey === kb.alt
    ) {
        e.preventDefault();
        if (!isInVoiceChannel()) return;
        toggleFakeDeafen();
    }
}

export default definePlugin({
    name: "FakeDeafen",
    description: "Fake your deafen status to others.",
    authors: [{ id: 1398096785892839515n, name: "aeeryin" }, {id: 612651439701098558n, name: "nemtudo"}],
    settings,

    patches: [
        {
            find: ".setSelfMute(this.selfMute",
            replacement: [
                {
                    match: /\.setSelfDeafen\((.+?)\)/g,
                    replace: ".setSelfDeafen($self.isFakeDeafen()?false:$1)"
                },
                {
                    match: /\.setSelfMute\((.+?)\)/g,
                    replace: ".setSelfMute($self.isFakeDeafen()?false:$1)"
                }
            ]
        }
    ],

    contextMenus: {
        "audio-device-context"(children) {
            children.push(
                <Menu.MenuSeparator />,
                < Menu.MenuCheckboxItem
                    id="vc-fake-deafen"
                    label="Fake Deafen"
                    checked={settings.store.fakeDeafen}
                    disabled={!isInVoiceChannel()}
                    action={toggleFakeDeafen}
                />
            );
        }
    },

    start() {
        document.addEventListener("keydown", handleKeyDown);
        setTimeout(() => checkForUpdates(), 5000);
        patchSocket();
    },

    stop() {
        document.removeEventListener("keydown", handleKeyDown);
        if (wsModule && originalGetSocket) {
            wsModule.getSocket = originalGetSocket;
            originalGetSocket = null;
        }
    },

    isFakeDeafen() {
        return settings.store.fakeDeafen;
    },
});
