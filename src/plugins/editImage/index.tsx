import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { IconComponent, StartAt } from "@utils/types";
import { DraftType, MessageActions, React, UploadAttachmentStore, UploadHandler, UploadManager, useEffect, useMemo, useRef, useState } from "@webpack/common";

type EditorSettings = {
    exposure: number;     // [-2..2] in EV
    contrast: number;     // [0.5..1.5]
    saturation: number;   // [0..2]
    temperature: number;  // [-100..100]
    tint: number;         // [-100..100]
    sharpen: number;      // [0..1]
};

const defaultSettings: EditorSettings = {
    exposure: 0,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    tint: 0,
    sharpen: 0
};

function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
}

function srgbToLinear(u8: number) {
    const x = u8 / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function linearToSrgb(linear: number) {
    const x = clamp01(linear);
    const srgb = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(srgb * 255)));
}

function applyAdjustments(src: ImageData, settings: EditorSettings) {
    const { exposure, contrast, saturation, temperature, tint } = settings;
    const expMul = Math.pow(2, exposure);

    const t = temperature / 100;
    const ti = tint / 100;
    const rMul = 1 + 0.10 * t + 0.05 * ti;
    const gMul = 1 - 0.02 * t - 0.08 * ti;
    const bMul = 1 - 0.12 * t + 0.05 * ti;

    const data = src.data;
    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;

        let r = srgbToLinear(data[i]);
        let g = srgbToLinear(data[i + 1]);
        let b = srgbToLinear(data[i + 2]);

        r *= expMul; g *= expMul; b *= expMul;
        r *= rMul; g *= gMul; b *= bMul;

        const mid = 0.18;
        r = (r - mid) * contrast + mid;
        g = (g - mid) * contrast + mid;
        b = (b - mid) * contrast + mid;

        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = l + (r - l) * saturation;
        g = l + (g - l) * saturation;
        b = l + (b - l) * saturation;

        data[i] = linearToSrgb(r);
        data[i + 1] = linearToSrgb(g);
        data[i + 2] = linearToSrgb(b);
    }

    return src;
}

function sharpenUnsharpMask(src: ImageData, amount: number) {
    if (amount <= 0) return src;

    const w = src.width;
    const h = src.height;
    const data = src.data;
    const out = new Uint8ClampedArray(data);
    const idx = (x: number, y: number) => (y * w + x) * 4;

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = idx(x, y);
            for (let c = 0; c < 3; c++) {
                const v =
                    data[idx(x - 1, y - 1) + c] * 1 +
                    data[idx(x, y - 1) + c] * 2 +
                    data[idx(x + 1, y - 1) + c] * 1 +
                    data[idx(x - 1, y) + c] * 2 +
                    data[idx(x, y) + c] * 4 +
                    data[idx(x + 1, y) + c] * 2 +
                    data[idx(x - 1, y + 1) + c] * 1 +
                    data[idx(x, y + 1) + c] * 2 +
                    data[idx(x + 1, y + 1) + c] * 1;

                const blurred = v / 16;
                const orig = data[i + c];
                const diff = orig - blurred;
                out[i + c] = Math.max(0, Math.min(255, Math.round(orig + diff * (0.35 + amount * 1.65))));
            }
        }
    }

    src.data.set(out);
    return src;
}

