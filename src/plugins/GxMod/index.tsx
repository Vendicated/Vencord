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
import { getCurrentGuild } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { PluginDef } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, Text } from "@webpack/common";

import { getCrxLink, getModInfo } from "./api/api";
import { ControlPanel } from "./components";
import { GxModManifest } from "./types";
import { fetchCrxFile } from "./utils";

const logger = new Logger("GxMod", "#FA1E4E");

const classes = findByPropsLazy("listItem", "serverEmoji");


// TODO: Make this a setting.
const modId = "605a8f04-f91b-4f94-8e33-94f4c56e3b05";

let GxModCrx: import("@zip.js/zip.js").ZipReader<unknown> | null = null;


type SfxCollection = { sounds: Blob[]; idx: number; };
const pluginDef: PluginDef & {
    manifestJson?: GxModManifest;
    sfx: {
        click: SfxCollection;
        typing: Record<string, SfxCollection>;
        tab: Record<string, SfxCollection>;
    };
} & Record<string, any> = {
    name: "GxMod",
    description: "Integrates OperaGX Mods into discord.",
    authors: [Devs.Arjix],

    patches: [{
        find: ".Messages.AGE_GATE_UNDERAGE_EXISTING_BODY_DELETION_WITH_DAYS.format",
        replacement: {
            match: /section:\w\.\w+\.ACCOUNT_PANEL,children:(.*?}\))/,
            replace: (m, child) => m.replace(child, `[$self.ControlPanel($self),${child}]`)
        }
    }],

    ControlPanel,

    bgmMuted: {
        value: false,
        mode: "auto"
    },

    onBgmToggle() {
        this.getBgmPlayer().muted = this.bgmMuted.value;
    },

    modInfoListeners: [],
    onModInfoChange(cb) {
        this.modInfoListeners.push(cb);
    },
    fireModInfoChange() {
        for (const cb of this.modInfoListeners) {
            cb();
        }
    },

    settingsAboutComponent: () => {
        return <Text>Integrates OperaGX Mods into discord. (
            <a onClick={e => {
                e.preventDefault();
                VencordNative.native.openExternal("https://store.gx.me");
                return false;
            }} href="https://store.gx.me"
            >https://store.gx.me</a>)</Text>;
    },

    flux: {
        CHANNEL_SELECT: ({ guildId }) => {
            pluginDef.onChannelChange(pluginDef._currentGuildId !== guildId);

            if (pluginDef._currentGuildId !== guildId) {
                pluginDef._currentGuildId = guildId;
            }
        }
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

        logger.info("Loaded manifest!");
        this._currentGuildId = getCurrentGuild()?.id;

        this.registerSounds();
        this.fireModInfoChange();
        this.startlisteningForSounds();
    },

    getBgmPlayer(): HTMLAudioElement {
        if (this.player) return this.player;

        this.player = Object.assign(document.createElement("audio"), {
            loop: true,
            volume: 0.1
        });

        this.player.className = "vc-gx-mod-audio-source";

        document.body.appendChild(this.player);

        return this.player;
    },

    async playBgm() {
        const bgmFilename = this.manifestJson!.mod.payload?.background_music?.[0];
        const music = await GxModCrx?.getEntries().then(entries => entries.find(e => e.filename === bgmFilename));
        if (!music) return;

        const { BlobWriter } = await getZipJs();

        const blobWriter = new BlobWriter();
        await music.getData?.(blobWriter);

        this.bgmBlob = await blobWriter.getData();
        const player = this.getBgmPlayer();

        player.src = URL.createObjectURL(this.bgmBlob);
        player.play();

        logger.info("Started playing the background music!");
    },

    sfx: {
        click: { sounds: [], idx: 0 },
        typing: {
            letter: { sounds: [], idx: 0 },
            space: { sounds: [], idx: 0 },
            enter: { sounds: [], idx: 0 },
            backspace: { sounds: [], idx: 0 },
        },
        tab: {
            close: { sounds: [], idx: 0 },
            insert: { sounds: [], idx: 0 },
            slash: { sounds: [], idx: 0 },
        }
    },

    async registerSounds() {
        this.playBgm();

        const entries = await GxModCrx?.getEntries();
        if (!entries) return;

        logger.info(this.manifestJson?.mod.payload.browser_sounds);

        const { BlobWriter } = await getZipJs();

        const clickSounds = this.manifestJson!.mod.payload?.browser_sounds?.CLICK ?? [];
        for (const sound of clickSounds) {
            const entry = entries.find(e => e.filename === sound);
            if (!entry) continue;

            const blobWriter = new BlobWriter();
            await entry.getData?.(blobWriter);
            this.sfx.click?.sounds.push(await blobWriter.getData());
        }

        await Promise.all(Object.entries(this.manifestJson!.mod.payload?.browser_sounds ?? {})
            .filter(([type, _]) => type.startsWith("TAB_"))
            .map(async ([type, sounds]) => {
                type = type.split("_")[1].toLowerCase();
                switch (type) {
                    case "close":
                    case "insert":
                    case "slash": {
                        for (const sound of sounds as string[]) {
                            const entry = entries.find(e => e.filename === sound);
                            if (!entry) continue;

                            const soundBlob = new BlobWriter();
                            await entry.getData?.(soundBlob);

                            this.sfx.tab[type].sounds.push(await soundBlob.getData());
                        }
                        break;
                    }
                    default: {
                        logger.warn(`Unknown browser sound found. [${type}]`);
                    }
                }
            }));

        await Promise.all(Object.entries(this.manifestJson!.mod.payload?.keyboard_sounds ?? {}).map(async ([type, sounds]) => {
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

        this.mouseUpCallback = ({ target }) => {
            if (!this.sfx.click.sounds.length) return;

            {
                // If no element with `cursor: pointer` is clicked, then we don't want to play the sound.
                const style = getComputedStyle(target as HTMLElement);
                const cursor = style.getPropertyValue("cursor");
                if (cursor !== "pointer") return;
            }

            {
                // Don't play the click sound when clicking channels/guilds.
                if ((target as HTMLElement).matches("#channels li *")) return;
                if ((target as HTMLElement).matches(`.${classes.listItem} *`)) return;
            }

            const audio = document.createElement("audio");
            audio.onended = () => audio.remove();
            audio.src = URL.createObjectURL(this.sfx.click.sounds[this.sfx.click.idx]);
            audio.className = "vc-gx-mod-audio-source";

            this.sfx.click.idx += 1;
            if (this.sfx.click.idx === this.sfx.click.sounds.length) {
                this.sfx.click.idx = 0;
            }

            document.body.appendChild(audio);
            audio.play();
        };
        window.addEventListener("mouseup", this.mouseUpCallback);

        /*
         * We only want to play a key sound when the key is pressed, not when it is repeated after the initial press.
         * By keeping the state of the keys, we can know which key is "repeated" and which is not.
         */
        const keyStates: Record<string, boolean> = {};

        this.keyRelaseCallback = ({ key }) => keyStates[key] = true;
        window.addEventListener("keyup", this.keyRelaseCallback, true);

        this.keyDownCallback = ({ key }) => {
            if (!keyStates[key]) return;

            keyStates[key] = false;
            const audio = document.createElement("audio");
            audio.onended = () => audio.remove();

            let type = key;

            switch (key) {
                case " ": {
                    type = "space";
                    break;
                }
                case "Backspace":
                case "Enter": {
                    type = key.toLowerCase();
                    break;
                }
                default: {
                    type = "letter";
                    break;
                }
            }

            if (!this.sfx.typing[type].sounds.length) return;
            audio.src = URL.createObjectURL(this.sfx.typing[type].sounds[this.sfx.typing[type].idx]!);
            audio.className = "vc-gx-mod-audio-source";

            this.sfx.typing[type].idx += 1;
            if (this.sfx.typing[type].idx === this.sfx.typing[type].sounds.length) {
                this.sfx.typing[type].idx = 0;
            }

            document.body.appendChild(audio);
            audio.play();
        };
        window.addEventListener("keydown", this.keyDownCallback, true);
    },

    onChannelChange(guildChanged: boolean) {
        const type = guildChanged ? "close" : "slash";
        if (!this.sfx.tab[type].sounds.length) return;

        const audio = Object.assign(document.createElement("audio"), {
            src: URL.createObjectURL(this.sfx.tab[type].sounds[this.sfx.tab[type].idx]),
        });
        audio.className = "vc-gx-mod-audio-source";
        audio.onended = () => audio.remove();

        this.sfx.tab[type].idx += 1;
        if (this.sfx.tab[type].idx === this.sfx.tab[type].sounds.length) {
            this.sfx.tab[type].idx = 0;
        }

        document.body.appendChild(audio);
        audio.play();
    },

    stop() {
        this.getBgmPlayer().pause();
        this.stopListeningForSounds();
        window.removeEventListener("keyup", this.keyRelaseCallback, true);
        window.removeEventListener("keydown", this.keyDownCallback, true);
        window.removeEventListener("mouseup", this.mouseUpCallback);
    },

    startlisteningForSounds() {
        // CSP doesn't allow us to access iframes, so yeah, embedded videos eg youtube videos will not auto-mute the music.
        const selector = [
            "audio:not(.vc-gx-mod-audio-source)",
            "video:not(.vc-gx-mod-audio-source)"
        ].join(",");

        this._sound_check_interval = setInterval(() => {
            if (this.bgmMuted.mode === "manual") return;

            const nodes = document.querySelectorAll<HTMLMediaElement>(selector);
            let value: boolean = false;

            for (const node of nodes) {
                if (node.paused || node.muted || node.volume <= 0) continue;

                value = true;
                break;
            }

            if (this.bgmMuted.value === value) return;

            this.bgmMuted.value = value;
            this.onBgmToggle();
            this.fireModInfoChange(); // to update the panel
        }, 200);
    },
    stopListeningForSounds() {
        clearInterval(this._sound_check_interval);
    },
};


export default definePlugin(pluginDef);
