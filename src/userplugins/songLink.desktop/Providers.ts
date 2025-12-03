/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import amazonMusic from "file://logos/amazonMusic.png?base64";
import amazonStore from "file://logos/amazonStore.png?base64";
import anghami from "file://logos/anghami.png?base64";
import appleMusic from "file://logos/appleMusic.png?base64";
import audiomack from "file://logos/audiomack.png?base64";
import audius from "file://logos/audius.png?base64";
import bandcamp from "file://logos/bandcamp.png?base64";
import boomplay from "file://logos/boomplay.png?base64";
import deezer from "file://logos/deezer.png?base64";
import google from "file://logos/google.png?base64";
import googleStore from "file://logos/googleStore.png?base64";
import itunes from "file://logos/itunes.png?base64";
import napster from "file://logos/napster.png?base64";
import pandora from "file://logos/pandora.png?base64";
import soundcloud from "file://logos/soundcloud.png?base64";
import spinrilla from "file://logos/spinrilla.png?base64";
import spotify from "file://logos/spotify.png?base64";
import tidal from "file://logos/tidal.png?base64";
import yandex from "file://logos/yandex.png?base64";
import youtube from "file://logos/youtube.png?base64";
import youtubeMusic from "file://logos/youtubeMusic.png?base64";

const generateBase64URL = content => `data:image/png;base64,${content}`;

const Providers = {
    amazonMusic: {
        name: "Amazon Music",
        logo: generateBase64URL(amazonMusic)
    },
    spotify: {
        name: "Spotify",
        logo: generateBase64URL(spotify),
        native: true
    },
    itunes: {
        name: "iTunes",
        logo: generateBase64URL(itunes),
        native: true
    },
    appleMusic: {
        name: "Apple Music",
        logo: generateBase64URL(appleMusic),
        native: true
    },
    youtube: {
        name: "YouTube",
        logo: generateBase64URL(youtube)
    },
    youtubeMusic: {
        name: "YouTube Music",
        logo: generateBase64URL(youtubeMusic)
    },
    google: {
        name: "Google",
        logo: generateBase64URL(google)
    },
    googleStore: {
        name: "Google Store",
        logo: generateBase64URL(googleStore)
    },
    pandora: {
        name: "Pandora",
        logo: generateBase64URL(pandora)
    },
    deezer: {
        name: "Deezer",
        logo: generateBase64URL(deezer)
    },
    tidal: {
        name: "Tidal",
        logo: generateBase64URL(tidal)
    },
    amazonStore: {
        name: "Amazon Store",
        logo: generateBase64URL(amazonStore)
    },
    soundcloud: {
        name: "SoundCloud",
        logo: generateBase64URL(soundcloud)
    },
    napster: {
        name: "Napster",
        logo: generateBase64URL(napster)
    },
    yandex: {
        name: "Yandex",
        logo: generateBase64URL(yandex)
    },
    spinrilla: {
        name: "Spinrilla",
        logo: generateBase64URL(spinrilla)
    },
    audius: {
        name: "Audius",
        logo: generateBase64URL(audius)
    },
    audiomack: {
        name: "Audiomack",
        logo: generateBase64URL(audiomack)
    },
    anghami: {
        name: "Anghami",
        logo: generateBase64URL(anghami)
    },
    boomplay: {
        name: "Boomplay",
        logo: generateBase64URL(boomplay)
    },
    bandcamp: {
        name: "Bandcamp",
        logo: generateBase64URL(bandcamp)
    }
};

export default Providers;
