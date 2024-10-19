/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { waitFor } from "@webpack";
import { React } from "@webpack/common";

import { FFmpegState } from "./types";

export const cl = classNameFactory("vc-more-stickers-");
export const clPicker = (className: string, ...args: any[]) => cl("picker-" + className, ...args);

const CORS_PROXY = "https://corsproxy.io?";

function corsUrl(url: string | URL) {
    return CORS_PROXY + encodeURIComponent(url.toString());
}

export function corsFetch(url: string | URL, init?: RequestInit | undefined) {
    return fetch(corsUrl(url), init);
}

export class Mutex {
    current = Promise.resolve();
    lock() {
        let _resolve: () => void;
        const p = new Promise(resolve => {
            _resolve = () => resolve();
        }) as Promise<void>;
        // Caller gets a promise that resolves when the current outstanding
        // lock resolves
        const rv = this.current.then(() => _resolve);
        // Don't allow the next request until the new promise is done
        this.current = p;
        // Return the new promise
        return rv;
    }
}

export let FFmpegStateContext: React.Context<FFmpegState | undefined> | undefined;
waitFor("createContext", () => {
    FFmpegStateContext = React.createContext<FFmpegState | undefined>(undefined);
});

export async function loadFFmpeg(ffmpeg: FFmpeg, setLoaded: () => void) {
    console.log("Loading FFmpeg...");
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    const classWorkerRaw = "/// <reference no-default-lib=\"true\" />\n/// <reference lib=\"esnext\" />\n/// <reference lib=\"webworker\" />\nconst MIME_TYPE_JAVASCRIPT = \"text/javascript\";\nconst MIME_TYPE_WASM = \"application/wasm\";\nconst CORE_VERSION = \"0.12.6\";\nconst CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`;\nvar FFMessageType;\n(function(FFMessageType) {\n  FFMessageType[\"LOAD\"] = \"LOAD\";\n  FFMessageType[\"EXEC\"] = \"EXEC\";\n  FFMessageType[\"WRITE_FILE\"] = \"WRITE_FILE\";\n  FFMessageType[\"READ_FILE\"] = \"READ_FILE\";\n  FFMessageType[\"DELETE_FILE\"] = \"DELETE_FILE\";\n  FFMessageType[\"RENAME\"] = \"RENAME\";\n  FFMessageType[\"CREATE_DIR\"] = \"CREATE_DIR\";\n  FFMessageType[\"LIST_DIR\"] = \"LIST_DIR\";\n  FFMessageType[\"DELETE_DIR\"] = \"DELETE_DIR\";\n  FFMessageType[\"ERROR\"] = \"ERROR\";\n  FFMessageType[\"DOWNLOAD\"] = \"DOWNLOAD\";\n  FFMessageType[\"PROGRESS\"] = \"PROGRESS\";\n  FFMessageType[\"LOG\"] = \"LOG\";\n  FFMessageType[\"MOUNT\"] = \"MOUNT\";\n  FFMessageType[\"UNMOUNT\"] = \"UNMOUNT\";\n})(FFMessageType || (FFMessageType = {}));\n\n\nconst ERROR_UNKNOWN_MESSAGE_TYPE = new Error(\"unknown message type\");\nconst ERROR_NOT_LOADED = new Error(\"ffmpeg is not loaded, call `await ffmpeg.load()` first\");\nconst ERROR_TERMINATED = new Error(\"called FFmpeg.terminate()\");\nconst ERROR_IMPORT_FAILURE = new Error(\"failed to import ffmpeg-core.js\");\n\nlet ffmpeg;\nconst load = async ({ coreURL: _coreURL, wasmURL: _wasmURL, workerURL: _workerURL, }) => {\n  const first = !ffmpeg;\n  try {\n    if (!_coreURL)\n      _coreURL = CORE_URL;\n    // when web worker type is `classic`.\n    importScripts(_coreURL);\n  }\n  catch {\n    if (!_coreURL)\n      _coreURL = CORE_URL.replace('/umd/', '/esm/');\n    // when web worker type is `module`.\n    self.createFFmpegCore = (await import(\n        /* webpackIgnore: true */ /* @vite-ignore */ _coreURL)).default;\n    if (!self.createFFmpegCore) {\n      throw ERROR_IMPORT_FAILURE;\n    }\n  }\n  const coreURL = _coreURL;\n  const wasmURL = _wasmURL ? _wasmURL : _coreURL.replace(/.js$/g, \".wasm\");\n  const workerURL = _workerURL\n    ? _workerURL\n    : _coreURL.replace(/.js$/g, \".worker.js\");\n  ffmpeg = await self.createFFmpegCore({\n    // Fix `Overload resolution failed.` when using multi-threaded ffmpeg-core.\n    // Encoded wasmURL and workerURL in the URL as a hack to fix locateFile issue.\n    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`,\n  });\n  ffmpeg.setLogger((data) => self.postMessage({ type: FFMessageType.LOG, data }));\n  ffmpeg.setProgress((data) => self.postMessage({\n    type: FFMessageType.PROGRESS,\n    data,\n  }));\n  return first;\n};\nconst exec = ({ args, timeout = -1 }) => {\n  ffmpeg.setTimeout(timeout);\n  ffmpeg.exec(...args);\n  const ret = ffmpeg.ret;\n  ffmpeg.reset();\n  return ret;\n};\nconst writeFile = ({ path, data }) => {\n  ffmpeg.FS.writeFile(path, data);\n  return true;\n};\nconst readFile = ({ path, encoding }) => ffmpeg.FS.readFile(path, { encoding });\n// TODO: check if deletion works.\nconst deleteFile = ({ path }) => {\n  ffmpeg.FS.unlink(path);\n  return true;\n};\nconst rename = ({ oldPath, newPath }) => {\n  ffmpeg.FS.rename(oldPath, newPath);\n  return true;\n};\n// TODO: check if creation works.\nconst createDir = ({ path }) => {\n  ffmpeg.FS.mkdir(path);\n  return true;\n};\nconst listDir = ({ path }) => {\n  const names = ffmpeg.FS.readdir(path);\n  const nodes = [];\n  for (const name of names) {\n    const stat = ffmpeg.FS.stat(`${path}/${name}`);\n    const isDir = ffmpeg.FS.isDir(stat.mode);\n    nodes.push({ name, isDir });\n  }\n  return nodes;\n};\n// TODO: check if deletion works.\nconst deleteDir = ({ path }) => {\n  ffmpeg.FS.rmdir(path);\n  return true;\n};\nconst mount = ({ fsType, options, mountPoint }) => {\n  const str = fsType;\n  const fs = ffmpeg.FS.filesystems[str];\n  if (!fs)\n    return false;\n  ffmpeg.FS.mount(fs, options, mountPoint);\n  return true;\n};\nconst unmount = ({ mountPoint }) => {\n  ffmpeg.FS.unmount(mountPoint);\n  return true;\n};\nself.onmessage = async ({ data: { id, type, data: _data }, }) => {\n  const trans = [];\n  let data;\n  try {\n    if (type !== FFMessageType.LOAD && !ffmpeg)\n      throw ERROR_NOT_LOADED; // eslint-disable-line\n    switch (type) {\n      case FFMessageType.LOAD:\n        data = await load(_data);\n        break;\n      case FFMessageType.EXEC:\n        data = exec(_data);\n        break;\n      case FFMessageType.WRITE_FILE:\n        data = writeFile(_data);\n        break;\n      case FFMessageType.READ_FILE:\n        data = readFile(_data);\n        break;\n      case FFMessageType.DELETE_FILE:\n        data = deleteFile(_data);\n        break;\n      case FFMessageType.RENAME:\n        data = rename(_data);\n        break;\n      case FFMessageType.CREATE_DIR:\n        data = createDir(_data);\n        break;\n      case FFMessageType.LIST_DIR:\n        data = listDir(_data);\n        break;\n      case FFMessageType.DELETE_DIR:\n        data = deleteDir(_data);\n        break;\n      case FFMessageType.MOUNT:\n        data = mount(_data);\n        break;\n      case FFMessageType.UNMOUNT:\n        data = unmount(_data);\n        break;\n      default:\n        throw ERROR_UNKNOWN_MESSAGE_TYPE;\n    }\n  }\n  catch (e) {\n    self.postMessage({\n      id,\n      type: FFMessageType.ERROR,\n      data: e.toString(),\n    });\n    return;\n  }\n  if (data instanceof Uint8Array) {\n    trans.push(data.buffer);\n  }\n  self.postMessage({ id, type, data }, trans);\n};\n\n";
    const classWorkerBlob = new Blob([(new TextEncoder()).encode(classWorkerRaw)], { type: "text/javascript" });
    const classWorkerUrl = URL.createObjectURL(classWorkerBlob);

    await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        workerURL: `${baseURL}/ffmpeg-core.worker.js`,
        classWorkerURL: classWorkerUrl,
    });
    setLoaded();
    console.log("FFmpeg loaded!");
}
