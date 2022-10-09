"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/preload.ts
var import_electron2 = __toESM(require("electron"));
var import_fs = require("fs");
var import_path = require("path");

// src/utils/IpcEvents.ts
function strEnum(obj) {
  const o = {};
  for (const key in obj) {
    o[key] = obj[key];
    o[obj[key]] = key;
  }
  return Object.freeze(o);
}
var IpcEvents_default = strEnum({
  QUICK_CSS_UPDATE: "VencordQuickCssUpdate",
  GET_QUICK_CSS: "VencordGetQuickCss",
  GET_SETTINGS_DIR: "VencordGetSettingsDir",
  GET_SETTINGS: "VencordGetSettings",
  SET_SETTINGS: "VencordSetSettings",
  OPEN_EXTERNAL: "VencordOpenExternal",
  OPEN_QUICKCSS: "VencordOpenQuickCss",
  GET_UPDATES: "VencordGetUpdates",
  GET_REPO: "VencordGetRepo",
  GET_HASHES: "VencordGetHashes",
  UPDATE: "VencordUpdate",
  BUILD: "VencordBuild",
  GET_DESKTOP_CAPTURE_SOURCES: "VencordGetDesktopCaptureSources"
});

// src/VencordNative.ts
var import_electron = require("electron");
function assertEventAllowed(event) {
  if (!(event in IpcEvents_default))
    throw new Error(`Event ${event} not allowed.`);
}
var VencordNative_default = {
  getVersions: () => process.versions,
  ipc: {
    send(event, ...args) {
      assertEventAllowed(event);
      import_electron.ipcRenderer.send(event, ...args);
    },
    sendSync(event, ...args) {
      assertEventAllowed(event);
      return import_electron.ipcRenderer.sendSync(event, ...args);
    },
    on(event, listener) {
      assertEventAllowed(event);
      import_electron.ipcRenderer.on(event, listener);
    },
    off(event, listener) {
      assertEventAllowed(event);
      import_electron.ipcRenderer.off(event, listener);
    },
    invoke(event, ...args) {
      assertEventAllowed(event);
      return import_electron.ipcRenderer.invoke(event, ...args);
    }
  }
};

// src/preload.ts
if (import_electron2.default.desktopCapturer === void 0) {
  const electronPath = require.resolve("electron");
  delete require.cache[electronPath].exports;
  require.cache[electronPath].exports = {
    ...import_electron2.default,
    desktopCapturer: {
      getSources: (opts) => import_electron2.ipcRenderer.invoke(IpcEvents_default.GET_DESKTOP_CAPTURE_SOURCES, opts)
    }
  };
}
import_electron2.contextBridge.exposeInMainWorld("VencordNative", VencordNative_default);
import_electron2.webFrame.executeJavaScript((0, import_fs.readFileSync)((0, import_path.join)(__dirname, "renderer.js"), "utf-8"));
require(process.env.DISCORD_PRELOAD);
//# sourceMappingURL=preload.js.map
