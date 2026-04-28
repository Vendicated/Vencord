import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, GuildStore, React, RestAPI, TextInput, UserStore } from "@webpack/common";

type GuildLike = {
    id: string;
    name: string;
    icon?: string | null;
    ownerId?: string;
    memberCount?: number;
    verified?: boolean;
    partnered?: boolean;
};

type LogLine = { level: "INFO" | "OK" | "WARN" | "ERR"; text: string; time: number };

const S = {
    modal: { padding: 0, display: "flex", flexDirection: "column" as const },
    stickyTop: {
        position: "sticky" as const,
        top: 0,
        zIndex: 2,
        background: "var(--background-primary)",
        borderBottom: "1px solid var(--background-modifier-accent)"
    },
    stickyBottom: { position: "sticky" as const, bottom: 0, zIndex: 2 },
    headerPad: { padding: 14, display: "flex", flexDirection: "column" as const, gap: 10 },
    row: { display: "flex", alignItems: "center", gap: 10 },
    rowWrap: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    chip: {
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        background: "var(--background-modifier-accent)",
        color: "var(--text-normal)",
        opacity: 0.92
    },
    tabBtn: (active: boolean) => ({
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid var(--background-modifier-accent)",
        background: active ? "var(--background-modifier-selected)" : "transparent",
        color: "var(--text-normal)",
        cursor: "pointer",
        fontSize: 13
    }),
    card: {
        border: "1px solid var(--background-modifier-accent)",
        borderRadius: 14,
        background: "var(--background-secondary)",
        overflow: "hidden" as const
    },
    cardPad: { padding: 12 },
    list: { maxHeight: 440, overflow: "auto" as const, background: "var(--background-secondary)" },
    footer: {
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--background-tertiary)",
        borderTop: "1px solid var(--background-modifier-accent)"
    },
    inputNum: {
        width: 110,
        padding: "6px 8px",
        borderRadius: 10,
        border: "1px solid var(--background-modifier-accent)",
        background: "var(--background-secondary)",
        color: "var(--text-normal)"
    },
    select: {
        padding: "6px 8px",
        borderRadius: 10,
        border: "1px solid var(--background-modifier-accent)",
        background: "var(--background-secondary)",
        color: "var(--text-normal)"
    },
    warnBox: {
        border: "1px solid rgba(255, 180, 0, 0.35)",
        background: "rgba(255, 180, 0, 0.06)",
        borderRadius: 12,
        padding: 10
    }
};

function Chip({ children }: { children: React.ReactNode }) {
    return <span style={S.chip}>{children}</span>;
}

function Card({ children }: { children: React.ReactNode }) {
    return <div style={S.card}>{children}</div>;
}

function getAllGuilds(): GuildLike[] {
    const obj = GuildStore.getGuilds?.() ?? {};
    const arr = Object.values(obj) as any[];

    return arr.map(g => ({
        id: g.id,
        name: g.name ?? "(unknown)",
        icon: g.icon,
        ownerId: g.ownerId ?? g.owner_id,
        memberCount: g.memberCount ?? g.approximate_member_count,
        verified: !!(g.verified ?? g.isVerified),
        partnered: !!(g.partnered ?? g.isPartnered)
    }));
}

function iconUrl(g: GuildLike) {
    if (!g.icon) return null;
    return `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`;
}

function sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms));
}

async function leaveGuild(guildId: string) {
    return RestAPI.del({ url: `/users/@me/guilds/${guildId}`, oldFormErrors: true });
}

function formatCount(n?: number) {
    return typeof n === "number" ? n.toLocaleString() : null;
}