function ImageEditorModal({
    onSend,
    onClose
}: {
    onSend: (blob: Blob, fileName: string, mime: string) => void;
    onClose: () => void;
}) {
    const [dragging, setDragging] = useState(false);
    const [hasImage, setHasImage] = useState(false);
    const [fileName, setFileName] = useState("edited-image.png");
    const [outputMime, setOutputMime] = useState<"image/png" | "image/jpeg">("image/png");
    const [jpegQuality, setJpegQuality] = useState(0.92);

    const [settings, setSettings] = useState<EditorSettings>(defaultSettings);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const bitmapRef = useRef<ImageBitmap | null>(null);
    const lastRenderToken = useRef(0);

    const render = async (nextSettings: EditorSettings) => {
        if (!bitmapRef.current) return;

        const token = ++lastRenderToken.current;
        await new Promise(requestAnimationFrame);
        if (token !== lastRenderToken.current) return;

        const bmp = bitmapRef.current;

        if (!workCanvasRef.current) workCanvasRef.current = document.createElement("canvas");
        const work = workCanvasRef.current;

        if (work.width !== bmp.width || work.height !== bmp.height) {
            work.width = bmp.width;
            work.height = bmp.height;
        }

        const wctx = work.getContext("2d", { willReadFrequently: true })!;
        wctx.setTransform(1, 0, 0, 1, 0, 0);
        wctx.imageSmoothingEnabled = true;
        wctx.imageSmoothingQuality = "high";
        wctx.clearRect(0, 0, work.width, work.height);
        wctx.drawImage(bmp, 0, 0);

        let img = wctx.getImageData(0, 0, work.width, work.height);
        img = applyAdjustments(img, nextSettings);
        img = sharpenUnsharpMask(img, nextSettings.sharpen);
        wctx.putImageData(img, 0, 0);

        const p = previewCanvasRef.current;
        if (!p) return;

        const maxW = 860;
        const maxH = 520;
        const ratio = Math.min(maxW / bmp.width, maxH / bmp.height, 1);
        const pw = Math.max(1, Math.round(bmp.width * ratio));
        const ph = Math.max(1, Math.round(bmp.height * ratio));

        if (p.width !== pw || p.height !== ph) {
            p.width = pw;
            p.height = ph;
        }

        const pctx = p.getContext("2d")!;
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        pctx.imageSmoothingEnabled = true;
        pctx.imageSmoothingQuality = "high";
        pctx.clearRect(0, 0, pw, ph);
        pctx.drawImage(work, 0, 0, pw, ph);
    };

    const loadFile = async (file: File) => {
        if (!file.type.startsWith("image/")) return;

        try { bitmapRef.current?.close?.(); } catch { }

        const bmp = await createImageBitmap(file);
        bitmapRef.current = bmp;
        setHasImage(true);

        const base = file.name.replace(/\.[^.]+$/, "");
        setFileName(base ? `${base}-edited.png` : "edited-image.png");
        setOutputMime("image/png");
        setSettings(defaultSettings);
        await render(defaultSettings);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await loadFile(file);
    };

    const handleSend = async () => {
        const work = workCanvasRef.current;
        if (!work || !hasImage) return;

        const mime = outputMime;
        const name = mime === "image/jpeg"
            ? fileName.replace(/\.png$/i, ".jpg").replace(/\.jpeg$/i, ".jpg")
            : fileName.replace(/\.jpe?g$/i, ".png");

        const blob = await new Promise<Blob | null>(resolve => {
            if (mime === "image/jpeg") work.toBlob(resolve, mime, jpegQuality);
            else work.toBlob(resolve, mime);
        });

        if (!blob) return;
        onSend(blob, name, mime);
    };

    useEffect(() => {
        if (!hasImage) return;
        void render(settings);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings, hasImage]);

    const modalInner = useMemo<React.CSSProperties>(() => ({
        width: "1080px",
        maxWidth: "96vw",
        maxHeight: "78vh",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
    }), []);

    const slider = (
        label: string,
        value: number,
        min: number,
        max: number,
        step: number,
        format: (v: number) => string,
        onChange: (v: number) => void
    ) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#b5bac1", fontSize: 12, fontWeight: 600 }}>{label}</span>
                <span style={{
                    color: "#fff",
                    fontSize: 11,
                    background: "#2b2d31",
                    padding: "2px 8px",
                    borderRadius: 999,
                    minWidth: 56,
                    textAlign: "center"
                }}>{format(value)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                style={{ width: "100%", accentColor: "#5865f2", cursor: "pointer" }}
                onChange={e => onChange(+e.target.value)}
            />
        </div>
    );

    return (
        <div style={modalInner}>
            <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => { if (!hasImage) fileInputRef.current?.click(); }}
                        style={{
                            flex: 1,
                            background: dragging ? "#2a2d3a" : "#111214",
                            border: `2px dashed ${dragging ? "#5865f2" : hasImage ? "#2e2f34" : "#3a3d44"}`,
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 520,
                            overflow: "hidden",
                            cursor: hasImage ? "default" : "pointer",
                            position: "relative"
                        }}
                    >
                        {!hasImage ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, userSelect: "none" }}>
                                <div style={{ fontSize: 52, fontWeight: 900, color: "#fff" }}>Upload</div>
                                <div style={{ textAlign: "center" }}>
                                    <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                                        Drop an image here, or click to upload
                                    </div>
                                    <div style={{ color: "#b5bac1", fontSize: 12 }}>
                                        PNG · JPG · WEBP (edits are applied at original resolution)
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <canvas
                                ref={previewCanvasRef}
                                style={{
                                    display: "block",
                                    maxWidth: "100%",
                                    maxHeight: 560,
                                    borderRadius: 10
                                }}
                            />
                        )}
                    </div>

                    <div style={{
                        width: 280,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        background: "#2b2d31",
                        borderRadius: 12,
                        padding: 14,
                        overflow: "auto"
                    }}>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>Adjustments</div>

                        {slider("Exposure", settings.exposure, -2, 2, 0.05, v => `${v.toFixed(2)} EV`, v => setSettings(s => ({ ...s, exposure: v })))}
                        {slider("Contrast", settings.contrast, 0.5, 1.5, 0.01, v => `${Math.round(v * 100)}%`, v => setSettings(s => ({ ...s, contrast: v })))}
                        {slider("Saturation", settings.saturation, 0, 2, 0.01, v => `${Math.round(v * 100)}%`, v => setSettings(s => ({ ...s, saturation: v })))}
                        {slider("Temperature", settings.temperature, -100, 100, 1, v => `${v}`, v => setSettings(s => ({ ...s, temperature: v })))}
                        {slider("Tint", settings.tint, -100, 100, 1, v => `${v}`, v => setSettings(s => ({ ...s, tint: v })))}
                        {slider("Sharpen", settings.sharpen, 0, 1, 0.01, v => `${Math.round(v * 100)}%`, v => setSettings(s => ({ ...s, sharpen: v })))}

                        <div style={{ height: 1, background: "#3a3d44", margin: "6px 0" }} />

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ color: "#b5bac1", fontSize: 12, fontWeight: 700 }}>Export</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={() => setOutputMime("image/png")}
                                    style={{
                                        flex: 1,
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid #3a3d44",
                                        background: outputMime === "image/png" ? "#1e1f22" : "transparent",
                                        color: outputMime === "image/png" ? "#fff" : "#b5bac1",
                                        cursor: "pointer",
                                        fontWeight: 800,
                                        fontSize: 12
                                    }}
                                >PNG (lossless)</button>
                                <button
                                    onClick={() => setOutputMime("image/jpeg")}
                                    style={{
                                        flex: 1,
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid #3a3d44",
                                        background: outputMime === "image/jpeg" ? "#1e1f22" : "transparent",
                                        color: outputMime === "image/jpeg" ? "#fff" : "#b5bac1",
                                        cursor: "pointer",
                                        fontWeight: 800,
                                        fontSize: 12
                                    }}
                                >JPG</button>
                            </div>
                            {outputMime === "image/jpeg" && slider("JPG Quality", jpegQuality, 0.6, 1, 0.01, v => `${Math.round(v * 100)}%`, v => setJpegQuality(v))}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                            <button
                                onClick={() => { setSettings(defaultSettings); void render(defaultSettings); }}
                                style={{
                                    padding: "10px",
                                    background: "transparent",
                                    border: "1px solid #3a3d44",
                                    borderRadius: 10,
                                    color: "#b5bac1",
                                    fontSize: 13,
                                    cursor: "pointer",
                                    fontWeight: 800
                                }}
                            >Reset</button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    padding: "10px",
                                    background: "#1e1f22",
                                    border: "1px solid #3a3d44",
                                    borderRadius: 10,
                                    color: "#fff",
                                    fontSize: 13,
                                    cursor: "pointer",
                                    fontWeight: 800
                                }}
                            >Change image</button>
                            <button
                                onClick={handleSend}
                                disabled={!hasImage}
                                style={{
                                    padding: "12px",
                                    background: hasImage ? "linear-gradient(135deg, #5865f2, #4752c4)" : "#3a3d44",
                                    border: "none",
                                    borderRadius: 10,
                                    color: hasImage ? "#fff" : "#6d6f78",
                                    fontSize: 14,
                                    cursor: hasImage ? "pointer" : "not-allowed",
                                    fontWeight: 900,
                                    letterSpacing: "0.2px"
                                }}
                            >Send</button>
                        </div>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files?.[0]) void loadFile(e.target.files[0]); }}
                />
        </div>
    );
}

