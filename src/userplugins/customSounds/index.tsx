/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import definePlugin, { makeRange, OptionType, StartAt } from "@utils/types";
import { React, Select, showToast, Slider } from "@webpack/common";

import { AudioPlayer, dataUriCache, deleteAudio, ensureDataURICached, ExportedAudioFile, getAllAudio, getAudioMeta, importAudio, playAudio, PreviewHandle, saveAudio } from "./audio";
import { makeEmptyOverride, SoundOverride, SoundType, soundTypes } from "./types";

const cap = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const audioType = (a: string) => a.startsWith("data:") || a.startsWith("http") || a.startsWith("blob:") ? "url" : "discord";
const seasonalUrls: Record<string, string> = Object.fromEntries(soundTypes.flatMap(t => t.seasonal ? Object.entries(t.seasonal) : []));
let audioCtx: AudioContext | null = null;

function getOverride(id: string): SoundOverride {
    const stored = settings.store[id];
    if (!stored) return makeEmptyOverride();
    if (typeof stored === "object") return stored;
    try { return JSON.parse(stored); } catch { return makeEmptyOverride(); }
}

function setOverride(id: string, o: SoundOverride) { settings.store[id] = JSON.stringify(o); }

async function cacheCustom(id: string | undefined) {
    if (!id) return;
    try { await ensureDataURICached(id); } catch { showToast("Custom sound load error"); }
}

const soundSettings = Object.fromEntries(soundTypes.map(t => [t.id, { type: OptionType.STRING, description: `Override for ${t.name}`, default: JSON.stringify(makeEmptyOverride()), hidden: true }]));
const settings = definePluginSettings({ ...soundSettings, overrides: { type: OptionType.COMPONENT, description: "", component: () => <SettingsUI /> } });

function SoundCard({ type, override, files, onFilesChange, onChange }: { type: SoundType; override: SoundOverride; files: Record<string, string>; onFilesChange: () => Promise<void>; onChange: () => Promise<void>; }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const update = useForceUpdater();
    const sound = React.useRef<PreviewHandle | null>(null);
    const saveAndNotify = async () => { await onChange(); update(); };

    const previewSound = async () => {
        sound.current?.stop();
        if (!override.enabled) { sound.current = playAudio(type.id); return; }
        const { selectedSound, volume, selectedFileId } = override;
        if (selectedSound === "custom" && selectedFileId) {
            const dataUri = await ensureDataURICached(selectedFileId);
            if (!dataUri?.startsWith("data:audio/")) { showToast("No custom sound file available"); return; }
            sound.current = playAudio(dataUri, { volume });
        } else sound.current = playAudio(selectedSound === "default" ? type.id : selectedSound, { volume });
    };

    const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            showToast("Uploading file...");
            const id = await saveAudio(file);
            await onFilesChange();
            override.selectedFileId = id;
            override.selectedSound = "custom";
            await ensureDataURICached(id);
            await saveAndNotify();
            showToast(`Uploaded: ${file.name}`);
        } catch (e) { console.error("[CustomSounds] Upload failed:", e); showToast(`Upload failed: ${e}`); }
    };

    const deleteFile = async (id: string) => {
        try {
            await deleteAudio(id);
            await onFilesChange();
            if (override.selectedFileId === id) {
                override.selectedFileId = undefined;
                override.selectedSound = "default";
                await saveAndNotify();
            } else update();
            showToast("File deleted");
        } catch (e) { console.error("[CustomSounds] Delete failed:", e); showToast("Delete failed"); }
    };

    const fileOpts = Object.entries(files).filter(([id, name]) => !!id && !!name).map(([id, name]) => ({ value: id, label: name }));
    const sourceOpts = [{ value: "default", label: "Default" }, ...Object.keys(type.seasonal ?? {}).map(id => ({ value: id, label: cap(id) })), { value: "custom", label: "Custom" }];

    return (
        <Card style={{ padding: "1em 1em 0" }}>
            <FormSwitch title={type.name} value={override.enabled || false} className={Margins.bottom16} hideBorder onChange={async val => { override.enabled = val; if (val && override.selectedSound === "custom") await cacheCustom(override.selectedFileId); await saveAndNotify(); }} />
            {override.enabled && <>
                <Button className={Margins.bottom16} variant="positive" onClick={previewSound}>Preview</Button>
                <Heading className={Margins.bottom8}>Volume</Heading>
                <Slider minValue={0} maxValue={500} markers={makeRange(0, 500, 50)} initialValue={override.volume} onValueRender={(v: number) => `${Math.round(v)}%`} className={Margins.bottom16} onValueChange={val => { sound.current && (sound.current.volume = val); override.volume = val; saveAndNotify(); }} />
                <Heading className={Margins.bottom8}>Sound Source</Heading>
                <div style={{ marginBottom: 16 }}>
                    <Select closeOnSelect serialize={v => v} isSelected={v => v === override.selectedSound} options={sourceOpts} select={async v => { override.selectedSound = v; if (v === "custom") await cacheCustom(override.selectedFileId); await saveAndNotify(); }} />
                </div>
                {override.selectedSound === "custom" && <>
                    <Heading className={Margins.bottom8}>Custom File</Heading>
                    <div style={{ marginBottom: 16 }}>
                        <Select closeOnSelect serialize={v => v} isSelected={v => v === (override.selectedFileId || "")} options={[{ value: "", label: "Select a file..." }, ...fileOpts]} select={async id => { override.selectedFileId = id || undefined; if (id) await ensureDataURICached(id); await saveAndNotify(); }} />
                    </div>
                    <input ref={fileInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a,.flac,.aac,.webm,.wma,.mp4" style={{ display: "none" }} onChange={uploadFile} />
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        <Button onClick={() => fileInputRef.current?.click()} variant="primary">Upload New</Button>
                        {override.selectedFileId && files[override.selectedFileId] && <Button variant="dangerPrimary" onClick={() => deleteFile(override.selectedFileId!)}>Delete Selected File</Button>}
                    </div>
                </>}
            </>}
        </Card>
    );
}

