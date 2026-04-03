/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { PaintbrushIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { CloudUpload } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, DraftType, UploadAttachmentStore, UploadHandler, UploadManager } from "@webpack/common";
import { React, createRoot, useState } from "@webpack/common";

type BackgroundType = "transparent" | "solid" | "gradient";
type ToolType = "select" | "text" | "arrow" | "rect" | "circle";

interface BackgroundSettings {
  type: BackgroundType;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
}

interface ShadowSettings {
  enabled: boolean;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

interface BorderSettings {
  enabled: boolean;
  radius: number;
  width: number;
  color: string;
}

interface Annotation {
  id: string;
  type: "text" | "arrow" | "rect" | "circle";
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  size: number;
}

interface EditorSettings {
  background: BackgroundSettings;
  shadow: ShadowSettings;
  border: BorderSettings;
  padding: number;
  scale: number;
  annotationColor: string;
}

interface EditorSession {
  background: BackgroundSettings;
  shadow: ShadowSettings;
  border: BorderSettings;
  padding: number;
  scale: number;
  annotationColor: string;
  annotations: Annotation[];
  dataUrl: string | null;
}

const EDIT_SESSION_SYMBOL = Symbol("mockupEditorSession");

const GRADIENT_PRESETS = [
  { start: "#667eea", end: "#764ba2", name: "Purple Dream" },
  { start: "#f093fb", end: "#f5576c", name: "Pink Sunset" },
  { start: "#4facfe", end: "#00f2fe", name: "Ocean Blue" },
  { start: "#43e97b", end: "#38f9d7", name: "Fresh Mint" },
  { start: "#fa709a", end: "#fee140", name: "Warm Glow" },
  { start: "#1a1a2e", end: "#16213e", name: "Dark Night" },
  { start: "#ee0979", end: "#ff6a00", name: "Fire" },
  { start: "#11998e", end: "#38ef7d", name: "Emerald" },
  { start: "#fc466b", end: "#3f5efb", name: "Vivid" },
  { start: "#0052D4", end: "#6FB1FC", name: "Sky" }
];

const SOLID_COLORS = [
  "#ffffff", "#f8f9fa", "#e9ecef", "#dee2e6", "#ced4da",
  "#6c757d", "#495057", "#343a40", "#212529", "#000000",
  "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7",
  "#748ffc", "#da77f2", "#f783ac", "#20c997", "#fd7e14"
];

const ANNOTATION_COLORS = [
  "#ff0000", "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c",
  "#4dabf7", "#748ffc", "#da77f2", "#ffffff", "#000000"
];

const DEFAULT_BACKGROUND: BackgroundSettings = {
  type: "gradient",
  color: "#ffffff",
  gradientStart: "#667eea",
  gradientEnd: "#764ba2",
  gradientAngle: 135
};

const DEFAULT_SHADOW: ShadowSettings = {
  enabled: true,
  blur: 36,
  offsetX: 0,
  offsetY: 18,
  opacity: 28
};

const DEFAULT_BORDER: BorderSettings = {
  enabled: true,
  radius: 12,
  width: 1,
  color: "#ffffff"
};

const DEFAULT_PADDING = 32;
const DEFAULT_SCALE = 100;
const DEFAULT_ANNOTATION_COLOR = "#ff0000";

const styles = `
.vc-mockup-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 10, 16, 0.72);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-primary, "gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif);
  color: var(--text-normal, #f2f3f5);
}

.vc-mockup-editor-modal {
  width: min(1380px, 96vw);
  height: min(900px, 94vh);
  background: linear-gradient(180deg, rgba(32, 35, 42, 0.98), rgba(26, 27, 32, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.vc-mockup-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: rgba(18, 19, 24, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.vc-mockup-editor-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vc-mockup-editor-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.vc-mockup-editor-title span {
  font-size: 12px;
  color: var(--text-muted, #a5a9b1);
}

.vc-mockup-editor-actions {
  display: flex;
  gap: 8px;
}

.vc-mockup-editor-button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.vc-mockup-editor-button:active {
  transform: translateY(1px);
}

.vc-mockup-editor-button.secondary {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-normal, #f2f3f5);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.vc-mockup-editor-button.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.vc-mockup-editor-button.primary {
  background: linear-gradient(135deg, #5865f2, #7b6dff);
  color: white;
  box-shadow: 0 10px 24px rgba(88, 101, 242, 0.35);
}

.vc-mockup-editor-button.primary:hover {
  background: linear-gradient(135deg, #4c59d6, #6a5cf2);
}

.vc-mockup-editor-button.ghost {
  background: transparent;
  color: var(--text-muted, #a5a9b1);
  border: 1px solid transparent;
}

.vc-mockup-editor-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.vc-mockup-editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(33, 35, 41, 0.96), rgba(24, 26, 31, 0.96));
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.vc-mockup-editor-canvas-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 28px;
  background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 26px 26px;
}

.vc-mockup-editor-canvas-wrap {
  position: relative;
  padding: 10px;
  border-radius: 18px;
  background: rgba(20, 22, 27, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
}

.vc-mockup-editor-canvas-wrap.is-transparent {
  background-image:
    linear-gradient(45deg, #1c1d22 25%, transparent 25%),
    linear-gradient(-45deg, #1c1d22 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1c1d22 75%),
    linear-gradient(-45deg, transparent 75%, #1c1d22 75%);
  background-size: 18px 18px;
  background-position: 0 0, 0 9px, 9px -9px, -9px 0px;
  background-color: #111214;
}

.vc-mockup-editor-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.vc-mockup-editor-toolbar {
  margin: 16px;
  padding: 12px 14px;
  background: rgba(21, 23, 29, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.vc-mockup-editor-tools,
.vc-mockup-editor-colors,
.vc-mockup-editor-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vc-mockup-editor-tool-button {
  min-width: 46px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted, #b5bac1);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  cursor: pointer;
}

.vc-mockup-editor-tool-button.active {
  color: white;
  border-color: rgba(88, 101, 242, 0.6);
  background: rgba(88, 101, 242, 0.2);
}

.vc-mockup-editor-color {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
}

.vc-mockup-editor-color.active {
  border-color: white;
  box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.2);
}

.vc-mockup-editor-sidebar {
  width: 320px;
  padding: 18px 16px;
  overflow-y: auto;
  background: rgba(18, 19, 24, 0.96);
  color: var(--text-normal, #f2f3f5);
}

.vc-mockup-editor-section {
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.vc-mockup-editor-section:last-child {
  border-bottom: 0;
  margin-bottom: 0;
  padding-bottom: 0;
}

.vc-mockup-editor-section h3 {
  margin: 0 0 12px 0;
  font-size: 11px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--text-muted, #a5a9b1);
}

.vc-mockup-editor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.vc-mockup-editor-row label {
  font-size: 12px;
  color: var(--text-muted, #a5a9b1);
}

.vc-mockup-editor-row span {
  font-size: 12px;
  color: var(--text-normal, #f2f3f5);
}

.vc-mockup-editor-range {
  width: 100%;
}

.vc-mockup-editor-segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.vc-mockup-editor-segmented button {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted, #b5bac1);
  border-radius: 10px;
  padding: 8px 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  cursor: pointer;
}

.vc-mockup-editor-segmented button.active {
  background: rgba(88, 101, 242, 0.2);
  border-color: rgba(88, 101, 242, 0.6);
  color: white;
}

.vc-mockup-editor-color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.vc-mockup-editor-color-grid button {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
}

.vc-mockup-editor-color-grid button.active {
  border-color: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
}

.vc-mockup-editor-gradient-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.vc-mockup-editor-gradient-grid button {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
}

.vc-mockup-editor-gradient-grid button.active {
  border-color: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
}

.vc-mockup-editor-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-normal, #f2f3f5);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 12px;
}

.vc-mockup-editor-text-input {
  position: fixed;
  background: var(--background-floating, #1e1f22);
  border: 1px solid var(--background-secondary, #2b2d31);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  gap: 6px;
  z-index: 1010;
}

.vc-mockup-editor-text-input input {
  min-width: 180px;
}

.vc-mockup-editor-loading {
  font-size: 14px;
  color: var(--text-muted, #b5bac1);
}

`;

let styleElement: HTMLStyleElement | null = null;

function injectStyles() {
  if (styleElement) return;
  styleElement = document.createElement("style");
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

function removeStyles() {
  if (!styleElement) return;
  styleElement.remove();
  styleElement = null;
}

const ActionBarIcon = findByCodeLazy("Children.map", "isValidElement", "dangerous:");

let volatileDefaults: EditorSettings = {
  background: DEFAULT_BACKGROUND,
  shadow: DEFAULT_SHADOW,
  border: DEFAULT_BORDER,
  padding: DEFAULT_PADDING,
  scale: DEFAULT_SCALE,
  annotationColor: DEFAULT_ANNOTATION_COLOR
};

function buildSessionFromDefaults(): EditorSession {
  return {
    background: volatileDefaults.background,
    shadow: volatileDefaults.shadow,
    border: volatileDefaults.border,
    padding: volatileDefaults.padding,
    scale: volatileDefaults.scale,
    annotationColor: volatileDefaults.annotationColor,
    annotations: [],
    dataUrl: null
  };
}

function updateVolatileDefaults(session: EditorSession) {
  volatileDefaults = {
    background: session.background,
    shadow: session.shadow,
    border: session.border,
    padding: session.padding,
    scale: session.scale,
    annotationColor: session.annotationColor
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function isEditableImage(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/gif" || type === "image/svg+xml" || type === "image/apng") return false;
  if (type.startsWith("image/")) return true;
  const name = file.name.toLowerCase();
  return /\.(png|jpe?g|webp|bmp)$/.test(name);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.92): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function getOutputFileName(originalName: string, mime: string): string {
  const dot = originalName.lastIndexOf(".");
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  if (mime === "image/png") return `${base}.png`;
  if (mime === "image/webp") return `${base}.webp`;
  if (mime === "image/jpeg") return `${base}.jpg`;
  return originalName;
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) {
  const headLength = 15 + size * 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getUploadFile(upload: CloudUpload): File | null {
  const file = upload?.item?.file;
  return file instanceof File ? file : null;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function replaceUploadFile(upload: CloudUpload, edited: File, session?: EditorSession) {
  const channel = ChannelStore.getChannel(upload.channelId);
  if (!channel) {
    upload.item.file = edited;
    upload.filename = edited.name;
    if (edited.type) upload.mimeType = edited.type;
    if (typeof upload.preCompressionSize === "number") upload.preCompressionSize = edited.size;
    if (typeof upload.currentSize === "number") upload.currentSize = edited.size;
    return;
  }

  const currentUploads = UploadAttachmentStore.getUploads(upload.channelId, DraftType.ChannelMessage);
  const filesToUpload: File[] = [];
  let replaced = false;

  for (const current of currentUploads) {
    const file = getUploadFile(current);
    if (!file) continue;

    if (current.id === upload.id) {
      filesToUpload.push(edited);
      replaced = true;
    } else {
      filesToUpload.push(file);
    }
  }

  if (!replaced) {
    filesToUpload.push(edited);
  }

  UploadManager.clearAll(upload.channelId, DraftType.ChannelMessage);
  await sleep(30);
  UploadHandler.promptToUpload(filesToUpload, channel, DraftType.ChannelMessage);

  if (session) {
    for (let i = 0; i < 20; i++) {
      const replacement = UploadAttachmentStore
        .getUploads(upload.channelId, DraftType.ChannelMessage)
        .find(item => {
          const file = getUploadFile(item);
          return file && item.filename === edited.name && item.getSize() === edited.size;
        });

      if (replacement) {
        (replacement as CloudUpload & { [EDIT_SESSION_SYMBOL]?: EditorSession })[EDIT_SESSION_SYMBOL] = session;
        break;
      }

      await sleep(16);
    }
  }
}

function MockupEditor({
  file,
  session,
  onSessionChange,
  onSave,
  onClose
}: {
  file: File;
  session: EditorSession;
  onSessionChange: (session: EditorSession) => void;
  onSave: (edited: File) => void;
  onClose: () => void;
}) {
  const [background, setBackground] = React.useState<BackgroundSettings>(session.background);
  const [shadow, setShadow] = React.useState<ShadowSettings>(session.shadow);
  const [border, setBorder] = React.useState<BorderSettings>(session.border);
  const [padding, setPadding] = React.useState(session.padding);
  const [scale, setScale] = React.useState(session.scale);
  const [annotationColor, setAnnotationColor] = React.useState(session.annotationColor);

  const [dataUrl, setDataUrl] = React.useState<string | null>(session.dataUrl ?? null);
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const [annotations, setAnnotations] = React.useState<Annotation[]>(session.annotations ?? []);
  const [selectedTool, setSelectedTool] = React.useState<ToolType>("select");
  const [currentAnnotation, setCurrentAnnotation] = React.useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [draggedAnnotation, setDraggedAnnotation] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [showTextInput, setShowTextInput] = React.useState(false);
  const [textInputPosition, setTextInputPosition] = React.useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = React.useState("");
  const [didAutoFit, setDidAutoFit] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const canvasAreaRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let active = true;
    if (session.dataUrl) {
      setDataUrl(session.dataUrl);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    readFileAsDataUrl(file)
      .then((url) => {
        if (!active) return;
        setDataUrl(url);
      })
      .catch(() => {
        if (!active) return;
        setDataUrl(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [file, session.dataUrl]);

  React.useEffect(() => {
    onSessionChange({
      background,
      shadow,
      border,
      padding,
      scale,
      annotationColor,
      annotations,
      dataUrl
    });
  }, [background, shadow, border, padding, scale, annotationColor, annotations, dataUrl, onSessionChange]);

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const resetDefaults = React.useCallback(() => {
    setBackground(DEFAULT_BACKGROUND);
    setShadow(DEFAULT_SHADOW);
    setBorder(DEFAULT_BORDER);
    setPadding(DEFAULT_PADDING);
    setScale(DEFAULT_SCALE);
    setAnnotationColor(DEFAULT_ANNOTATION_COLOR);
    setAnnotations([]);
  }, []);

  React.useEffect(() => {
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      if (!didAutoFit && canvasAreaRef.current) {
        const availableWidth = canvasAreaRef.current.clientWidth - 120;
        if (availableWidth > 0 && img.width > availableWidth) {
          const fitScale = Math.floor((availableWidth / img.width) * 100);
          setScale(Math.max(10, Math.min(100, fitScale)));
        }
        setDidAutoFit(true);
      }
      renderCanvas();
    };
    img.src = dataUrl;
  }, [dataUrl]);

    const renderCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const scaleFactor = scale / 100;
    const imgWidth = image.width * scaleFactor;
    const imgHeight = image.height * scaleFactor;
    const canvasWidth = imgWidth + padding * 2;
    const canvasHeight = imgHeight + padding * 2;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (background.type !== "transparent") {
      if (background.type === "solid") {
        ctx.fillStyle = background.color;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else {
        const angle = (background.gradientAngle * Math.PI) / 180;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const length = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / 2;
        const x1 = centerX - Math.cos(angle) * length;
        const y1 = centerY - Math.sin(angle) * length;
        const x2 = centerX + Math.cos(angle) * length;
        const y2 = centerY + Math.sin(angle) * length;
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, background.gradientStart);
        gradient.addColorStop(1, background.gradientEnd);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    }

    const x = padding;
    const y = padding;
    const w = imgWidth;
    const h = imgHeight;
    const maxRadius = Math.min(w, h) / 2;
    const r = Math.min(border.radius, maxRadius);

    const drawRoundedRect = () => {
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.closePath();
      } else {
        drawRoundedRectPath(ctx, x, y, w, h, r);
      }
    };

    if (shadow.enabled) {
      if (background.type === "transparent") {
        const off = document.createElement("canvas");
        off.width = canvas.width;
        off.height = canvas.height;
        const offCtx = off.getContext("2d");

        if (offCtx) {
          offCtx.scale(dpr, dpr);
          offCtx.save();
          if (typeof offCtx.roundRect === "function") {
            offCtx.beginPath();
            offCtx.roundRect(x, y, w, h, r);
            offCtx.closePath();
          } else {
            drawRoundedRectPath(offCtx, x, y, w, h, r);
          }
          offCtx.clip();
          offCtx.drawImage(image, padding, padding, imgWidth, imgHeight);
          offCtx.restore();

          ctx.save();
          ctx.shadowColor = `rgba(0, 0, 0, ${shadow.opacity / 100})`;
          ctx.shadowBlur = shadow.blur;
          ctx.shadowOffsetX = shadow.offsetX;
          ctx.shadowOffsetY = shadow.offsetY;
          ctx.drawImage(off, 0, 0, canvasWidth, canvasHeight);
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${shadow.opacity / 100})`;
        ctx.shadowBlur = shadow.blur;
        ctx.shadowOffsetX = shadow.offsetX;
        ctx.shadowOffsetY = shadow.offsetY;
        drawRoundedRect();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    drawRoundedRect();
    ctx.clip();
    ctx.drawImage(image, padding, padding, imgWidth, imgHeight);
    ctx.restore();

    if (border.enabled && border.width > 0) {
      drawRoundedRect();
      ctx.strokeStyle = border.color;
      ctx.lineWidth = border.width;
      ctx.stroke();
    }

    const allAnnotations = currentAnnotation ? [...annotations, currentAnnotation] : annotations;
    allAnnotations.forEach((ann) => {
      ctx.save();
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.size;

      if (draggedAnnotation === ann.id) {
        ctx.shadowColor = ann.color;
        ctx.shadowBlur = 8;
      }

      if (ann.type === "text") {
        const fontSize = 16 + ann.size * 2;
        ctx.font = `bold ${fontSize}px "gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif`;
        ctx.fillText(ann.text || "Text", ann.x + padding, ann.y + padding);
      } else if (ann.type === "arrow" && ann.endX !== undefined && ann.endY !== undefined) {
        drawArrow(ctx, ann.x + padding, ann.y + padding, ann.endX + padding, ann.endY + padding, ann.size);
      } else if (ann.type === "rect" && ann.endX !== undefined && ann.endY !== undefined) {
        ctx.strokeRect(
          Math.min(ann.x, ann.endX) + padding,
          Math.min(ann.y, ann.endY) + padding,
          Math.abs(ann.endX - ann.x),
          Math.abs(ann.endY - ann.y)
        );
      } else if (ann.type === "circle" && ann.endX !== undefined && ann.endY !== undefined) {
        ctx.beginPath();
        ctx.ellipse(
          (ann.x + ann.endX) / 2 + padding,
          (ann.y + ann.endY) / 2 + padding,
          Math.abs(ann.endX - ann.x) / 2,
          Math.abs(ann.endY - ann.y) / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      ctx.restore();
    });
  }, [background, shadow, border, padding, scale, annotations, currentAnnotation, draggedAnnotation]);

  React.useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX - padding;
    const y = (clientY - rect.top) * scaleY - padding;
    return { x, y };
  };

  const getTextDimensions = (text: string, fontSize: number) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { width: 0, height: 0 };
    ctx.font = `bold ${fontSize}px "gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif`;
    const metrics = ctx.measureText(text);
    return { width: metrics.width, height: fontSize * 1.2 };
  };

  const getAnnotationAtPoint = (x: number, y: number) => {
    for (let i = annotations.length - 1; i >= 0; i -= 1) {
      const ann = annotations[i];
      if (ann.type === "text" && ann.text) {
        const fontSize = 16 + ann.size * 2;
        const dimensions = getTextDimensions(ann.text, fontSize);
        const paddingHit = 4;
        if (
          x >= ann.x - paddingHit &&
          x <= ann.x + dimensions.width + paddingHit &&
          y >= ann.y - dimensions.height - paddingHit &&
          y <= ann.y + paddingHit
        ) {
          return ann;
        }
      } else if (ann.endX !== undefined && ann.endY !== undefined) {
        const minX = Math.min(ann.x, ann.endX);
        const maxX = Math.max(ann.x, ann.endX);
        const minY = Math.min(ann.y, ann.endY);
        const maxY = Math.max(ann.y, ann.endY);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return ann;
        }
      }
    }
    return null;
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;

    if (selectedTool === "select") {
      const clicked = getAnnotationAtPoint(point.x, point.y);
      if (clicked) {
        setIsDragging(true);
        setDraggedAnnotation(clicked.id);
        setDragOffset({ x: point.x - clicked.x, y: point.y - clicked.y });
      } else {
        setDraggedAnnotation(null);
      }
      return;
    }

    setIsDrawing(true);

    if (selectedTool === "text") {
      setTextInputPosition({ x: event.clientX, y: event.clientY });
      setTextInputValue("");
      setShowTextInput(true);
      setIsDrawing(false);
      return;
    }

    setCurrentAnnotation({
      id: "current",
      type: selectedTool,
      x: point.x,
      y: point.y,
      endX: point.x,
      endY: point.y,
      color: annotationColor,
      size: 4
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;

    if (isDragging && draggedAnnotation) {
      setAnnotations((prev) =>
        prev.map((ann) => {
          if (ann.id !== draggedAnnotation) return ann;
          const nextX = point.x - dragOffset.x;
          const nextY = point.y - dragOffset.y;
          const deltaX = nextX - ann.x;
          const deltaY = nextY - ann.y;
          return {
            ...ann,
            x: nextX,
            y: nextY,
            endX: ann.endX !== undefined ? ann.endX + deltaX : ann.endX,
            endY: ann.endY !== undefined ? ann.endY + deltaY : ann.endY
          };
        })
      );
      return;
    }

    if (isDrawing && currentAnnotation) {
      setCurrentAnnotation({ ...currentAnnotation, endX: point.x, endY: point.y });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedAnnotation(null);
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    if (isDrawing && currentAnnotation && currentAnnotation.type !== "text") {
      setAnnotations((prev) => [...prev, { ...currentAnnotation, id: Date.now().toString() }]);
    }
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const handleTextSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!textInputValue.trim()) {
      setShowTextInput(false);
      return;
    }

    const point = getCanvasPoint(textInputPosition.x, textInputPosition.y);
    if (!point) return;

    setAnnotations((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "text",
        x: point.x,
        y: point.y,
        text: textInputValue.trim(),
        color: annotationColor,
        size: 4
      }
    ]);

    setShowTextInput(false);
    setTextInputValue("");
  };

    const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSaving) return;
    setIsSaving(true);
    const requestedMime = file.type && file.type.startsWith("image/") ? file.type : "image/png";
    const mime = background.type === "transparent" ? "image/png" : requestedMime;
    const blob = await canvasToBlob(canvas, mime, 0.92);
    if (!blob) {
      setIsSaving(false);
      return;
    }
    const outputType = blob.type || mime;
    const outputName = getOutputFileName(file.name, outputType);
    const edited = new File([blob], outputName, { type: outputType, lastModified: Date.now() });
    onSave(edited);
  };

  return (
    <div className="vc-mockup-editor-modal" role="dialog" aria-modal="true">
      <div className="vc-mockup-editor-header">
        <div className="vc-mockup-editor-title">
          <h2>MockupEditor</h2>
          <span>{file.name}</span>
        </div>
        <div className="vc-mockup-editor-actions">
          <button className="vc-mockup-editor-button secondary" onClick={onClose}>
            Close
          </button>
          <button className="vc-mockup-editor-button primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save and Upload"}
          </button>
          <button className="vc-mockup-editor-button ghost" onClick={resetDefaults}>
            Reset
          </button>
        </div>
      </div>

      <div className="vc-mockup-editor-body">
        <div className="vc-mockup-editor-main">
          <div className="vc-mockup-editor-canvas-area" ref={canvasAreaRef}>
            {loading && <div className="vc-mockup-editor-loading">Loading preview...</div>}
            {!loading && dataUrl && (
              <div className={`vc-mockup-editor-canvas-wrap ${background.type === "transparent" ? "is-transparent" : ""}`}>
                <canvas
                  ref={canvasRef}
                  className="vc-mockup-editor-canvas"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{
                    cursor: isDragging ? "grabbing" : selectedTool === "select" ? "grab" : "crosshair"
                  }}
                />
              </div>
            )}

            {showTextInput && (
              <div
                className="vc-mockup-editor-text-input"
                style={{ left: textInputPosition.x, top: textInputPosition.y - 48 }}
              >
                <form onSubmit={handleTextSubmit}>
                  <input
                    className="vc-mockup-editor-input"
                    type="text"
                    value={textInputValue}
                    onChange={(event) => setTextInputValue(event.target.value)}
                    placeholder="Enter text"
                    autoFocus
                  />
                </form>
                <button className="vc-mockup-editor-button primary" onClick={handleTextSubmit}>
                  Add
                </button>
                <button className="vc-mockup-editor-button secondary" onClick={() => setShowTextInput(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="vc-mockup-editor-toolbar">
            <div className="vc-mockup-editor-tools">
              {([
                { id: "select", label: "Sel" },
                { id: "text", label: "Text" },
                { id: "arrow", label: "Arrow" },
                { id: "rect", label: "Rect" },
                { id: "circle", label: "Circle" }
              ] as { id: ToolType; label: string }[]).map((tool) => (
                <button
                  key={tool.id}
                  className={`vc-mockup-editor-tool-button ${selectedTool === tool.id ? "active" : ""}`}
                  onClick={() => setSelectedTool(tool.id)}
                  title={tool.label}
                >
                  {tool.label}
                </button>
              ))}
            </div>
            <div className="vc-mockup-editor-colors">
              {ANNOTATION_COLORS.map((color) => (
                <button
                  key={color}
                  className={`vc-mockup-editor-color ${annotationColor === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setAnnotationColor(color)}
                  title={color}
                />
              ))}
            </div>
          <div className="vc-mockup-editor-actions-row">
            <button className="vc-mockup-editor-button secondary" onClick={() => setAnnotations([])}>
              Clear
            </button>
            <button className="vc-mockup-editor-button ghost" onClick={resetDefaults}>
              Reset
            </button>
          </div>
          </div>
        </div>

        <aside className="vc-mockup-editor-sidebar">
          <div className="vc-mockup-editor-section">
            <h3>Layout</h3>
            <div className="vc-mockup-editor-row">
              <label>Padding</label>
              <span>{padding}px</span>
            </div>
            <input
              className="vc-mockup-editor-range"
              type="range"
              min="0"
              max="200"
              step="4"
              value={padding}
              onChange={(event) => setPadding(Number(event.target.value))}
            />
            <div className="vc-mockup-editor-row" style={{ marginTop: 12 }}>
              <label>Scale</label>
              <span>{scale}%</span>
            </div>
            <input
              className="vc-mockup-editor-range"
              type="range"
              min="10"
              max="200"
              step="2"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
            />
          </div>

          <div className="vc-mockup-editor-section">
            <h3>Background</h3>
            <div className="vc-mockup-editor-segmented">
              {([
                { id: "transparent", label: "Transparent" },
                { id: "solid", label: "Solid" },
                { id: "gradient", label: "Gradient" }
              ] as { id: BackgroundType; label: string }[]).map((item) => (
                <button
                  key={item.id}
                  className={background.type === item.id ? "active" : ""}
                  onClick={() => setBackground({ ...background, type: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {background.type === "solid" && (
              <>
                <div className="vc-mockup-editor-color-grid">
                  {SOLID_COLORS.map((color) => (
                    <button
                      key={color}
                      className={background.color === color ? "active" : ""}
                      style={{ backgroundColor: color }}
                      onClick={() => setBackground({ ...background, color })}
                    />
                  ))}
                </div>
                <div className="vc-mockup-editor-row">
                  <label>Custom</label>
                  <input
                    className="vc-mockup-editor-input"
                    type="color"
                    value={background.color}
                    onChange={(event) => setBackground({ ...background, color: event.target.value })}
                  />
                </div>
              </>
            )}

            {background.type === "gradient" && (
              <>
                <div className="vc-mockup-editor-gradient-grid">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      className={background.gradientStart === preset.start && background.gradientEnd === preset.end ? "active" : ""}
                      style={{ background: `linear-gradient(135deg, ${preset.start}, ${preset.end})` }}
                      onClick={() =>
                        setBackground({
                          ...background,
                          gradientStart: preset.start,
                          gradientEnd: preset.end
                        })
                      }
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="vc-mockup-editor-row">
                  <label>Start</label>
                  <input
                    className="vc-mockup-editor-input"
                    type="color"
                    value={background.gradientStart}
                    onChange={(event) => setBackground({ ...background, gradientStart: event.target.value })}
                  />
                </div>
                <div className="vc-mockup-editor-row">
                  <label>End</label>
                  <input
                    className="vc-mockup-editor-input"
                    type="color"
                    value={background.gradientEnd}
                    onChange={(event) => setBackground({ ...background, gradientEnd: event.target.value })}
                  />
                </div>
                <div className="vc-mockup-editor-row">
                  <label>Angle</label>
                  <span>{background.gradientAngle} deg</span>
                </div>
                <input
                  className="vc-mockup-editor-range"
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={background.gradientAngle}
                  onChange={(event) => setBackground({ ...background, gradientAngle: Number(event.target.value) })}
                />
              </>
            )}
          </div>

          <div className="vc-mockup-editor-section">
            <h3>Appearance</h3>

            <div className="vc-mockup-editor-row">
              <label>Border</label>
              <input
                type="checkbox"
                checked={border.enabled}
                onChange={(event) => setBorder({ ...border, enabled: event.target.checked })}
              />
            </div>
            {border.enabled && (
              <>
                <div className="vc-mockup-editor-row">
                  <label>Radius</label>
                  <span>{border.radius}px</span>
                </div>
                <input
                  className="vc-mockup-editor-range"
                  type="range"
                  min="0"
                  max="100"
                  step="4"
                  value={border.radius}
                  onChange={(event) => setBorder({ ...border, radius: Number(event.target.value) })}
                />
                <div className="vc-mockup-editor-row">
                  <label>Width</label>
                  <span>{border.width}px</span>
                </div>
                <input
                  className="vc-mockup-editor-range"
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={border.width}
                  onChange={(event) => setBorder({ ...border, width: Number(event.target.value) })}
                />
                <div className="vc-mockup-editor-row">
                  <label>Color</label>
                  <input
                    className="vc-mockup-editor-input"
                    type="color"
                    value={border.color}
                    onChange={(event) => setBorder({ ...border, color: event.target.value })}
                  />
                </div>
              </>
            )}

            <div className="vc-mockup-editor-row" style={{ marginTop: 12 }}>
              <label>Shadow</label>
              <input
                type="checkbox"
                checked={shadow.enabled}
                onChange={(event) => setShadow({ ...shadow, enabled: event.target.checked })}
              />
            </div>
            {shadow.enabled && (
              <>
                <div className="vc-mockup-editor-row">
                  <label>Blur</label>
                  <span>{shadow.blur}px</span>
                </div>
                <input
                  className="vc-mockup-editor-range"
                  type="range"
                  min="0"
                  max="100"
                  step="4"
                  value={shadow.blur}
                  onChange={(event) => setShadow({ ...shadow, blur: Number(event.target.value) })}
                />
                <div className="vc-mockup-editor-row">
                  <label>Opacity</label>
                  <span>{shadow.opacity}%</span>
                </div>
                <input
                  className="vc-mockup-editor-range"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={shadow.opacity}
                  onChange={(event) => setShadow({ ...shadow, opacity: Number(event.target.value) })}
                />
                <div className="vc-mockup-editor-row">
                  <label>Offset X</label>
                  <span>{shadow.offsetX}px</span>
                </div>
                <input
                  className="vc-mockup-editor-range"
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={shadow.offsetX}
                  onChange={(event) => setShadow({ ...shadow, offsetX: Number(event.target.value) })}
                />
                <div className="vc-mockup-editor-row">
                  <label>Offset Y</label>
                  <span>{shadow.offsetY}px</span>
                </div>
                <input
                  className="vc-mockup-editor-range"
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={shadow.offsetY}
                  onChange={(event) => setShadow({ ...shadow, offsetY: Number(event.target.value) })}
                />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

type EditorResult = { edited: File; session: EditorSession } | { edited: null; session: EditorSession };

function openEditor(file: File, session: EditorSession): Promise<EditorResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "vc-mockup-editor-overlay";
    document.body.appendChild(overlay);

    const root = createRoot(overlay);
    let latestSession = session;

    const cleanup = () => {
      root.unmount();
      overlay.remove();
    };

    const handleSessionChange = (nextSession: EditorSession) => {
      latestSession = nextSession;
    };

    const handleSave = (edited: File) => {
      updateVolatileDefaults(latestSession);
      cleanup();
      resolve({ edited, session: latestSession });
    };

    const handleClose = () => {
      updateVolatileDefaults(latestSession);
      cleanup();
      resolve({ edited: null, session: latestSession });
    };

    root.render(
      <MockupEditor
        file={file}
        session={session}
        onSessionChange={handleSessionChange}
        onSave={handleSave}
        onClose={handleClose}
      />
    );
  });
}

async function editUploads(uploads: CloudUpload[]) {
  if (!Array.isArray(uploads) || uploads.length === 0) return;

  for (const upload of uploads) {
    if (!upload?.isImage) continue;
    const file = getUploadFile(upload);
    if (!file || !isEditableImage(file)) continue;

    const existingSession = (upload as CloudUpload & { [EDIT_SESSION_SYMBOL]?: EditorSession })[EDIT_SESSION_SYMBOL];
    const session = existingSession ?? buildSessionFromDefaults();
    const result = await openEditor(file, session);

    (upload as CloudUpload & { [EDIT_SESSION_SYMBOL]?: EditorSession })[EDIT_SESSION_SYMBOL] = result.session;

    if (!result.edited) continue;
    await replaceUploadFile(upload, result.edited, result.session);
  }
}

function renderAttachmentActionBar(this: any, children: React.ReactNode[], props: { upload?: CloudUpload }) {
  if (!props?.upload?.isImage) return;
  children.push(
    React.createElement(this.MockupEditorEditUploadButton ?? MockupEditorEditUploadButton, { upload: props.upload, key: "vc-mockup-editor-edit" })
  );
}

export default definePlugin({
  name: "mockupEditor",
  description: "Shows a Discord-themed editor when uploading images so you can change background and annotate before upload.",
  authors: [Devs.hazesjsbn],
  requiresRestart: false,
  patches: [
    {
      find: "#{intl::ATTACHMENT_UTILITIES_SPOILER}",
      replacement: {
        match: /(?<=children:\[)(?=.{10,80}tooltip:.{0,100}#{intl::ATTACHMENT_UTILITIES_SPOILER})/,
        replace: "arguments[0].canEdit!==false?$self.MockupEditorEditUploadButton(arguments[0]):null,"
      }
    }
  ],
  start() {
    injectStyles();
  },
  stop() {
    removeStyles();
  },
  MockupEditorEditUploadButton: ({ upload }: { upload: CloudUpload }) => {
    const [isBusy, setIsBusy] = useState(false);

    if (!upload?.isImage || !getUploadFile(upload)) return null;

    const handleClick = async () => {
      if (isBusy) return;
      setIsBusy(true);
      const file = getUploadFile(upload);
      if (!file) {
        setIsBusy(false);
        return;
      }
      const existingSession = (upload as CloudUpload & { [EDIT_SESSION_SYMBOL]?: EditorSession })[EDIT_SESSION_SYMBOL];
      const session = existingSession ?? buildSessionFromDefaults();
      const result = await openEditor(file, session);
      (upload as CloudUpload & { [EDIT_SESSION_SYMBOL]?: EditorSession })[EDIT_SESSION_SYMBOL] = result.session;
      if (result.edited) {
        await replaceUploadFile(upload, result.edited, result.session);
      }
      setIsBusy(false);
    };

    return (
      <ActionBarIcon tooltip="MockupEditor" onClick={handleClick}>
        <PaintbrushIcon width={18} height={18} />
      </ActionBarIcon>
    );
  },
  editUploads
});