function openEditor() {
    openModal((rootProps) => {
        const send = async (blob: Blob, name: string, mime: string) => {
            rootProps.onClose();
        try {
            const channel = getCurrentChannel();
            if (!channel) return;

            const file = new File([blob], name, { type: mime });
            await UploadHandler.promptToUpload([file], channel, DraftType.ChannelMessage);

            setTimeout(() => {
                const uploads = UploadAttachmentStore.getUploads(channel.id, DraftType.ChannelMessage);
                if (!uploads?.length) return;

                MessageActions.sendMessage(
                    channel.id,
                    { content: "", tts: false, invalidEmojis: [], validNonShortcutEmojis: [] },
                    true,
                    { attachmentsToUpload: uploads }
                );

                // Prevent the attachment from sticking around in the composer after sending.
                setTimeout(() => {
                    try {
                        UploadManager.clearAll(channel.id, DraftType.ChannelMessage);
                    } catch { }
                }, 10);
            }, 60);
        } catch (e) {
            console.error("[EditImageHQ] Failed to send image:", e);
        }
    };

        return (
            <ModalRoot {...rootProps} size={ModalSize.DYNAMIC} aria-label="Image Editor (HQ)">
                <ModalHeader>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ color: "var(--text-normal)", fontSize: 15, fontWeight: 800, letterSpacing: "-0.2px" }}>
                                Image Editor (HQ)
                            </div>
                            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                Full-resolution edits with high-quality export
                            </div>
                        </div>
                    </div>
                    <ModalCloseButton onClick={rootProps.onClose} />
                </ModalHeader>

                <ModalContent>
                    <ImageEditorModal onSend={send} onClose={rootProps.onClose} />
                </ModalContent>
            </ModalRoot>
        );
    });
}

