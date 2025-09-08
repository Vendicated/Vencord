/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AbstractTTSSource } from "./AbstractSource";

export default new class TikTokTTS extends AbstractTTSSource<HTMLAudioElement> {
    getDefaultVoice() {
        return "en_us_001";
    }

    async retrieveVoices() {
        this.voicesLabels = [
            { label: "GHOSTFACE", value: "en_us_ghostface" },
            { label: "CHEWBACCA", value: "en_us_chewbacca" },
            { label: "C3PO", value: "en_us_c3po" },
            { label: "STITCH", value: "en_us_stitch" },
            { label: "STORMTROOPER", value: "en_us_stormtrooper" },
            { label: "ROCKET", value: "en_us_rocket" },
            { label: "MADAME_LEOTA", value: "en_female_madam_leota" },
            { label: "GHOST_HOST", value: "en_male_ghosthost" },
            { label: "PIRATE", value: "en_male_pirate" },
            { label: "AU_FEMALE_1", value: "en_au_001" },
            { label: "AU_MALE_1", value: "en_au_002" },
            { label: "UK_MALE_1", value: "en_uk_001" },
            { label: "UK_MALE_2", value: "en_uk_003" },
            { label: "US_FEMALE_1", value: "en_us_001" },
            { label: "US_FEMALE_2", value: "en_us_002" },
            { label: "US_MALE_1", value: "en_us_006" },
            { label: "US_MALE_2", value: "en_us_007" },
            { label: "US_MALE_3", value: "en_us_009" },
            { label: "US_MALE_4", value: "en_us_010" },
            { label: "MALE_JOMBOY", value: "en_male_jomboy" },
            { label: "MALE_CODY", value: "en_male_cody" },
            { label: "FEMALE_SAMC", value: "en_female_samc" },
            { label: "FEMALE_MAKEUP", value: "en_female_makeup" },
            { label: "FEMALE_RICHGIRL", value: "en_female_richgirl" },
            { label: "MALE_GRINCH", value: "en_male_grinch" },
            { label: "MALE_DEADPOOL", value: "en_male_deadpool" },
            { label: "MALE_JARVIS", value: "en_male_jarvis" },
            { label: "MALE_ASHMAGIC", value: "en_male_ashmagic" },
            { label: "MALE_OLANTERKKERS", value: "en_male_olantekkers" },
            { label: "MALE_UKNEIGHBOR", value: "en_male_ukneighbor" },
            { label: "MALE_UKBUTLER", value: "en_male_ukbutler" },
            { label: "FEMALE_SHENNA", value: "en_female_shenna" },
            { label: "FEMALE_PANSINO", value: "en_female_pansino" },
            { label: "MALE_TREVOR", value: "en_male_trevor" },
            { label: "FEMALE_BETTY", value: "en_female_betty" },
            { label: "MALE_CUPID", value: "en_male_cupid" },
            { label: "FEMALE_GRANDMA", value: "en_female_grandma" },
            { label: "MALE_XMXS_CHRISTMAS", value: "en_male_m2_xhxs_m03_christmas" },
            { label: "MALE_SANTA_NARRATION", value: "en_male_santa_narration" },
            { label: "MALE_SING_DEEP_JINGLE", value: "en_male_sing_deep_jingle" },
            { label: "MALE_SANTA_EFFECT", value: "en_male_santa_effect" },
            { label: "FEMALE_HT_NEYEAR", value: "en_female_ht_f08_newyear" },
            { label: "MALE_WIZARD", value: "en_male_wizard" },
            { label: "FEMALE_HT_HALLOWEEN", value: "en_female_ht_f08_halloween" },
            { label: "FR_MALE_1", value: "fr_001" },
            { label: "FR_MALE_2", value: "fr_002" },
            { label: "DE_FEMALE", value: "de_001" },
            { label: "DE_MALE", value: "de_002" },
            { label: "ES_MALE", value: "es_002" },
            { label: "ES_MX_MALE", value: "es_mx_002" },
            { label: "BR_FEMALE_1", value: "br_001" },
            { label: "BR_FEMALE_2", value: "br_003" },
            { label: "BR_FEMALE_3", value: "br_004" },
            { label: "BR_MALE", value: "br_005" },
            { label: "BP_FEMALE_IVETE", value: "bp_female_ivete" },
            { label: "BP_FEMALE_LUDMILLA", value: "bp_female_ludmilla" },
            { label: "PT_FEMALE_LHAYS", value: "pt_female_lhays" },
            { label: "PT_FEMALE_LAIZZA", value: "pt_female_laizza" },
            { label: "PT_MALE_BUENO", value: "pt_male_bueno" },
            { label: "ID_FEMALE", value: "id_001" },
            { label: "JP_FEMALE_1", value: "jp_001" },
            { label: "JP_FEMALE_2", value: "jp_003" },
            { label: "JP_FEMALE_3", value: "jp_005" },
            { label: "JP_MALE", value: "jp_006" },
            { label: "KR_MALE_1", value: "kr_002" },
            { label: "KR_FEMALE", value: "kr_003" },
            { label: "KR_MALE_2", value: "kr_004" },
            { label: "JP_FEMALE_FUJICOCHAN", value: "jp_female_fujicochan" },
            { label: "JP_FEMALE_HASEGAWARIONA", value: "jp_female_hasegawariona" },
            { label: "JP_MALE_KEIICHINAKANO", value: "jp_male_keiichinakano" },
            { label: "JP_FEMALE_OOMAEAIIKA", value: "jp_female_oomaeaika" },
            { label: "JP_MALE_YUJINCHIGUSA", value: "jp_male_yujinchigusa" },
            { label: "JP_FEMALE_SHIROU", value: "jp_female_shirou" },
            { label: "JP_MALE_TAMAWAKAZUKI", value: "jp_male_tamawakazuki" },
            { label: "JP_FEMALE_KAORISHOJI", value: "jp_female_kaorishoji" },
            { label: "JP_FEMALE_YAGISHAKI", value: "jp_female_yagishaki" },
            { label: "JP_MALE_HIKAKIN", value: "jp_male_hikakin" },
            { label: "JP_FEMALE_REI", value: "jp_female_rei" },
            { label: "JP_MALE_SHUICHIRO", value: "jp_male_shuichiro" },
            { label: "JP_MALE_MATSUDAKE", value: "jp_male_matsudake" },
            { label: "JP_FEMALE_MACHIKORIIITA", value: "jp_female_machikoriiita" },
            { label: "JP_MALE_MATSUO", value: "jp_male_matsuo" },
            { label: "JP_MALE_OSADA", value: "jp_male_osada" },
            { label: "SING_FEMALE_ALTO", value: "en_female_f08_salut_damour" },
            { label: "SING_MALE_TENOR", value: "en_male_m03_lobby" },
            { label: "SING_FEMALE_WARMY_BREEZE", value: "en_female_f08_warmy_breeze" },
            { label: "SING_MALE_SUNSHINE_SOON", value: "en_male_m03_sunshine_soon" },
            { label: "SING_FEMALE_GLORIOUS", value: "en_female_ht_f08_glorious" },
            { label: "SING_MALE_IT_GOES_UP", value: "en_male_sing_funny_it_goes_up" },
            { label: "SING_MALE_CHIPMUNK", value: "en_male_m2_xhxs_m03_silly" },
            { label: "SING_FEMALE_WONDERFUL_WORLD", value: "en_female_ht_f08_wonderful_world" },
            { label: "SING_MALE_FUNNY_THANKSGIVING", value: "en_male_sing_funny_thanksgiving" },
            { label: "MALE_NARRATION", value: "en_male_narration" },
            { label: "MALE_FUNNY", value: "en_male_funny" },
            { label: "FEMALE_EMOTIONAL", value: "en_female_emotional" }
        ];
        return this.voicesLabels;
    }

    async getMedia(text: string) {
        return new Promise<HTMLAudioElement>((resolve, reject) => {
            try {
                fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: text, voice: this.selectedVoice })
                }).then(async response => {
                    const data = await response.json();
                    const audio = new Audio();
                    audio.src = `data:audio/mpeg;base64,${data.data}`;
                    audio.addEventListener("loadeddata", () => resolve(audio));
                    audio.addEventListener("error", () => reject(new Error("Failed to load audio")));
                });
            } catch (error) {
                reject(new Error("Failed to load audio"));
            }
        });
    }
};
