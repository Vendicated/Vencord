/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Checkbox, Forms, SearchableSelect, Slider, Text, useEffect, useMemo, useRef, useState } from "@webpack/common";

const COLS = 8;
const ROWS = 9;

const WALK_FRAMES: Array<[number, number]> = [
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2]
];
const IDLE_FRAMES: Array<[number, number]> = [
    [0, 3], [1, 3], [2, 3], [3, 3]
];

const MANIFEST_URL = "https://codex-pet.com/api/manifest";
const DEFAULT_PET = {
    slug: "agumon",
    name: "Agumon",
    url: "https://cdn.codex-pet.com/pets/agumon/spritesheet.webp"
};

interface Pet {
    slug: string;
    name: string;
    url: string;
    desc?: string;
}

let petCache: Pet[] | null = null;
let petInflight: Promise<Pet[]> | null = null;

function fetchPets(): Promise<Pet[]> {
    if (petCache) return Promise.resolve(petCache);
    if (petInflight) return petInflight;

    petInflight = fetch(MANIFEST_URL, { headers: { accept: "application/json" } })
        .then(res => {
            if (!res.ok) throw new Error("manifest HTTP " + res.status);
            return res.json();
        })
        .then((json: any) => {
            const pets: Pet[] = (json?.pets ?? [])
                .filter((p: any) => p?.spritesheetUrl)
                .map((p: any) => ({
                    slug: String(p.slug),
                    name: String(p.displayName || p.slug),
                    url: String(p.spritesheetUrl),
                    desc: p.description ? String(p.description) : ""
                }));
            pets.sort((a, b) => a.name.localeCompare(b.name));
            petCache = pets;
            return pets;
        })
        .finally(() => { petInflight = null; });

    return petInflight;
}

interface CodexPetOptions {
    url: string;
    size: number;
    speed: number;
    fps: number;
    flip: boolean;
    pixelated: boolean;
}

class CodexPet {
    private readonly el = document.createElement("div");
    private posX = window.innerWidth / 2;
    private posY = window.innerHeight / 2;
    private mouseX = this.posX;
    private mouseY = this.posY;
    private dispW = 0;
    private dispH = 0;
    private walkFrame = 0;
    private idleFrame = 0;
    private idleTicks = 0;
    private flipped = false;
    private raf = 0;
    private lastStep = 0;
    private destroyed = false;

    constructor(private readonly opts: CodexPetOptions) {
        this.load();
    }

    private readonly onMouseMove = (e: MouseEvent) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    };

    private load() {
        const img = new Image();
        img.onload = () => {
            if (this.destroyed) return;

            const cellW = img.naturalWidth / COLS;
            const cellH = img.naturalHeight / ROWS;
            this.dispH = this.opts.size;
            this.dispW = Math.max(1, Math.round(this.opts.size * (cellW / cellH)));

            const s = this.el.style;
            this.el.id = "vc-codexpet";
            this.el.setAttribute("aria-hidden", "true");
            s.position = "fixed";
            s.left = "0px";
            s.top = "0px";
            s.width = `${this.dispW}px`;
            s.height = `${this.dispH}px`;
            s.backgroundImage = `url("${this.opts.url}")`;
            s.backgroundRepeat = "no-repeat";
            s.backgroundSize = `${COLS * this.dispW}px ${ROWS * this.dispH}px`;
            s.imageRendering = this.opts.pixelated ? "pixelated" : "auto";
            s.pointerEvents = "none";
            s.zIndex = "2147483647";
            s.willChange = "left, top, background-position, transform";

            document.body.appendChild(this.el);
            document.addEventListener("mousemove", this.onMouseMove);
            this.raf = requestAnimationFrame(this.tick);
        };
        img.onerror = () => console.error("[CodexPet] Failed to load spritesheet:", this.opts.url);
        img.src = this.opts.url;
    }

    private setCell(col: number, row: number) {
        const s = this.el.style;
        s.backgroundPosition = `-${col * this.dispW}px -${row * this.dispH}px`;
        s.transform = this.opts.flip && this.flipped ? "scaleX(-1)" : "";
    }

    private readonly tick = (t: number) => {
        if (this.destroyed) return;
        if (!this.lastStep) this.lastStep = t;
        if (t - this.lastStep >= 1000 / Math.max(1, this.opts.fps)) {
            this.lastStep = t;
            this.step();
        }
        this.raf = requestAnimationFrame(this.tick);
    };

    private step() {
        const dx = this.posX - this.mouseX;
        const dy = this.posY - this.mouseY;
        const dist = Math.hypot(dx, dy);

        const stopRadius = Math.max(this.opts.speed, this.dispH * 0.5);
        if (dist < stopRadius) {
            this.idleTicks++;
            if (this.idleTicks % 8 === 0) this.idleFrame++;
            const f = IDLE_FRAMES[this.idleFrame % IDLE_FRAMES.length];
            this.setCell(f[0], f[1]);
            return;
        }

        this.idleTicks = 0;
        if (Math.abs(dx) > 1) this.flipped = dx < 0;

        const f = WALK_FRAMES[this.walkFrame++ % WALK_FRAMES.length];
        this.setCell(f[0], f[1]);

        this.posX -= (dx / dist) * this.opts.speed;
        this.posY -= (dy / dist) * this.opts.speed;
        this.posX = Math.min(Math.max(this.dispW / 2, this.posX), window.innerWidth - this.dispW / 2);
        this.posY = Math.min(Math.max(this.dispH / 2, this.posY), window.innerHeight - this.dispH / 2);

        this.el.style.left = `${this.posX - this.dispW / 2}px`;
        this.el.style.top = `${this.posY - this.dispH / 2}px`;
    }

    public destroy() {
        this.destroyed = true;
        cancelAnimationFrame(this.raf);
        document.removeEventListener("mousemove", this.onMouseMove);
        this.el.remove();
    }
}

