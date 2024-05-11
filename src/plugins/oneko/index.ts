/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let onscroll;
const onChange = now => {
    if(now)
        document.addEventListener("wheel", onscroll);
    else
        document.removeEventListener("wheel", onscroll);
};

const settings = definePluginSettings({
    moveOnScroll: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Move oneko as you scroll",
        onChange
    }
});


export default definePlugin({
    name: "oneko",
    description: "cat follow mouse (real)",
    // Listing adryd here because this literally is just her script
    authors: [Devs.Ven, Devs.adryd, Devs.rozbrajaczpoziomow],
    settings,

    start() {
        // oneko.js: https://github.com/adryd325/oneko.js
        const nekoEl = document.createElement("div");

        let nekoPosX = 32;
        let nekoPosY = 32;

        let mousePosX = 0;
        let mousePosY = 0;

        let frameCount = 0;
        let idleTime = 0;
        let idleAnimation = null;
        let idleAnimationFrame = 0;

        const nekoSpeed = 10;
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

        function init() {
            nekoEl.id = "oneko";
            nekoEl.ariaHidden = true;
            nekoEl.style.width = "32px";
            nekoEl.style.height = "32px";
            nekoEl.style.position = "fixed";
            nekoEl.style.pointerEvents = "none";
            nekoEl.style.backgroundImage = "url('https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif')";
            nekoEl.style.imageRendering = "pixelated";
            nekoEl.style.left = `${nekoPosX - 16}px`;
            nekoEl.style.top = `${nekoPosY - 16}px`;
            nekoEl.style.zIndex = Number.MAX_VALUE;

            document.body.appendChild(nekoEl);

            onscroll = function (event) {
                // asserting event.deltaMode == 0 because I'm too stupid to check if it's something else
                nekoPosY += event.deltaY / 10;
                updatePos();
            }.bind(this);
            onChange(settings.store.moveOnScroll);
            document.addEventListener("mousemove", function (event) {
                mousePosX = event.clientX;
                mousePosY = event.clientY;
            });

            window.requestAnimationFrame(onAnimatonFrame);
        }

        let lastFrameTimestamp;

        function onAnimatonFrame(timestamp) {
            // Stops execution if the neko element is removed from DOM
            if (!nekoEl.isConnected) {
                return;
            }
            if (!lastFrameTimestamp) {
                lastFrameTimestamp = timestamp;
            }
            if (timestamp - lastFrameTimestamp > 100) {
                lastFrameTimestamp = timestamp;
                frame();
            }
            window.requestAnimationFrame(onAnimatonFrame);
        }

        function setSprite(name, frame) {
            const sprite = spriteSets[name][frame % spriteSets[name].length];
            nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
        }

        function resetIdleAnimation() {
            idleAnimation = null;
            idleAnimationFrame = 0;
        }

        function idle() {
            idleTime += 1;

            // every ~ 20 seconds
            if (
                idleTime > 10 &&
                Math.floor(Math.random() * 200) === 0 &&
                idleAnimation === null
            ) {
                const avalibleIdleAnimations = ["sleeping", "scratchSelf"];
                if (nekoPosX < 32) {
                    avalibleIdleAnimations.push("scratchWallW");
                }
                if (nekoPosY < 32) {
                    avalibleIdleAnimations.push("scratchWallN");
                }
                if (nekoPosX > window.innerWidth - 32) {
                    avalibleIdleAnimations.push("scratchWallE");
                }
                if (nekoPosY > window.innerHeight - 32) {
                    avalibleIdleAnimations.push("scratchWallS");
                }
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
                // count down after being alerted before moving
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

            updatePos();
        }

        function updatePos() {
            nekoEl.style.left = `${nekoPosX - 16}px`;
            nekoEl.style.top = `${nekoPosY - 16}px`;
        }

        init();
    },

    stop() {
        document.getElementById("oneko")?.remove();
    }
});