function installExpressionPickerButton() {
    const ID = "vc-hq-image-editor-picker-btn";

    const tryInsertInto = (root: ParentNode) => {
        if (document.getElementById(ID)) return;

        const target =
            (root as HTMLElement).querySelector?.('[class*="expressionPicker"] [class*="header"]')
            ?? (root as HTMLElement).querySelector?.('[class*="emojiPicker"] [class*="header"]')
            ?? null;

        if (!target) return;

        const btn = document.createElement("button");
        btn.id = ID;
        btn.type = "button";
        btn.title = "Image editor";
        btn.setAttribute("aria-label", "Image editor");
        btn.style.cssText = [
            "margin-left:8px",
            "height:28px",
            "padding:0 10px",
            "border-radius:999px",
            "border:1px solid var(--background-modifier-accent)",
            "background:var(--background-secondary)",
            "color:var(--text-normal)",
            "cursor:pointer",
            "font-weight:700",
            "font-size:12px"
        ].join(";");
        btn.textContent = "Image Editor";
        btn.onclick = () => openEditor();

        target.appendChild(btn);
    };

    tryInsertInto(document);

    const obs = new MutationObserver(muts => {
        for (const m of muts) {
            for (const n of Array.from(m.addedNodes)) {
                if (!(n instanceof HTMLElement)) continue;
                tryInsertInto(n);
            }
        }
    });

    obs.observe(document.body, { childList: true, subtree: true });
    return obs;
}

const Icon: IconComponent = ({ width = 20, height = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className} fill="none">
        <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-13Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 16.5l4.7-4.7 3.1 3.1 2.2-2.2L19 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.2 9.2a1.7 1.7 0 1 0 0-.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChatButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    if (!isAnyChat) return null;
    return (
        <ChatBarButton tooltip="Image Editor" onClick={() => openEditor()}>
            <Icon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "EditImage",
    description: "edit avatar.",
    authors: [Devs.cute],
    requiresRestart: true,

    chatBarButton: {
        icon: Icon,
        render: ChatButton
    },

    start() {
        // Ensure the chat bar button is always enabled when the plugin is enabled.
        Settings.uiElements.chatBarButtons[this.name] ??= { enabled: true } as any;
        Settings.uiElements.chatBarButtons[this.name].enabled = true;
        this._observer = installExpressionPickerButton();
    },

    stop() {
        document.getElementById("vc-hq-image-editor-picker-btn")?.remove();
        this._observer?.disconnect();
        this._observer = null;
    },

    _observer: null as MutationObserver | null,
});