let current: CodexPet | null = null;
let started = false;
let reloadTimer: ReturnType<typeof setTimeout> | undefined;

function doReload() {
    current?.destroy();
    current = null;

    if (!started) return;

    const url = settings.store.selectedUrl;
    if (!url) return;

    current = new CodexPet({
        url,
        size: Math.max(16, settings.store.size),
        speed: Math.max(1, settings.store.speed),
        fps: Math.max(1, settings.store.fps),
        flip: settings.store.flip,
        pixelated: settings.store.pixelated
    });
}

function reloadPet() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(doReload, 120);
}

function save(key: "size" | "speed" | "fps" | "flip" | "pixelated", value: number | boolean) {
    (settings.store as any)[key] = value;
    reloadPet();
}

function SliderRow({ label, value, min, max, onChange }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="vc-codexpet-slider-row">
            <span className="vc-codexpet-slider-label">{label}</span>
            <Slider
                className="vc-codexpet-slider"
                initialValue={Math.round(value)}
                minValue={min}
                maxValue={max}
                onValueChange={v => onChange(Math.round(v))}
                onValueRender={(v: number) => String(Math.round(v))}
            />
            <span className="vc-codexpet-slider-value">{Math.round(value)}</span>
        </div>
    );
}

function PetPreview({ url }: { url: string; }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !url) return;

        let raf = 0;
        let frame = 0;
        let last = 0;
        let alive = true;

        const img = new Image();
        img.onload = () => {
            if (!alive || !ref.current) return;
            const node = ref.current;
            const cellW = img.naturalWidth / COLS;
            const cellH = img.naturalHeight / ROWS;
            const dispH = 110;
            const dispW = Math.max(1, Math.round(dispH * (cellW / cellH)));

            node.style.width = `${dispW}px`;
            node.style.height = `${dispH}px`;
            node.style.backgroundImage = `url("${url}")`;
            node.style.backgroundSize = `${COLS * dispW}px ${ROWS * dispH}px`;

            const loop = (t: number) => {
                if (!alive) return;
                if (t - last >= 1000 / 12) {
                    last = t;
                    const f = WALK_FRAMES[frame++ % WALK_FRAMES.length];
                    node.style.backgroundPosition = `-${f[0] * dispW}px -${f[1] * dispH}px`;
                }
                raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
        };
        img.src = url;

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
        };
    }, [url]);

    return <div ref={ref} className="vc-codexpet-sprite" />;
}

