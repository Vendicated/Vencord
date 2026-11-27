import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { useRef, useState } from "@webpack/common";

import { settings as autoKickSettings } from "../autoVcKick";
import { settings as autoJoinSettings, getWatchedChannelId, stopWatching } from "../autoJoinVc";
import { RulesEditor, settings as commandSettings } from "../userCommands";

const panelStyle = { display: "flex", flexDirection: "column" as const, gap: 14, padding: 4, color: "var(--text-normal)" };
const cardStyle = { border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column" as const, gap: 10 };
const titleStyle = { fontSize: 16, fontWeight: 700, color: "var(--header-primary)" };
const descriptionStyle = { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 };
const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: "9px 10px", borderRadius: 5, border: "1px solid var(--input-border, var(--border-subtle))", background: "var(--input-background, var(--background-secondary))", color: "var(--text-normal)", font: "inherit" };
const buttonStyle = { padding: "8px 12px", border: 0, borderRadius: 5, background: "var(--brand-500)", color: "white", cursor: "pointer", fontWeight: 600 };
const dangerButtonStyle = { ...buttonStyle, background: "var(--button-danger-background, #da373c)" };

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void; }) {
    return <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
        <span>{label}</span>
        <input type="checkbox" checked={checked} onChange={event => onChange(event.currentTarget.checked)} />
    </label>;
}

function AutoKickSection() {
    const { enabled, blockedUsers, guildIds } = autoKickSettings.use(["enabled", "blockedUsers", "guildIds"]);
    const blocked = blockedUsers.split(/[\s,]+/).filter(Boolean);
    const newUserRef = useRef<HTMLInputElement>(null);
    const updateBlocked = (next: string[]) => autoKickSettings.store.blockedUsers = [...new Set(next.map(value => value.trim()).filter(Boolean))].join(", ");

    return <div style={panelStyle}>
        <div style={cardStyle}>
            <div style={titleStyle}>AutoVcKick</div>
            <div style={descriptionStyle}>Automatically disconnect users in your block list when they join a voice channel.</div>
            <Toggle label="Auto-kick enabled" checked={enabled} onChange={value => autoKickSettings.store.enabled = value} />
        </div>
        <div style={cardStyle}>
            <div style={titleStyle}>Blocked users</div>
            <div style={descriptionStyle}>Manage Discord user IDs. You can also add or remove users from their context menu.</div>
            {blocked.length === 0 && <div style={descriptionStyle}>No users are currently blocked.</div>}
            {blocked.map(id => <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ flex: 1, overflowWrap: "anywhere" }}>{id}</code>
                <button style={dangerButtonStyle} onClick={() => updateBlocked(blocked.filter(value => value !== id))}>Remove</button>
            </div>)}
            <input ref={newUserRef} style={fieldStyle} placeholder="Enter a user ID and press Add" />
            <button style={buttonStyle} onClick={() => {
                const value = newUserRef.current?.value.trim();
                if (!value) return;
                updateBlocked([...blocked, value]);
                if (newUserRef.current) newUserRef.current.value = "";
            }}>Add user ID</button>
        </div>
        <div style={cardStyle}>
            <div style={titleStyle}>Server restrictions</div>
            <div style={descriptionStyle}>Leave empty to apply the block list in every server. Separate multiple server IDs with commas or spaces.</div>
            <textarea style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }} value={guildIds} onChange={event => autoKickSettings.store.guildIds = event.currentTarget.value} placeholder="Server IDs (optional)" />
        </div>
    </div>;
}

function AutoJoinSection() {
    const { switchFromOtherVc } = autoJoinSettings.use(["switchFromOtherVc"]);
    const watchedId = getWatchedChannelId();
    return <div style={panelStyle}>
        <div style={cardStyle}>
            <div style={titleStyle}>AutoJoinVc</div>
            <div style={descriptionStyle}>Wait for a free slot in a full voice channel and join automatically.</div>
            <Toggle label="Switch from another voice channel when a slot opens" checked={switchFromOtherVc} onChange={value => autoJoinSettings.store.switchFromOtherVc = value} />
        </div>
        <div style={cardStyle}>
            <div style={titleStyle}>Current watch</div>
            {watchedId ? <>
                <div style={descriptionStyle}>Watching voice channel ID:</div>
                <code style={{ overflowWrap: "anywhere" }}>{watchedId}</code>
                <button style={dangerButtonStyle} onClick={() => stopWatching("Auto-join cancelled")}>Stop watching</button>
            </> : <div style={descriptionStyle}>Not currently watching a voice channel. Right-click a full voice channel and choose “Auto-join when a spot opens”.</div>}
        </div>
    </div>;
}

function CommandsSection() {
    const { rules } = commandSettings.use(["rules"]);
    return <div style={panelStyle}>
        <div style={cardStyle}>
            <div style={titleStyle}>userCommands</div>
            <div style={descriptionStyle}>Configure slash commands and their per-server messages. Changes are saved to the plugin's existing rules setting.</div>
            <div style={descriptionStyle}>{rules.length} rule(s) configured</div>
        </div>
        <div style={cardStyle}><RulesEditor /></div>
    </div>;
}

function ControlCenterModal(props: any) {
    const [activeTab, setActiveTab] = useState("AutoVcKick");
    const tabs = ["AutoVcKick", "AutoJoinVc", "userCommands"];
    return <ModalRoot {...props} size="large">
        <ModalHeader>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Prophet Control Center</div>
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 4 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tabs.map(tab => <button key={tab} style={{ ...buttonStyle, background: activeTab === tab ? "var(--brand-500)" : "var(--background-modifier-selected)", color: activeTab === tab ? "white" : "var(--text-normal)" }} onClick={() => setActiveTab(tab)}>{tab}</button>)}
                </div>
                {activeTab === "AutoVcKick" && <AutoKickSection />}
                {activeTab === "AutoJoinVc" && <AutoJoinSection />}
                {activeTab === "userCommands" && <CommandsSection />}
            </div>
        </ModalContent>
    </ModalRoot>;
}

function ControlCenterIcon({ height = 20, width = 20 }: { height?: number; width?: number; }) {
    return <svg viewBox="0 0 24 24" height={height} width={width} fill="currentColor" aria-hidden="true">
        <path d="M4 5h16v2H4zm0 6h16v2H4zm0 6h16v2H4z" />
        <circle cx="8" cy="6" r="2" fill="var(--background-primary)" />
        <circle cx="15" cy="12" r="2" fill="var(--background-primary)" />
        <circle cx="10" cy="18" r="2" fill="var(--background-primary)" />
    </svg>;
}

const ControlCenterButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;
    return <ChatBarButton tooltip="Open Prophet Control Center" onClick={() => openModal(props => <ControlCenterModal {...props} />)} buttonProps={{ "aria-haspopup": "dialog" }}>
        <ControlCenterIcon />
    </ChatBarButton>;
};

export default definePlugin({
    name: "ProphetControlCenter",
    description: "A unified in-Discord control panel for AutoVcKick, AutoJoinVc and userCommands",
    authors: [{ name: "thcProphet", id: 828010614349365288n }],
    chatBarButton: {
        icon: ControlCenterIcon,
        render: ControlCenterButton
    }
});
