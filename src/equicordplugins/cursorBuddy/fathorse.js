/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-disable */
/* Sourced from https://raw.githubusercontent.com/nexpid/fatass-horse/5363cf9b5904211de79d2597200374340efac676/horse.js */

// https://github.com/adryd325/oneko.js
export default function fathorse(cfg) {
    document.getElementById("fathorse")?.remove();

    // generated
    const spritesheet = { right: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0]], downright: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1]], down: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2]], downleft: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3]], left: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4]], upleft: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5]], up: [[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6]], upright: [[0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7]] };
    const gridX = 9, gridY = 8;

    const config = {
        speed: cfg.speed ?? 30,
        framerate: cfg.fps ?? 24,
        size: cfg.size ?? 120,
        fade: cfg.fade ?? true,
        freeroam: cfg.freeroam ?? true,
        shake: cfg.shake || window._horseShake,
        image: cfg.image
    };
    const horsePos = {
        x: config.size / 2,
        y: config.size / 2
    };
    const mousePos = {
        x: horsePos.x,
        y: horsePos.y
    };

    const hz = 1e3 / config.framerate;
    const freeroamStart = 9e3;
    const freeroamInterval = 3e3;
    const freeroamSpeed = 12;

    const fathorse = document.createElement("div");

    let lastFrame, shakeUntil = 0;
    function lifecycle() {
        if (!fathorse.parentElement) return;

        if (!lastFrame) lastFrame = Date.now();
        if ((Date.now() - lastFrame) >= hz) {
            frame();
        }

        if (config.shake) {
            if (shakeUntil >= Date.now()) {
                const x = Math.floor(Math.random() * 4 - 2);
                const y = Math.floor(Math.random() * 4 - 2);
                document.body.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            } else {
                document.body.style.transform = "";
            }
        }

        requestAnimationFrame(lifecycle);
    }

    function moved() {
        shakeUntil = Date.now() + 20;
    }

    let animationFrame = 0;
    function update(frame, active) {
        const sprites = spritesheet[frame];
        let sprite = sprites[0];
        if (active) sprite = sprites[Math.floor(animationFrame) % sprites.length];

        fathorse.style.backgroundPosition = `-${sprite[0] * config.size}px -${sprite[1] * config.size}px`;

        fathorse.style.left = `${horsePos.x - config.size / 2}px`;
        fathorse.style.top = `${horsePos.y - config.size / 2}px`;
    }

    let nextMove = Infinity, isRoaming = false;
    function frame() {
        lastFrame = Date.now();
        if (config.freeroam && nextMove < Date.now()) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.min(window.innerWidth, window.innerHeight) / config.size * 50;

            mousePos.x = Math.abs((mousePos.x + Math.sin(angle) * distance) % window.innerWidth);
            mousePos.y = Math.abs((mousePos.y + Math.cos(angle) * distance) % window.innerHeight);
            isRoaming = true;
        }

        const diffX = mousePos.x - horsePos.x;
        const diffY = mousePos.y - horsePos.y;
        const dist = Math.sqrt(diffX ** 2 + diffY ** 2);

        const direction = [
            diffY / dist < -0.5 ? "up" : "",
            diffY / dist > 0.5 ? "down" : "",
            diffX / dist < -0.5 ? "left" : "",
            diffX / dist > 0.5 ? "right" : "",
        ].join("") || "down";

        const speed = isRoaming ? Math.min(config.speed, freeroamSpeed) : config.speed;

        if (dist >= Math.max(speed, config.size * 0.7)) {
            animationFrame++;

            if (isRoaming) nextMove = Date.now() + freeroamInterval;

            const innerSize = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
            const mult = dist / innerSize > 0.5;
            if (mult || animationFrame % 2 === 1) {
                horsePos.x += (diffX / dist) * speed;
                horsePos.y += (diffY / dist) * speed;

                if (!isRoaming) moved();
            }

            const inset = config.size / 2;
            horsePos.x = Math.min(Math.max(inset, horsePos.x), window.innerWidth - inset);
            horsePos.y = Math.min(Math.max(inset, horsePos.y), window.innerHeight - inset);

            update(direction, true);
        } else {
            animationFrame = 0;
            update(direction);
        }

        const hoverLimit = config.size * 0.6;
        if (isRoaming) {
            fathorse.style.opacity = "80%";
        } else if (config.fade && dist <= hoverLimit) {
            fathorse.style.opacity = `${15 + (dist / hoverLimit) * 85}%`;
        } else {
            fathorse.style.opacity = "";
        }
    }

    fathorse.id = "fathorse";
    fathorse.ariaHidden = true;
    fathorse.style.width = `${config.size}px`;
    fathorse.style.height = `${config.size}px`;
    fathorse.style.left = `${horsePos.x - config.size / 2}px`;
    fathorse.style.top = `${horsePos.y - config.size / 2}px`;
    fathorse.style.position = "fixed";
    fathorse.style.pointerEvents = "none";
    fathorse.style.imageRendering = "pixelated";
    fathorse.style.zIndex = 2147483647;
    fathorse.style.backgroundImage = `url(${JSON.stringify(config.image)})`;
    fathorse.style.backgroundSize = `${gridX * config.size}px ${gridY * config.size}px`;
    fathorse.style.willChange = "left, top, background-position";
    fathorse.style.transition = "opacity 0.1s linear";
    document.body.appendChild(fathorse);

    if (config.shake) document.body.style.willChange = "transform";

    window.addEventListener("mousemove", ev => {
        mousePos.x = ev.clientX;
        mousePos.y = ev.clientY;

        nextMove = Date.now() + freeroamStart;
        isRoaming = false;
    });

    requestAnimationFrame(lifecycle);

    return mousePos;
};
