import { CLASS_PREFIX } from "../constants";
import { VideoCopyConfig } from "../types";
import { findStreamVideoElement } from "../utils/videoFinder";

/**
 * Resize a container to match video resolution.
 * Max 800px, min 200px, maintains aspect ratio.
 */
function resizeContainerToVideo(
    container: HTMLDivElement,
    videoWidth: number,
    videoHeight: number
): void {
    const maxDimension = 800;
    const minDimension = 200;
    let newWidth = videoWidth;
    let newHeight = videoHeight;

    if (newWidth > maxDimension || newHeight > maxDimension) {
        const scale = maxDimension / Math.max(newWidth, newHeight);
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
    }

    newWidth = Math.max(minDimension, newWidth);
    newHeight = Math.max(minDimension, newHeight);

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
}

/**
 * Creates a resize handler that will only resize once.
 */
function createResizeHandler(container: HTMLDivElement): (videoWidth: number, videoHeight: number) => void {
    let done = false;
    return (videoWidth: number, videoHeight: number) => {
        if (done) return;
        done = true;
        resizeContainerToVideo(container, videoWidth, videoHeight);
    };
}

/**
 * Show fallback error message when video is not available.
 */
function showFallback(content: HTMLDivElement, icon: string, message: string): void {
    content.innerHTML = `
        <div class="${CLASS_PREFIX}-no-preview">
            <div class="${CLASS_PREFIX}-no-preview-icon">${icon}</div>
            <div>${message}</div>
        </div>
    `;
}

/**
 * Start video copy - copies frames from a source video to a canvas.
 */
export function startVideoCopy(
    container: HTMLDivElement,
    config: VideoCopyConfig
): void {
    const content = container.querySelector(`.${CLASS_PREFIX}-content`) as HTMLDivElement;
    if (!content) return;

    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let animationFrameId: number | null = null;
    let retryCount = 0;
    const maxRetries = 20;
    const resizeOnce = createResizeHandler(container);

    function findSourceVideo(): HTMLVideoElement | null {
        return findStreamVideoElement(config.ownerId, config.sourceDocument);
    }

    function setupCanvas() {
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.className = `${CLASS_PREFIX}-canvas`;
            content.innerHTML = "";
            content.appendChild(canvas);
            ctx = canvas.getContext("2d");
        }
    }

    function copyFrame() {
        const sourceVideo = findSourceVideo();

        if (!sourceVideo || sourceVideo.videoWidth === 0) {
            retryCount++;
            if (retryCount > maxRetries * 60) { // ~20 seconds at 60fps
                stopCopying();
                showFallback(content, config.fallbackIcon, config.fallbackMessage);
                return;
            }
            animationFrameId = requestAnimationFrame(copyFrame);
            return;
        }

        retryCount = 0;
        resizeOnce(sourceVideo.videoWidth, sourceVideo.videoHeight);

        if (!canvas || !ctx) {
            setupCanvas();
        }

        if (canvas && ctx) {
            if (canvas.width !== sourceVideo.videoWidth || canvas.height !== sourceVideo.videoHeight) {
                canvas.width = sourceVideo.videoWidth;
                canvas.height = sourceVideo.videoHeight;
            }

            try {
                ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
            } catch (e) {
                // drawImage failed
            }
        }

        animationFrameId = requestAnimationFrame(copyFrame);
    }

    function stopCopying() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    animationFrameId = requestAnimationFrame(copyFrame);
    (container as any)._stopCopying = stopCopying;
}