function BulkLeaveModal(props: any) {
    const currentUserId = UserStore.getCurrentUser?.()?.id;

    const [tab, setTab] = React.useState<"servers" | "run" | "settings">("servers");

    const [guilds, setGuilds] = React.useState<GuildLike[]>(() => getAllGuilds());
    const [autoRefresh, setAutoRefresh] = React.useState(true);

    const [query, setQuery] = React.useState("");
    const [selected, setSelected] = React.useState<Record<string, boolean>>({});

    const [hideOwned, setHideOwned] = React.useState(true);
    const [hideVerified, setHideVerified] = React.useState(false);
    const [hideLarge, setHideLarge] = React.useState(false);
    const [largeThreshold, setLargeThreshold] = React.useState(10000);
    const [showSelectedOnly, setShowSelectedOnly] = React.useState(false);

    const [sortMode, setSortMode] = React.useState<"name" | "members_desc" | "members_asc">("name");

    const [delayMs, setDelayMs] = React.useState(800);
    const [confirmOver, setConfirmOver] = React.useState(10);
    const [confirmText, setConfirmText] = React.useState("");

    const [busy, setBusy] = React.useState(false);
    const cancelRef = React.useRef(false);

    const [log, setLog] = React.useState<LogLine[]>([]);
    const [progress, setProgress] = React.useState({ done: 0, total: 0 });

    const pushLog = React.useCallback((level: LogLine["level"], text: string) => {
        setLog(prev => [{ level, text, time: Date.now() }, ...prev].slice(0, 500));
    }, []);

    const isOwned = React.useCallback(
        (g: GuildLike) => !!(currentUserId && g.ownerId && g.ownerId === currentUserId),
        [currentUserId]
    );

    React.useEffect(() => {
        if (!autoRefresh) return;
        const t = setInterval(() => setGuilds(getAllGuilds()), 1200);
        return () => clearInterval(t);
    }, [autoRefresh]);

    const selectedIds = React.useMemo(
        () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
        [selected]
    );

    const needsConfirm = selectedIds.length >= confirmOver;

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = guilds;

        if (hideOwned && currentUserId) list = list.filter(g => !isOwned(g));
        if (hideVerified) list = list.filter(g => !(g.verified || g.partnered));
        if (hideLarge) list = list.filter(g => typeof g.memberCount !== "number" || g.memberCount < largeThreshold);

        if (q) list = list.filter(g => g.name.toLowerCase().includes(q) || g.id.includes(q));
        if (showSelectedOnly) list = list.filter(g => !!selected[g.id]);

        list = [...list];

        if (sortMode === "name") list.sort((a, b) => a.name.localeCompare(b.name));
        if (sortMode === "members_desc") list.sort((a, b) => (b.memberCount ?? -1) - (a.memberCount ?? -1));
        if (sortMode === "members_asc") list.sort((a, b) => (a.memberCount ?? 1e18) - (b.memberCount ?? 1e18));

        return list;
    }, [
        guilds,
        query,
        hideOwned,
        hideVerified,
        hideLarge,
        largeThreshold,
        showSelectedOnly,
        sortMode,
        selected,
        currentUserId,
        isOwned
    ]);

    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

    const toggle = (id: string) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

    const selectShown = () =>
        setSelected(prev => {
            const next = { ...prev };
            for (const g of filtered) next[g.id] = true;
            return next;
        });

    const invertShown = () =>
        setSelected(prev => {
            const next = { ...prev };
            for (const g of filtered) next[g.id] = !next[g.id];
            return next;
        });

    const clearSelection = () => setSelected({});

    const reloadNow = () => {
        setGuilds(getAllGuilds());
        pushLog("INFO", "Reloaded server list.");
    };

    async function doLeaveSelected() {
        const ids = selectedIds;

        if (ids.length === 0) {
            pushLog("WARN", "Select at least one server first.");
            setTab("run");
            return;
        }

        if (needsConfirm && confirmText.trim().toUpperCase() !== "LEAVE") {
            pushLog("WARN", `Type LEAVE to confirm leaving ${ids.length} servers.`);
            setTab("run");
            return;
        }

        cancelRef.current = false;
        setBusy(true);
        setProgress({ done: 0, total: ids.length });
        pushLog("INFO", `Starting run: leaving ${ids.length} server(s).`);
        setTab("run");

        for (let i = 0; i < ids.length; i++) {
            if (cancelRef.current) {
                pushLog("WARN", "Run cancelled by user.");
                break;
            }

            const id = ids[i];
            const g = guilds.find(x => x.id === id);
            const name = g?.name ?? id;

            if (g && isOwned(g)) {
                pushLog("WARN", `Skipped (owned): ${name}`);
                setProgress({ done: i + 1, total: ids.length });
                continue;
            }

            try {
                await leaveGuild(id);
                pushLog("OK", `Left: ${name}`);
            } catch (e: any) {
                const status = e?.status ?? e?.response?.status;
                const retryAfter = e?.body?.retry_after ?? e?.retry_after;

                if (status === 429 && retryAfter) {
                    const waitMs = Math.ceil(Number(retryAfter) * 1000) + 250;
                    pushLog("WARN", `Rate limited. Waiting ${Math.round(waitMs / 1000)}s…`);
                    await sleep(waitMs);

                    // one retry
                    try {
                        await leaveGuild(id);
                        pushLog("OK", `Left: ${name} (after retry)`);
                    } catch (e2: any) {
                        pushLog("ERR", `Failed: ${name} (rate limit retry failed)`);
                    }
                } else {
                    const msg = String(e?.message ?? e);
                    pushLog("ERR", `Failed: ${name} (${msg})`);
                }
            }

            setProgress({ done: i + 1, total: ids.length });
            await sleep(delayMs);
        }

        setBusy(false);
        setConfirmText("");
        pushLog("INFO", "Run finished.");
    }

    const Header = (
        <div style={S.headerPad}>
            <div style={{ ...S.rowWrap, justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Forms.FormTitle>Bulk Leave Servers</Forms.FormTitle>
                    <div style={S.rowWrap}>
                        <Chip>Selected: {selectedIds.length}</Chip>
                        <Chip>Shown: {filtered.length}</Chip>
                        {busy ? <Chip>Running: {pct}%</Chip> : <Chip>Idle</Chip>}
                        {autoRefresh ? <Chip>Auto-refresh</Chip> : <Chip>Manual</Chip>}
                    </div>
                </div>

                <div style={S.rowWrap}>
                    <button style={S.tabBtn(tab === "servers")} onClick={() => setTab("servers")}>Servers</button>
                    <button style={S.tabBtn(tab === "run")} onClick={() => setTab("run")}>Run</button>
                    <button style={S.tabBtn(tab === "settings")} onClick={() => setTab("settings")}>Settings</button>
                </div>
            </div>

            <div style={S.rowWrap}>
                <div style={{ flex: 1, minWidth: 260 }}>
                    <TextInput
                        value={query}
                        onChange={(v: string) => setQuery(v)}
                        placeholder="Search by server name or ID…"
                        disabled={busy}
                    />
                </div>

                <Button onClick={selectShown} disabled={busy || filtered.length === 0}>Select shown</Button>
                <Button onClick={invertShown} disabled={busy || filtered.length === 0}>Invert shown</Button>
                <Button onClick={clearSelection} disabled={busy || selectedIds.length === 0}>Clear</Button>
                <Button onClick={reloadNow} disabled={busy}>Reload</Button>
            </div>
        </div>
    );

    const Footer = (
        <div style={S.footer}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
                {busy ? `Leaving… ${progress.done}/${progress.total}` : "Ready"}
            </div>

            <div style={S.rowWrap}>
                {busy && (
                    <Button onClick={() => (cancelRef.current = true)} color={Button.Colors.RED}>
                        Cancel
                    </Button>
                )}
                <Button onClick={doLeaveSelected} disabled={busy || selectedIds.length === 0} color={Button.Colors.RED}>
                    Leave selected
                </Button>
            </div>
        </div>
    );

    const ServersTab = (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
                <div style={S.cardPad}>
                    <div style={S.rowWrap}>
                        <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                            <input
                                type="checkbox"
                                checked={hideOwned}
                                onChange={e => setHideOwned(e.currentTarget.checked)}
                                disabled={busy || !currentUserId}
                            />
                            Hide owned
                        </label>

                        <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                            <input type="checkbox" checked={hideVerified} onChange={e => setHideVerified(e.currentTarget.checked)} disabled={busy} />
                            Hide verified/partnered
                        </label>

                        <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                            <input type="checkbox" checked={hideLarge} onChange={e => setHideLarge(e.currentTarget.checked)} disabled={busy} />
                            Hide large
                        </label>

                        {hideLarge && (
                            <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                                Threshold
                                <input
                                    type="number"
                                    min={100}
                                    step={100}
                                    value={largeThreshold}
                                    onChange={e => setLargeThreshold(Math.max(100, Number(e.currentTarget.value || 10000)))}
                                    disabled={busy}
                                    style={S.inputNum}
                                />
                            </label>
                        )}

                        <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                            <input type="checkbox" checked={showSelectedOnly} onChange={e => setShowSelectedOnly(e.currentTarget.checked)} disabled={busy} />
                            Show selected only
                        </label>

                        <div style={S.row}>
                            <span style={{ fontSize: 13, opacity: 0.85 }}>Sort</span>
                            <select value={sortMode} onChange={e => setSortMode(e.currentTarget.value as any)} disabled={busy} style={S.select}>
                                <option value="name">Name</option>
                                <option value="members_desc">Members (high → low)</option>
                                <option value="members_asc">Members (low → high)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div style={S.list}>
                    {filtered.map((g, idx) => {
                        const isSel = !!selected[g.id];
                        const owned = isOwned(g);
                        const icon = iconUrl(g);

                        return (
                            <div
                                key={g.id}
                                onClick={() => !busy && toggle(g.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "10px 12px",
                                    cursor: busy ? "not-allowed" : "pointer",
                                    background: isSel ? "var(--background-modifier-selected)" : "transparent",
                                    borderBottom: idx === filtered.length - 1 ? "none" : "1px solid var(--background-modifier-accent)"
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSel}
                                    onChange={() => toggle(g.id)}
                                    onClick={e => e.stopPropagation()}
                                    disabled={busy}
                                />

                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 999,
                                        overflow: "hidden",
                                        background: "var(--background-modifier-accent)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flex: "0 0 auto",
                                        fontSize: 12
                                    }}
                                >
                                    {icon ? <img src={icon} width={34} height={34} style={{ display: "block" }} /> : <span>{g.name.slice(0, 2).toUpperCase()}</span>}
                                </div>

                                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {g.name}
                                    </span>
                                    <span style={{ opacity: 0.7, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {g.id}
                                        {formatCount(g.memberCount) ? ` • ${formatCount(g.memberCount)} members` : ""}
                                        {g.verified ? " • verified" : ""}
                                        {g.partnered ? " • partnered" : ""}
                                        {owned ? " • owned" : ""}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {filtered.length === 0 && <div style={{ padding: 14, opacity: 0.7 }}>No servers match your filters.</div>}
                </div>
            </Card>
        </div>
    );

    const RunTab = (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {needsConfirm && (
                <div style={S.warnBox}>
                    <Forms.FormText>
                        You selected <b>{selectedIds.length}</b> servers. Type <b>LEAVE</b> to enable the run.
                    </Forms.FormText>
                    <div style={{ marginTop: 8, maxWidth: 320 }}>
                        <TextInput
                            value={confirmText}
                            onChange={(v: string) => setConfirmText(v)}
                            placeholder="Type LEAVE to confirm…"
                            disabled={busy}
                        />
                    </div>
                </div>
            )}

            <Card>
                <div style={{ ...S.cardPad, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div style={S.rowWrap}>
                        <Chip>{busy ? `Progress: ${pct}%` : "No active run"}</Chip>
                        <Chip>{busy ? `${progress.done}/${progress.total}` : `${log.length} log entries`}</Chip>
                    </div>
                    <Button onClick={() => setLog([])} disabled={busy || log.length === 0}>
                        Clear log
                    </Button>
                </div>
            </Card>

            <Card>
                <div
                    style={{
                        padding: 10,
                        maxHeight: 420,
                        overflow: "auto",
                        fontFamily: "var(--font-code)",
                        background: "var(--background-secondary)"
                    }}
                >
                    {log.length === 0 ? (
                        <div style={{ opacity: 0.7 }}>Log is empty. Start a run to see output here.</div>
                    ) : (
                        log.map((l, i) => (
                            <div key={i} style={{ fontSize: 12, padding: "2px 0", opacity: 0.92 }}>
                                <span style={{ opacity: 0.75 }}>
                                    [{new Date(l.time).toLocaleTimeString()}] [{l.level}]
                                </span>{" "}
                                {l.text}
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );

    const SettingsTab = (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
                <div style={S.cardPad}>
                    <Forms.FormTitle tag="h3">Safety & rate limits</Forms.FormTitle>
                    <Forms.FormText>
                        Slower is safer. Discord can rate limit mass actions; this tool adds delays and basic 429 pausing.
                    </Forms.FormText>

                    <div style={{ ...S.rowWrap, marginTop: 10 }}>
                        <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                            Delay between leaves (ms)
                            <input
                                type="number"
                                min={0}
                                step={50}
                                value={delayMs}
                                onChange={e => setDelayMs(Math.max(0, Number(e.currentTarget.value || 800)))}
                                disabled={busy}
                                style={S.inputNum}
                            />
                        </label>

                        <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                            Require LEAVE at
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={confirmOver}
                                onChange={e => setConfirmOver(Math.max(1, Number(e.currentTarget.value || 10)))}
                                disabled={busy}
                                style={{ ...S.inputNum, width: 90 }}
                            />
                            servers+
                        </label>

                        <label style={{ ...S.row, fontSize: 13, opacity: 0.9 }}>
                            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.currentTarget.checked)} disabled={busy} />
                            Auto-refresh server list
                        </label>
                    </div>
                </div>
            </Card>
        </div>
    );

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <div style={S.modal}>
                <div style={S.stickyTop}>{Header}</div>

                {tab === "servers" ? ServersTab : tab === "run" ? RunTab : SettingsTab}

                <div style={S.stickyBottom}>{Footer}</div>
            </div>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "BulkLeaveGuild",
    description: "Bulk-leave servers with search, filters, sorting, safety confirmation, progress, and a clean log.",
    authors: [Devs.rz30],
    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">Bulk Leave Servers</Forms.FormTitle>
            <Forms.FormText>
                A clean, manual bulk-leave tool with safety confirmation and rate-limit-friendly behavior.
            </Forms.FormText>
            <Button style={{ marginTop: 8 }} onClick={() => openModal(p => <BulkLeaveModal {...p} />)} color={Button.Colors.RED}>
                Open Bulk Leave Tool
            </Button>
        </>
    )
});
