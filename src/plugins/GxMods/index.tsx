/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import { getZipJs } from "@utils/dependencies";
import { Logger } from "@utils/Logger";
import definePlugin, { PluginDef } from "@utils/types";
import { Text } from "@webpack/common";

import { getCrxLink, getModInfo } from "./api/api";
import { GxModManifest } from "./types";
import { fetchCrxFile } from "./utils";

const logger = new Logger("GxMod");

// TODO: Make this a setting.
const modId = "605a8f04-f91b-4f94-8e33-94f4c56e3b05";

let GxModCrx: import("@zip.js/zip.js").ZipReader<unknown> | null = null;


type SfxCollection = { sounds: Blob[]; idx: number; };
export default definePlugin<PluginDef & {
    manifestJson?: GxModManifest;
    sfx: { click: SfxCollection; typing: Record<string, SfxCollection>; };
}>({
    name: "GxMods",
    description: "Integrates OperaGX Mods into discord.",
    authors: [Devs.Arjix],

    settingsAboutComponent: () => {
        return <Text>Integrates OperaGX Mods into discord. (
            <a onClick={e => {
                e.preventDefault();
                VencordNative.native.openExternal("https://store.gx.me");
                return false;
            }} href="https://store.gx.me"
            >https://store.gx.me</a>)</Text>;
    },

    async start() {
        const modInfo = await getModInfo(modId);
        const crxLink = await getCrxLink(modInfo.data.crxId);

        const { TextWriter } = await getZipJs();
        GxModCrx = await fetchCrxFile(crxLink!);
        const entries = await GxModCrx.getEntries();

        const manifest = new TextWriter();
        const manifestFile = entries.find(e => e.filename === "manifest.json")!;
        await manifestFile.getData!(manifest);

        this.manifestJson = JSON.parse(await manifest.getData()) as GxModManifest;
        this.bgmFilename = this.manifestJson.mod.payload.background_music[0];

        logger.info("Loaded manifest!");

        this.registerSounds();
    },

    getAudioPlayer(): HTMLAudioElement {
        if (this.player) return this.player;

        this.player = Object.assign(document.createElement("audio"), {
            loop: true,
            volume: 0.1
        });

        document.body.appendChild(this.player);

        return this.player;
    },

    async playBgm() {
        const bgmFilename = this.manifestJson!.mod.payload.background_music[0];
        const music = await GxModCrx?.getEntries().then(entries => entries.find(e => e.filename === bgmFilename));
        if (!music) return;

        const { BlobWriter } = await getZipJs();

        const blobWriter = new BlobWriter();
        await music.getData?.(blobWriter);

        this.bgmBlob = await blobWriter.getData();
        const player = this.getAudioPlayer();

        player.src = URL.createObjectURL(this.bgmBlob);
        player.play();

        logger.info("Started playing bgm!");
    },

    sfx: {
        click: {
            sounds: [],
            idx: 0
        },
        typing: {
            letter: {
                sounds: [],
                idx: 0
            },
            space: {
                sounds: [],
                idx: 0
            },
            enter: {
                sounds: [],
                idx: 0
            },
            backspace: {
                sounds: [],
                idx: 0
            }
        }
    },
    async registerSounds() {
        this.playBgm();

        const entries = await GxModCrx?.getEntries();
        if (!entries) return;

        const { BlobWriter } = await getZipJs();

        const clickSounds = this.manifestJson!.mod.payload.browser_sounds.CLICK;
        for (const sound of clickSounds) {
            const entry = entries.find(e => e.filename === sound);
            if (!entry) continue;

            const blobWriter = new BlobWriter();
            await entry.getData?.(blobWriter);
            this.sfx.click?.sounds.push(await await blobWriter.getData());
        }

        await Promise.all(Object.entries(this.manifestJson!.mod.payload.keyboard_sounds).map(async ([type, sounds]) => {
            type = type.split("_")[1].toLowerCase();
            switch (type) {
                case "letter":
                case "enter":
                case "backspace":
                case "space": {
                    for (const sound of sounds as string[]) {
                        const entry = entries.find(e => e.filename === sound);
                        if (!entry) continue;

                        const soundBlob = new BlobWriter();
                        await entry.getData?.(soundBlob);

                        this.sfx.typing[type].sounds.push(await soundBlob.getData());
                    }
                    break;
                }
                default: {
                    logger.warn(`Unknown keyboard sound found. [${type}]`);
                }
            }
        }));

        window.addEventListener("mouseup", () => {
            if (!this.sfx.click.sounds.length) return;

            const audio = document.createElement("audio");
            audio.onended = () => audio.remove();


            this.sfx.click.idx += 1;
            if (this.sfx.click.idx === this.sfx.click.sounds.length) {
                this.sfx.click.idx = 0;
            }

            audio.src = URL.createObjectURL(this.sfx.click.sounds[this.sfx.click.idx]);

            document.body.appendChild(audio);
            audio.play();
        });

        let keyReleased = true;

        window.addEventListener("keyup", () => {
            keyReleased = true;
        }, true);

        window.addEventListener("keydown", ({ key }) => {
            if (!keyReleased) return;

            keyReleased = false;
            const audio = document.createElement("audio");
            audio.onended = () => audio.remove();

            switch (key.toLowerCase()) {
                case " ": {
                    if (!this.sfx.typing.space.sounds.length) return;

                    this.sfx.typing.space.idx += 1;
                    if (this.sfx.typing.space.idx === this.sfx.typing.space.sounds.length) {
                        this.sfx.typing.space.idx = 0;
                    }
                    audio.src = URL.createObjectURL(this.sfx.typing.space.sounds[this.sfx.typing.space.idx]!);
                    break;
                }
                case "Backspace": {
                    if (!this.sfx.typing.backspace.sounds.length) return;

                    this.sfx.typing.backspace.idx += 1;
                    if (this.sfx.typing.backspace.idx === this.sfx.typing.backspace.sounds.length) {
                        this.sfx.typing.backspace.idx = 0;
                    }
                    audio.src = URL.createObjectURL(this.sfx.typing.backspace.sounds[this.sfx.typing.backspace.idx]!);
                    break;
                }
                case "Enter": {
                    if (!this.sfx.typing.enter.sounds.length) return;

                    this.sfx.typing.enter.idx += 1;
                    if (this.sfx.typing.enter.idx === this.sfx.typing.enter.sounds.length) {
                        this.sfx.typing.enter.idx = 0;
                    }
                    audio.src = URL.createObjectURL(this.sfx.typing.enter.sounds[this.sfx.typing.enter.idx]!);
                    break;
                }
                default: {
                    if (!this.sfx.typing.letter.sounds.length) return;

                    this.sfx.typing.letter.idx += 1;
                    if (this.sfx.typing.letter.idx === this.sfx.typing.letter.sounds.length) {
                        this.sfx.typing.letter.idx = 0;
                    }
                    audio.src = URL.createObjectURL(this.sfx.typing.letter.sounds[this.sfx.typing.letter.idx]!);
                    break;
                }
            }

            document.body.appendChild(audio);
            audio.play();
        }, true);
    },

    stop() {
        this.getAudioPlayer().pause();
    },
});
