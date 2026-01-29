/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent, net } from "electron";

export async function fetchBinary(_: IpcMainInvokeEvent, url: string) {
  return await new Promise(resolve => {
    try {
      const request = net.request({ url, method: "GET" });
      request.on("response", response => {
        const chunks = [] as Buffer[];
        response.on("data", chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const contentTypeHeader = response.headers["content-type"];
          const contentType = Array.isArray(contentTypeHeader)
            ? contentTypeHeader[0] || ""
            : contentTypeHeader || "";
          resolve({
            status: response.statusCode || 0,
            data: buffer.toString("base64"),
            contentType: contentType
          });
        });
        response.on("error", error => {
          resolve({ status: -1, error: String(error) });
        });
      });
      request.on("error", error => {
        resolve({ status: -1, error: String(error) });
      });
      request.end();
    } catch (error) {
      resolve({ status: -1, error: String(error) });
    }
  });
}
