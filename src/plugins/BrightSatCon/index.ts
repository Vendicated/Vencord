/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { makeRange } from "@components/PluginSettings/components";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
  brightness: {
    description: "Adjust the Discord interface brightness (30% to 100%)",
    type: OptionType.SLIDER,
    markers: makeRange(30, 100, 10),
    default: 70,
    stickToMarkers: false,
    restartNeeded: false
  },
  saturation: {
    description: "Adjust the Discord interface saturation (0% to 200%)",
    type: OptionType.SLIDER,
    markers: makeRange(0, 200, 20),
    default: 100,
    stickToMarkers: false,
    restartNeeded: false
  },
  contrast: {
    description: "Adjust the Discord interface contrast (50% to 150%)",
    type: OptionType.SLIDER,
    markers: makeRange(50, 150, 10),
    default: 100,
    stickToMarkers: false,
    restartNeeded: false
  }
});

let styleEl: HTMLStyleElement | null = null;

function injectStyle() {
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "vc-brightsatcon-style";
    document.head.appendChild(styleEl);
  }
}

function updateCSS(brightness: number, saturation: number, contrast: number) {
  injectStyle();
  const b = Math.min(100, Math.max(30, brightness)) / 100;
  const s = Math.min(200, Math.max(0, saturation)) / 100;
  const c = Math.min(150, Math.max(50, contrast)) / 100;

  styleEl!.textContent = `
    #app-mount {
      filter: brightness(${b}) saturate(${s}) contrast(${c}) !important;
      transition: filter 0.2s ease;
    }
  `;
}

function removeStyle() {
  if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
}

export default definePlugin({
  name: "BrightSatCon",
  description: "Allows real-time adjustment of brightness, saturation, and contrast of Discord's interface.",
  authors: [Devs.blysen, Devs.blinny],
  settings,

  start() {
    injectStyle();
    const store = settings.store;

    let brightness = store.brightness ?? 70;
    let saturation = store.saturation ?? 100;
    let contrast = store.contrast ?? 100;

    updateCSS(brightness, saturation, contrast);

    Object.defineProperty(store, "brightness", {
      get: () => brightness,
      set: (val: number) => {
        brightness = val;
        updateCSS(brightness, saturation, contrast);
      }
    });

    Object.defineProperty(store, "saturation", {
      get: () => saturation,
      set: (val: number) => {
        saturation = val;
        updateCSS(brightness, saturation, contrast);
      }
    });

    Object.defineProperty(store, "contrast", {
      get: () => contrast,
      set: (val: number) => {
        contrast = val;
        updateCSS(brightness, saturation, contrast);
      }
    });
  },

  stop() {
    removeStyle();
  },

  onSettingsUpdate(_, newSettings) {
    const b = typeof newSettings.brightness === "number" ? newSettings.brightness : settings.store.brightness;
    const s = typeof newSettings.saturation === "number" ? newSettings.saturation : settings.store.saturation;
    const c = typeof newSettings.contrast === "number" ? newSettings.contrast : settings.store.contrast;

    updateCSS(b, s, c);
  }
});