function PetPicker() {
    const { selectedSlug, size, speed, fps, flip, pixelated } = settings.use([
        "selectedSlug", "selectedUrl", "selectedName", "size", "speed", "fps", "flip", "pixelated"
    ]);
    const [pets, setPets] = useState<Pet[]>([]);
    const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

    useEffect(() => {
        let alive = true;
        fetchPets()
            .then(p => { if (alive) { setPets(p); setStatus("ok"); } })
            .catch(() => { if (alive) setStatus("error"); });
        return () => { alive = false; };
    }, []);

    const options = useMemo(() => pets.map(p => ({ label: p.name, value: p.slug })), [pets]);

    function selectSlug(slug: string) {
        const p = pets.find(x => x.slug === slug);
        if (!p) return;
        settings.store.selectedSlug = p.slug;
        settings.store.selectedName = p.name;
        settings.store.selectedUrl = p.url;
        reloadPet();
    }

    const selected = pets.find(p => p.slug === selectedSlug);

    return (
        <div className="vc-codexpet-picker">
            <Forms.FormTitle tag="h3">Pet</Forms.FormTitle>

            {status === "error" ? (
                <Forms.FormText className="vc-codexpet-empty">
                    Couldn't load the pet list. This plugin needs its native CSP patch — make sure you're on the
                    desktop app and have restarted after enabling it.
                </Forms.FormText>
            ) : (
                <SearchableSelect
                    placeholder={status === "loading" ? "Loading pets…" : `Search ${pets.length} pets…`}
                    options={options}
                    value={options.find(o => o.value === selectedSlug)}
                    onChange={(v: any) => selectSlug(typeof v === "string" ? v : v?.value)}
                    maxVisibleItems={8}
                    closeOnSelect
                />
            )}
            <Forms.FormText className="vc-codexpet-hint">
                {pets.length ? `${pets.length} pets from codex-pet.com` : "Characters from codex-pet.com"}
            </Forms.FormText>
            {selected?.desc
                ? <Text variant="text-xs/normal" className="vc-codexpet-desc">{selected.desc}</Text>
                : null}

            <div className="vc-codexpet-controls">
                <SliderRow label="Size" value={size} min={24} max={160} onChange={v => save("size", v)} />
                <SliderRow label="Speed" value={speed} min={3} max={30} onChange={v => save("speed", v)} />
                <SliderRow label="FPS" value={fps} min={4} max={30} onChange={v => save("fps", v)} />
                <div className="vc-codexpet-toggles">
                    <Checkbox value={flip} onChange={(_, v) => save("flip", v)} size={18}>
                        <span className="vc-codexpet-check-label">Flip when walking</span>
                    </Checkbox>
                    <Checkbox value={pixelated} onChange={(_, v) => save("pixelated", v)} size={18}>
                        <span className="vc-codexpet-check-label">Pixelated</span>
                    </Checkbox>
                </div>
            </div>
        </div>
    );
}

function AboutPreview() {
    const { selectedUrl, selectedName } = settings.use(["selectedUrl", "selectedName"]);
    if (!selectedUrl) return null;

    return (
        <div className="vc-codexpet-about">
            <div className="vc-codexpet-floating">
                <PetPreview key={selectedUrl} url={selectedUrl} />
                <Text variant="text-sm/semibold">{selectedName || "—"}</Text>
            </div>
        </div>
    );
}

const settings = definePluginSettings({
    petPicker: {
        type: OptionType.COMPONENT,
        component: PetPicker
    },
    selectedSlug: { type: OptionType.STRING, description: "Selected pet slug", default: DEFAULT_PET.slug, hidden: true },
    selectedName: { type: OptionType.STRING, description: "Selected pet name", default: DEFAULT_PET.name, hidden: true },
    selectedUrl: { type: OptionType.STRING, description: "Selected pet spritesheet", default: DEFAULT_PET.url, hidden: true },
    size: { type: OptionType.NUMBER, description: "Pet height in px", default: 50, hidden: true },
    speed: { type: OptionType.NUMBER, description: "Movement speed", default: 10, hidden: true },
    fps: { type: OptionType.NUMBER, description: "Animation FPS", default: 16, hidden: true },
    flip: { type: OptionType.BOOLEAN, description: "Flip to face walk direction", default: true, hidden: true },
    pixelated: { type: OptionType.BOOLEAN, description: "Pixelated rendering", default: false, hidden: true }
});

export default definePlugin({
    name: "CodexPet",
    description: "A pet that follows your cursor, with 600+ characters from codex-pet.com. Pick one and preview it right in the settings.",
    authors: [Devs.outlayer],
    tags: ["Fun", "Appearance", "Customisation"],
    settings,
    settingsAboutComponent: AboutPreview,

    start() {
        started = true;
        fetchPets().catch(() => { });
        doReload();
    },

    stop() {
        started = false;
        clearTimeout(reloadTimer);
        current?.destroy();
        current = null;
    }
});