function SettingsUI() {
    const [resetTrigger, setResetTrigger] = React.useState(0);
    const [files, setFiles] = React.useState<Record<string, string>>({});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const loadFiles = React.useCallback(async () => {
        try { setFiles(await getAudioMeta()); } catch (e) { console.error("[CustomSounds]", e); }
    }, []);

    React.useEffect(() => {
        soundTypes.forEach(t => { if (!settings.store[t.id]) setOverride(t.id, makeEmptyOverride()); });
        loadFiles();
    }, []);

    const resetOverrides = () => {
        soundTypes.forEach(t => setOverride(t.id, makeEmptyOverride()));
        dataUriCache.clear();
        setResetTrigger(t => t + 1);
        showToast("All overrides reset!");
    };

    const handleSettingsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            try {
                resetOverrides();
                const imp = JSON.parse(ev.target?.result as string);
                const remap: Record<string, string> = {};
                let n = 0;
                for (const fd of imp.files ?? []) {
                    if (!fd?.dataUri || !fd?.name) continue;
                    const newId = await importAudio({ id: fd.id ?? "", name: fd.name, type: fd.type ?? "audio/mpeg", dataUri: fd.dataUri }).catch(() => null);
                    if (newId) { if (fd.id) remap[fd.id] = newId; await ensureDataURICached(newId); n++; }
                }
                if (n) await loadFiles();
                for (const s of imp.overrides ?? []) {
                    if (!s.id) continue;
                    setOverride(s.id, { enabled: s.enabled ?? false, selectedSound: s.selectedSound ?? "default", selectedFileId: s.selectedFileId ? (remap[s.selectedFileId] ?? s.selectedFileId) : undefined, volume: s.volume ?? 100 });
                }
                setResetTrigger(t => t + 1);
                showToast(`Imported ${imp.overrides?.length ?? 0} setting(s) and ${n} file(s)`);
            } catch (er) { console.error("[CustomSounds] Import error:", er); showToast("Import failed. Check console."); }
        };
        reader.readAsText(file);
    };

    const downloadSettings = async () => {
        const overrides = soundTypes.map(t => { const o = getOverride(t.id); return { id: t.id, enabled: o.enabled, selectedSound: o.selectedSound, selectedFileId: o.selectedFileId, volume: o.volume }; }).filter(o => o.enabled || o.selectedSound !== "default");
        const refs = new Set(overrides.map(o => o.selectedFileId).filter(Boolean) as string[]);
        const all = await getAllAudio();
        const bundled: ExportedAudioFile[] = [...refs].map(id => all[id]).filter(f => f?.dataUri).map(f => ({ id: f.id, name: f.name, type: f.type, dataUri: f.dataUri }));
        const blob = new Blob([JSON.stringify({ overrides, files: bundled }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "customSounds-settings.json"; a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported ${overrides.length} setting(s) and ${bundled.length} file(s)`);
    };

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <Button variant="primary" onClick={() => fileInputRef.current?.click()}>Import</Button>
                <Button variant="secondary" onClick={downloadSettings}>Export</Button>
                <Button variant="dangerPrimary" onClick={resetOverrides}>Reset All</Button>
                <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleSettingsUpload} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {soundTypes.map(type => {
                    const o = getOverride(type.id);
                    return <SoundCard key={`${type.id}-${resetTrigger}`} type={type} override={o} files={files} onFilesChange={loadFiles} onChange={async () => { setOverride(type.id, o); if (o.enabled && o.selectedSound === "custom") await cacheCustom(o.selectedFileId); }} />;
                })}
            </div>
        </div>
    );
}

export default definePlugin({
    name: "CustomSounds",
    description: "Customize Discord's sounds.",
    authors: [Devs.ScattrdBlade, Devs.TheKodeToad],
    settings,
    startAt: StartAt.Init,

    patches: [
        {
            find: "could not play audio",
            group: true,
            replacement: [
                { match: /(let \i=class.{0,900}?new Audio;\i.src=)((\i\(\d+\))(?:\(`\.\/\$\{|.{0,50}concat\())this.name((?:\}\.mp3`|,".mp3"\))\))/, replace: '$3;$1this.type!=="discord"?this.audio:$2this.audio$4' },
                { match: /(new Audio;)(\i)(\.src=)/, replace: '$1$2.crossOrigin="anonymous";$2$3' },
                { match: /(?<=constructor\((\i,\i,\i,\i)).{0,200}outputChannel=\i/, replace: ",options){$self.buildPlayer(this,$1,options);" },
                { match: /(\i.pause\(\),(\i).src="".{0,20}?null)/, replace: "$2.onerror=()=>{},$1" },
                { match: /(?<=(\i).onloadeddata=\(\)=>{)/, replace: "$self.applyBoost(this,$1)," }
            ]
        },
        {
            find: '"UPDATE_OPEN_ON_STARTUP"',
            group: true,
            replacement: [
                { match: /(?<=discodo",\i)(\);return )\i.volume=1,/, replace: ",1$1" },
                { match: /,(this._connectedSound.volume)=1/, replace: ";" }
            ]
        }
    ],

    buildPlayer(player: AudioPlayer, audio: string, _u: any, internalVolume: number, channel: string, options: any = {}) {
        const v = Math.max(0, internalVolume || (options.volume ? options.volume / 100 : 1));
        player.preprocessDataOriginal = { audio, volume: v };
        player.audio = audio;
        player._audio = null;
        player._volume = Math.min(1, v);
        player.type = audioType(audio);
        (player as any).outputChannel = channel;
        (player as any).preload = false;
        (player as any).persistent = false;
        player.processAudio = () => this.processAudio(player);
        player.processAudio();
    },

    processAudio(player: AudioPlayer) {
        const prevAudio = player.preprocessDataCurrent?.audio;
        const cur = { ...player.preprocessDataOriginal };
        cur.volume *= 100;
        const owner = soundTypes.find(s => s.seasonal && cur.audio in s.seasonal);
        const o = getOverride(owner?.id ?? cur.audio);
        if (o.enabled) {
            cur.volume = o.volume;
            if (o.selectedSound === "custom") {
                const u = o.selectedFileId && dataUriCache.get(o.selectedFileId);
                if (u) cur.audio = u;
            } else if (o.selectedSound !== "default") {
                const sm = soundTypes.find(t => t.id === cur.audio)?.seasonal;
                const k = sm && Object.keys(sm).find(k => k.startsWith(`${o.selectedSound}_`));
                cur.audio = seasonalUrls[o.selectedSound] ?? (k && sm ? sm[k] : cur.audio);
            }
        }
        cur.volume /= 100;
        player.preprocessDataCurrent = cur;
        player.audio = cur.audio;
        player.type = audioType(cur.audio);
        player._volume = Math.min(1, Math.max(0, cur.volume));
        if (prevAudio !== cur.audio) player.destroyAudio();
    },

    applyBoost(player: AudioPlayer, audio: HTMLAudioElement) {
        const factor = Math.max(1, player.preprocessDataCurrent?.volume ?? 1);
        if (factor <= 1.001) return;
        try { audioCtx ??= new AudioContext(); } catch { return; }
        if (audioCtx.state === "suspended") audioCtx.resume().catch(() => { });
        try {
            const source = audioCtx.createMediaElementSource(audio);
            const gain = audioCtx.createGain();
            gain.gain.value = factor;
            source.connect(gain);
            gain.connect(audioCtx.destination);
        } catch (e) { console.error("[CustomSounds] Web Audio attach failed:", e); }
    },

    async start() {
        for (const t of soundTypes) {
            const o = getOverride(t.id);
            if (o?.enabled && o.selectedSound === "custom" && o.selectedFileId) {
                try { await ensureDataURICached(o.selectedFileId); } catch (e) { console.error("[CustomSounds]", e); }
            }
        }
    },

    stop() { dataUriCache.clear(); }
});
