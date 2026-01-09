/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Sourced from https://raw.githubusercontent.com/adryd325/oneko.js/5281d057c4ea9bd4f6f997ee96ba30491aed16c0/oneko.js
 * Licensed under https://github.com/adryd325/oneko.js/blob/main/LICENSE
 */

/* eslint-disable */

export default function oneko(options = {}) {
    const {
        speed = 10,
        fps = 24,
        image = "./oneko.gif",
        persistPosition = true,
        furColor = "#FFFFFF",
        outlineColor = "#000000",
    } = options;

    const isReducedMotion =
        window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
        window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

    if (isReducedMotion) return;

    const nekoEl = document.createElement("div");
    let nekoPosX = 32;
    let nekoPosY = 32;

    let mousePosX = 0;
    let mousePosY = 0;

    let frameCount = 0;
    let idleTime = 0;
    let idleAnimation = null;
    let idleAnimationFrame = 0;

    const nekoSpeed = speed;
    const spriteSets = {
        idle: [[-3, -3]],
        alert: [[-7, -3]],
        scratchSelf: [
            [-5, 0],
            [-6, 0],
            [-7, 0],
        ],
        scratchWallN: [
            [0, 0],
            [0, -1],
        ],
        scratchWallS: [
            [-7, -1],
            [-6, -2],
        ],
        scratchWallE: [
            [-2, -2],
            [-2, -3],
        ],
        scratchWallW: [
            [-4, 0],
            [-4, -1],
        ],
        tired: [[-3, -2]],
        sleeping: [
            [-2, 0],
            [-2, -1],
        ],
        N: [
            [-1, -2],
            [-1, -3],
        ],
        NE: [
            [0, -2],
            [0, -3],
        ],
        E: [
            [-3, 0],
            [-3, -1],
        ],
        SE: [
            [-5, -1],
            [-5, -2],
        ],
        S: [
            [-6, -3],
            [-7, -2],
        ],
        SW: [
            [-5, -3],
            [-6, -1],
        ],
        W: [
            [-4, -2],
            [-4, -3],
        ],
        NW: [
            [-1, 0],
            [-1, -1],
        ],
    };

    function recolorImage(src, furColor, outlineColor) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous"; // * Needed for CORS
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");

                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
                const data = imageData.data;

                const furRGB = hexToRgb(furColor);
                const outlineRGB = hexToRgb(outlineColor);

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    if (r === 255 && g === 255 && b === 255) {
                        data[i] = furRGB.r;
                        data[i + 1] = furRGB.g;
                        data[i + 2] = furRGB.b;
                    } else if (r === 0 && g === 0 && b === 0) {
                        data[i] = outlineRGB.r;
                        data[i + 1] = outlineRGB.g;
                        data[i + 2] = outlineRGB.b;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL());
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : { r: 0, g: 0, b: 0 };
    }

    function init() {
        const nekoFile = image; // Use passed-in image URL

        if (persistPosition) {
            let storedNeko = JSON.parse(window.localStorage.getItem("oneko"));
            if (storedNeko !== null) {
                nekoPosX = storedNeko.nekoPosX;
                nekoPosY = storedNeko.nekoPosY;
                mousePosX = storedNeko.mousePosX;
                mousePosY = storedNeko.mousePosY;
                frameCount = storedNeko.frameCount;
                idleTime = storedNeko.idleTime;
                idleAnimation = storedNeko.idleAnimation;
                idleAnimationFrame = storedNeko.idleAnimationFrame;
                nekoEl.style.backgroundPosition = storedNeko.bgPos;
            }
        }

        nekoEl.id = "oneko";
        nekoEl.ariaHidden = true;
        nekoEl.style.width = "32px";
        nekoEl.style.height = "32px";
        nekoEl.style.position = "fixed";
        nekoEl.style.pointerEvents = "none";
        nekoEl.style.imageRendering = "pixelated";
        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
        nekoEl.style.zIndex = 2147483647;

        recolorImage(nekoFile, furColor, outlineColor)
            .then((recoloredImageUrl) => {
                nekoEl.style.backgroundImage = `url(${recoloredImageUrl})`;
            })
            .catch((err) => {
                console.error("Failed to recolor Oneko image:", err);
                nekoEl.style.backgroundImage = `url(${nekoFile})`; // ! Error handling for tests
            });

        document.body.appendChild(nekoEl);

        document.addEventListener("mousemove", function (event) {
            mousePosX = event.clientX;
            mousePosY = event.clientY;
        });

        if (persistPosition) {
            window.addEventListener("beforeunload", function (event) {
                window.localStorage.setItem(
                    "oneko",
                    JSON.stringify({
                        nekoPosX: nekoPosX,
                        nekoPosY: nekoPosY,
                        mousePosX: mousePosX,
                        mousePosY: mousePosY,
                        frameCount: frameCount,
                        idleTime: idleTime,
                        idleAnimation: idleAnimation,
                        idleAnimationFrame: idleAnimationFrame,
                        bgPos: nekoEl.style.backgroundPosition,
                    })
                );
            });
        }

        window.requestAnimationFrame(onAnimationFrame);
    }

    let lastFrameTimestamp;

    function onAnimationFrame(timestamp) {
        if (!nekoEl.isConnected) return;
        if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
        if (timestamp - lastFrameTimestamp > 1000 / fps) {
            lastFrameTimestamp = timestamp;
            frame();
        }
        window.requestAnimationFrame(onAnimationFrame);
    }

    function setSprite(name, frame) {
        const sprite = spriteSets[name][frame % spriteSets[name].length];
        nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${
            sprite[1] * 32
        }px`;
    }

    function resetIdleAnimation() {
        idleAnimation = null;
        idleAnimationFrame = 0;
    }

    function idle() {
        idleTime += 1;

        if (
            idleTime > 10 &&
            Math.floor(Math.random() * 200) == 0 &&
            idleAnimation == null
        ) {
            let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
            if (nekoPosX < 32) avalibleIdleAnimations.push("scratchWallW");
            if (nekoPosY < 32) avalibleIdleAnimations.push("scratchWallN");
            if (nekoPosX > window.innerWidth - 32)
                avalibleIdleAnimations.push("scratchWallE");
            if (nekoPosY > window.innerHeight - 32)
                avalibleIdleAnimations.push("scratchWallS");
            idleAnimation =
                avalibleIdleAnimations[
                    Math.floor(Math.random() * avalibleIdleAnimations.length)
                ];
        }

        switch (idleAnimation) {
            case "sleeping":
                if (idleAnimationFrame < 8) {
                    setSprite("tired", 0);
                    break;
                }
                setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
                if (idleAnimationFrame > 192) {
                    resetIdleAnimation();
                }
                break;
            case "scratchWallN":
            case "scratchWallS":
            case "scratchWallE":
            case "scratchWallW":
            case "scratchSelf":
                setSprite(idleAnimation, idleAnimationFrame);
                if (idleAnimationFrame > 9) {
                    resetIdleAnimation();
                }
                break;
            default:
                setSprite("idle", 0);
                return;
        }
        idleAnimationFrame += 1;
    }

    function frame() {
        frameCount += 1;
        const diffX = nekoPosX - mousePosX;
        const diffY = nekoPosY - mousePosY;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        if (distance < nekoSpeed || distance < 48) {
            idle();
            return;
        }

        idleAnimation = null;
        idleAnimationFrame = 0;

        if (idleTime > 1) {
            setSprite("alert", 0);
            idleTime = Math.min(idleTime, 7);
            idleTime -= 1;
            return;
        }

        let direction;
        direction = diffY / distance > 0.5 ? "N" : "";
        direction += diffY / distance < -0.5 ? "S" : "";
        direction += diffX / distance > 0.5 ? "W" : "";
        direction += diffX / distance < -0.5 ? "E" : "";
        setSprite(direction, frameCount);

        nekoPosX -= (diffX / distance) * nekoSpeed;
        nekoPosY -= (diffY / distance) * nekoSpeed;

        nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
        nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
    }

    init();
}
