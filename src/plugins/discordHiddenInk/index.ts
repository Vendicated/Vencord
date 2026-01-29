/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
// @ts-nocheck

import definePlugin, { StartAt, OptionType, PluginNative } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { updateMessage } from "@api/MessageUpdater";
import { React, useEffect, useState, showToast, Toasts } from "@webpack/common";

let controller = null;

const settings = definePluginSettings({
  enabled: {
    type: OptionType.BOOLEAN,
    description: "Enable hidden ink encoding/decoding",
    default: true,
    onChange(value) {
      if (controller && controller.setEnabled) controller.setEnabled(!!value);
    }
  },
  sharedKey: {
    type: OptionType.STRING,
    description: "Shared key for encrypted payloads",
    default: "",
    placeholder: "Enter shared key",
    onChange(value) {
      if (controller && controller.setSharedKey) {
        controller.setSharedKey(typeof value === "string" ? value : "");
      }
    }
  }
});

function installHiddenInk(initialEnabled, initialKey) {
  const win = window;
  const existing = win.__DISCORD_STEG__;
  if (existing && existing.installed) {
    if (existing.setEnabled) existing.setEnabled(!!initialEnabled);
    if (existing.setSharedKey) existing.setSharedKey(typeof initialKey === "string" ? initialKey : "");
    return existing;
  }

  (function () {
    "use strict";

    let warnedNativeMissing = false;
    let warnedNativeFetchFailed = false;

    function getNativeHelper() {
      if (typeof VencordNative === "undefined" || !VencordNative.pluginHelpers) return null;
      return VencordNative.pluginHelpers.DiscordHiddenInk || null;
    }

    const state = { enabled: true, sharedKey: "" };
    const USE_ACCESSORY_PREVIEW = false;

    function setEnabled(value) {
      state.enabled = !!value;
      if (state.enabled) scanForEncryptedAnchors(document.body || document.documentElement);
    }

    function setSharedKey(value) {
      const next = typeof value === "string" ? value : "";
      if (state.sharedKey === next) return;
      state.sharedKey = next;
      warnedMissingKey = false;
      cryptoKeysPromise = null;
      textKeyState = { source: "", keyBytes: null, expanded: null };
    }

    // === Invisible codec (adapted from invisible-text.js idea) ===
    const PRIMARY_ALPHABET = [
      "\u3164", // HANGUL FILLER (blank)
      "\u115f", // HANGUL CHOSEONG FILLER (blank)
      "\u1160", // HANGUL JUNGSEONG FILLER (blank)
      "\u2800", // BRAILLE PATTERN BLANK
      "\uffa0", // HALFWIDTH HANGUL FILLER (blank)
      "\u200b", // ZERO WIDTH SPACE
      "\u200c", // ZERO WIDTH NON-JOINER
      "\u200d", // ZERO WIDTH JOINER
      "\u2060", // WORD JOINER
      "\u2062", // INVISIBLE TIMES
      "\u2063", // INVISIBLE SEPARATOR
      "\u2064", // INVISIBLE PLUS
      "\ufeff", // ZERO WIDTH NO-BREAK SPACE
      "\u034f", // COMBINING GRAPHEME JOINER
      "\u061c", // ARABIC LETTER MARK
      "\u200e" // LEFT-TO-RIGHT MARK
    ];

    const LEGACY_ALPHABET = [
      "\u200c", // ZERO WIDTH NON-JOINER
      "\u200d", // ZERO WIDTH JOINER
      "\u202c", // POP DIRECTIONAL FORMATTING
      "\ufeff" // ZERO WIDTH NO-BREAK SPACE
    ];

    const LEGACY_ALPHABET_2 = [
      "\u200b", // ZERO WIDTH SPACE
      "\u200c", // ZERO WIDTH NON-JOINER
      "\u200d", // ZERO WIDTH JOINER
      "\u2060" // WORD JOINER
    ];

    const LEGACY_ALPHABET_3 = [
      "\u3164", // HANGUL FILLER (blank)
      "\u115f", // HANGUL CHOSEONG FILLER (blank)
      "\u1160", // HANGUL JUNGSEONG FILLER (blank)
      "\u2800", // BRAILLE PATTERN BLANK
      "\uffa0" // HALFWIDTH HANGUL FILLER (blank)
    ];

    const MARKER = "\u2061"; // FUNCTION APPLICATION (marker only)
    const MAGIC = "DS0:"; // helps detect valid payload
    const UNICODE_SPACE = 0x110000;
    const FILE_MAGIC = "DHI1";
    const ENCRYPTED_EXTENSION = ".dhi";
    const KEY_SALT = "discord-hidden-ink-v1";
    const KEY_ITERATIONS = 100000;
    const META_PREFIX = "M1";
    const META_SEPARATOR = "\u0000";
    const TEXT_ENCRYPT_PREFIX_V2_BYTE = 0xff;
    const TEXT_ENCRYPT_MAGIC = "DT1:";
    const TEXT_IV_BYTES = 12;
    const TEXT_TAG_BYTES = 16;
    const MAX_MESSAGE_LENGTH = 2000;
    const TEXT_PREVIEW_LIMIT = 5000;
    const DNI_FILE_MAGIC = "DNI1";
    const DNI_FILE_EXTENSION = ".dni";
    const DNI_FILE_MIME = "application/octet-stream";
    const FETCH_FAIL_TTL = 60000;
    const HEADER_ENCODER = new TextEncoder();
    const HEADER_DECODER = new TextDecoder("utf-8");
    const DNI_FILE_MAGIC_BYTES = HEADER_ENCODER.encode(DNI_FILE_MAGIC);
    let warnedMissingKey = false;
    let textKeyState = { source: "", keyBytes: null, expanded: null };
    let cryptoKeysPromise = null;

    setSharedKey(initialKey);
    setEnabled(initialEnabled);

    win.__DISCORD_STEG__ = {
      installed: true,
      setEnabled: setEnabled,
      setSharedKey: setSharedKey,
      decodeFluxAction: null,
      encryptUploads: null
    };

    function debugLog() { }

    function describeBody(body) {
      if (body == null) return "null";
      if (body instanceof Blob) return "Blob(" + body.size + ")";
      if (body instanceof ArrayBuffer) return "ArrayBuffer(" + body.byteLength + ")";
      if (ArrayBuffer.isView(body)) return "View(" + body.byteLength + ")";
      if (typeof body === "string") return "String(" + body.length + ")";
      if (body && body.constructor && body.constructor.name) return body.constructor.name;
      return typeof body;
    }

    function digitsPerCodepoint(base) {
      let g = 0;
      let pow = 1;
      while (pow < UNICODE_SPACE) {
        pow *= base;
        g++;
      }
      return g;
    }

    function codepointToDigits(cp, base, g) {
      const digits = [];
      while (cp > 0) {
        digits.push(cp % base);
        cp = Math.floor(cp / base);
      }
      while (digits.length < g) digits.push(0);
      return digits.reverse();
    }

    function digitsToCodepoint(digits, base) {
      let n = 0;
      for (const d of digits) n = n * base + d;
      return n;
    }

    function digitsToAlphabet(digits, alphabet) {
      return digits.map((d) => alphabet[d]).join("");
    }

    function digitsPerByte(base) {
      let g = 0;
      let pow = 1;
      while (pow < 256) {
        pow *= base;
        g++;
      }
      return g;
    }

    function byteToDigits(value, base, g) {
      const digits = [];
      while (value > 0) {
        digits.push(value % base);
        value = Math.floor(value / base);
      }
      while (digits.length < g) digits.push(0);
      return digits.reverse();
    }

    function digitsToByte(digits, base) {
      let n = 0;
      for (const d of digits) n = n * base + d;
      return n;
    }

    function alphabetToDigits(str, alphabetIndex) {
      const out = [];
      for (const ch of [...str]) {
        const idx = alphabetIndex.get(ch);
        if (idx == null) throw new Error("Invalid digit char");
        out.push(idx);
      }
      return out;
    }

    function createInvisibleCodec(alphabet, marker) {
      if (!Array.isArray(alphabet) || alphabet.length < 2) {
        throw new Error("alphabet must have length >= 2");
      }

      const base = alphabet.length;
      const g = digitsPerCodepoint(base);
      const index = new Map();
      alphabet.forEach((ch, i) => {
        if (index.has(ch)) throw new Error("alphabet has duplicate char");
        index.set(ch, i);
      });

      function encode(plainText) {
        let out = marker;
        const message = MAGIC + plainText;
        for (const ch of [...message]) {
          const cp = ch.codePointAt(0);
          const digits = codepointToDigits(cp, base, g);
          out += digitsToAlphabet(digits, alphabet);
        }
        return out;
      }

      function decodePayload(payload) {
        if (!payload) return "";
        const chars = [...payload];
        if (chars.length % g !== 0) throw new Error("Bad payload length");

        let out = "";
        for (let i = 0; i < chars.length; i += g) {
          const chunk = chars.slice(i, i + g).join("");
          const digits = alphabetToDigits(chunk, index);
          const cp = digitsToCodepoint(digits, base);
          out += String.fromCodePoint(cp);
        }
        return out;
      }

      function extractDigits(content) {
        let out = "";
        for (const ch of content) {
          if (index.has(ch)) out += ch;
        }
        return out;
      }

      function extractPayload(content) {
        const markerIndex = content.indexOf(marker);
        if (markerIndex === -1) return extractDigits(content);
        const source = content.slice(markerIndex + marker.length);
        return extractDigits(source);
      }

      function decodeFromContent(content) {
        const payload = extractPayload(content);
        if (!payload || payload.length < g) return null;
        try {
          const decoded = decodePayload(payload);
          if (decoded.indexOf(MAGIC) !== 0) return null;
          return decoded.slice(MAGIC.length);
        } catch (_) {
          return null;
        }
      }

      function hasPayload(content) {
        return decodeFromContent(content) !== null;
      }

      return { encode, decodeFromContent, hasPayload };
    }

    function createByteCodec(alphabet, marker) {
      if (!Array.isArray(alphabet) || alphabet.length < 2) {
        throw new Error("alphabet must have length >= 2");
      }

      const base = alphabet.length;
      const g = digitsPerByte(base);
      const encoder = new TextEncoder();
      const decoder = new TextDecoder("utf-8");
      const magicBytes = encoder.encode(MAGIC);
      const index = new Map();
      alphabet.forEach((ch, i) => {
        if (index.has(ch)) throw new Error("alphabet has duplicate char");
        index.set(ch, i);
      });

      function extractDigits(content) {
        let out = "";
        for (const ch of content) {
          if (index.has(ch)) out += ch;
        }
        return out;
      }

      function extractPayload(content) {
        const markerIndex = content.indexOf(marker);
        if (markerIndex === -1) return extractDigits(content);
        const source = content.slice(markerIndex + marker.length);
        return extractDigits(source);
      }

      function encodePayloadBytes(bytes) {
        let out = marker;
        for (let i = 0; i < bytes.length; i++) {
          const digits = byteToDigits(bytes[i], base, g);
          out += digitsToAlphabet(digits, alphabet);
        }
        return out;
      }

      function encodeBytes(rawBytes) {
        const bytes = new Uint8Array(magicBytes.length + rawBytes.length);
        bytes.set(magicBytes, 0);
        bytes.set(rawBytes, magicBytes.length);
        return encodePayloadBytes(bytes);
      }

      function encode(plainText) {
        const bytes = encoder.encode(plainText);
        return encodeBytes(bytes);
      }

      function decodePayloadBytes(payload) {
        const chars = [...payload];
        if (chars.length % g !== 0) throw new Error("Bad payload length");

        const byteCount = chars.length / g;
        const bytes = new Uint8Array(byteCount);
        let offset = 0;
        for (let i = 0; i < byteCount; i++) {
          const chunk = chars.slice(offset, offset + g).join("");
          const digits = alphabetToDigits(chunk, index);
          const value = digitsToByte(digits, base);
          bytes[i] = value;
          offset += g;
        }
        return bytes;
      }

      function decodeBytesFromContent(content) {
        const payload = extractPayload(content);
        if (!payload || payload.length < g) return null;

        for (let offset = 0; offset < g; offset++) {
          const remaining = payload.length - offset;
          if (remaining < g) break;
          const usable = payload.length - ((payload.length - offset) % g);
          if (usable - offset < g) continue;
          const slice = payload.slice(offset, usable);

          try {
            const decoded = decodePayloadBytes(slice);
            if (!decoded || decoded.length < magicBytes.length) continue;
            let match = true;
            for (let i = 0; i < magicBytes.length; i++) {
              if (decoded[i] !== magicBytes[i]) {
                match = false;
                break;
              }
            }
            if (match) return decoded.slice(magicBytes.length);
          } catch (_) {
            // try next offset
          }
        }

        return null;
      }

      function decodeFromContent(content) {
        const bytes = decodeBytesFromContent(content);
        if (!bytes) return null;
        return decoder.decode(bytes);
      }

      function hasPayload(content) {
        return decodeFromContent(content) !== null;
      }

      return { encode, encodeBytes, decodeFromContent, decodeBytesFromContent, hasPayload };
    }

    const codec = createByteCodec(PRIMARY_ALPHABET, MARKER);
    const legacyCodecs = [
      createInvisibleCodec(PRIMARY_ALPHABET, MARKER),
      createInvisibleCodec(LEGACY_ALPHABET, MARKER),
      createInvisibleCodec(LEGACY_ALPHABET_2, MARKER),
      createInvisibleCodec(LEGACY_ALPHABET_3, MARKER)
    ];

    // === Attachment encryption ===

    function getSharedKey() {
      const keyText = state.sharedKey || "";
      if (!keyText || keyText === "CHANGE_ME") return "";
      return keyText;
    }

    function getCryptoKeys() {
      const keyText = getSharedKey();
      if (!keyText) {
        if (!warnedMissingKey) {
          warnedMissingKey = true;
          debugLog("Missing shared key; encryption disabled");
        }
        return Promise.resolve(null);
      }
      if (!cryptoKeysPromise) {
        const salt = HEADER_ENCODER.encode(KEY_SALT);
        cryptoKeysPromise = crypto.subtle
          .importKey("raw", HEADER_ENCODER.encode(keyText), "PBKDF2", false, ["deriveKey"])
          .then((material) => {
            const params = {
              name: "PBKDF2",
              salt: salt,
              iterations: KEY_ITERATIONS,
              hash: "SHA-256"
            };
            return Promise.all([
              crypto.subtle.deriveKey(params, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]),
              crypto.subtle.deriveKey(params, material, { name: "AES-CTR", length: 256 }, false, ["encrypt", "decrypt"])
            ]).then((keys) => ({ gcm: keys[0], ctr: keys[1] }));
          })
          .catch(() => null);
      }
      return cryptoKeysPromise;
    }

    function base64EncodeBytes(bytes) {
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    function base64DecodeBytes(text) {
      let binary;
      try {
        binary = atob(text);
      } catch (_) {
        return null;
      }
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    async function nativeFetchArrayBuffer(url) {
      const native = getNativeHelper();
      if (!native || typeof native.fetchBinary !== "function") {
        if (!warnedNativeMissing) {
          warnedNativeMissing = true;
          showToast("Hidden Ink: native helper not loaded, attachments won't decode", Toasts.Type.FAILURE);
        }
        return null;
      }
      try {
        const result = await native.fetchBinary(url);
        if (!result || result.status < 200 || result.status >= 300 || !result.data) {
          if (!warnedNativeFetchFailed) {
            warnedNativeFetchFailed = true;
            const statusText = result && typeof result.status === "number" ? "status " + result.status : "status unknown";
            showToast("Hidden Ink: native fetch failed (" + statusText + ")", Toasts.Type.FAILURE);
          }
          return null;
        }
        const bytes = base64DecodeBytes(result.data);
        if (!bytes) return null;
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      } catch (_) {
        return null;
      }
    }

    function base64EncodeText(text) {
      return base64EncodeBytes(HEADER_ENCODER.encode(text));
    }

    function base64DecodeText(text) {
      const bytes = base64DecodeBytes(text);
      if (!bytes) return null;
      return HEADER_DECODER.decode(bytes);
    }

    const SHA256_K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
      0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
      0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
      0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
      0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    const SHA256_INIT = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    const AES_SBOX = [
      0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5,
      0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
      0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0,
      0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
      0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc,
      0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
      0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a,
      0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
      0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0,
      0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
      0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b,
      0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
      0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
      0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
      0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
      0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
      0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17,
      0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
      0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88,
      0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
      0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c,
      0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
      0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9,
      0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
      0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6,
      0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
      0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e,
      0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
      0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94,
      0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
      0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68,
      0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
    ];

    const AES_RCON = [
      0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40,
      0x80, 0x1b, 0x36
    ];

    const AES_NR = 14;
    const AES_NK = 8;
    const AES_NB = 4;
    const GCM_R = 0xe1000000000000000000000000000000n;

    function rotr32(value, bits) {
      return (value >>> bits) | (value << (32 - bits));
    }

    function sha256(bytes) {
      const len = bytes.length;
      const bitLen = BigInt(len) * 8n;
      const totalLen = (len + 9 + 63) & ~63;
      const buffer = new Uint8Array(totalLen);
      buffer.set(bytes);
      buffer[len] = 0x80;

      let lengthValue = bitLen;
      for (let i = 0; i < 8; i++) {
        buffer[buffer.length - 1 - i] = Number(lengthValue & 0xffn);
        lengthValue >>= 8n;
      }

      const h = SHA256_INIT.slice();
      const w = new Uint32Array(64);

      for (let offset = 0; offset < buffer.length; offset += 64) {
        for (let i = 0; i < 16; i++) {
          const base = offset + i * 4;
          w[i] =
            ((buffer[base] << 24) |
              (buffer[base + 1] << 16) |
              (buffer[base + 2] << 8) |
              buffer[base + 3]) >>> 0;
        }

        for (let i = 16; i < 64; i++) {
          const s0 = rotr32(w[i - 15], 7) ^ rotr32(w[i - 15], 18) ^ (w[i - 15] >>> 3);
          const s1 = rotr32(w[i - 2], 17) ^ rotr32(w[i - 2], 19) ^ (w[i - 2] >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let a = h[0];
        let b = h[1];
        let c = h[2];
        let d = h[3];
        let e = h[4];
        let f = h[5];
        let g = h[6];
        let hVal = h[7];

        for (let i = 0; i < 64; i++) {
          const s1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
          const ch = (e & f) ^ (~e & g);
          const temp1 = (hVal + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
          const s0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
          const maj = (a & b) ^ (a & c) ^ (b & c);
          const temp2 = (s0 + maj) >>> 0;

          hVal = g;
          g = f;
          f = e;
          e = (d + temp1) >>> 0;
          d = c;
          c = b;
          b = a;
          a = (temp1 + temp2) >>> 0;
        }

        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
        h[5] = (h[5] + f) >>> 0;
        h[6] = (h[6] + g) >>> 0;
        h[7] = (h[7] + hVal) >>> 0;
      }

      const out = new Uint8Array(32);
      for (let i = 0; i < 8; i++) {
        const base = i * 4;
        out[base] = (h[i] >>> 24) & 0xff;
        out[base + 1] = (h[i] >>> 16) & 0xff;
        out[base + 2] = (h[i] >>> 8) & 0xff;
        out[base + 3] = h[i] & 0xff;
      }
      return out;
    }

    function deriveTextKeyBytes(keyText) {
      if (!keyText || keyText === "CHANGE_ME") return null;
      const input = HEADER_ENCODER.encode(KEY_SALT + "\u0000" + keyText);
      return sha256(input);
    }

    function getTextKeyState() {
      const keyText = getSharedKey();
      if (!keyText) {
        textKeyState = { source: "", keyBytes: null, expanded: null };
        return null;
      }
      if (textKeyState.source === keyText && textKeyState.keyBytes && textKeyState.expanded) {
        return textKeyState;
      }
      const keyBytes = deriveTextKeyBytes(keyText);
      if (!keyBytes || keyBytes.length !== 32) {
        textKeyState = { source: keyText, keyBytes: null, expanded: null };
        return null;
      }
      textKeyState = {
        source: keyText,
        keyBytes: keyBytes,
        expanded: expandAesKey(keyBytes)
      };
      return textKeyState;
    }

    function expandAesKey(keyBytes) {
      const expanded = new Uint8Array(16 * (AES_NR + 1));
      expanded.set(keyBytes);
      const temp = new Uint8Array(4);
      let i = AES_NK;

      while (i < AES_NB * (AES_NR + 1)) {
        const prevOffset = (i - 1) * 4;
        temp[0] = expanded[prevOffset];
        temp[1] = expanded[prevOffset + 1];
        temp[2] = expanded[prevOffset + 2];
        temp[3] = expanded[prevOffset + 3];

        if (i % AES_NK === 0) {
          const t = temp[0];
          temp[0] = AES_SBOX[temp[1]];
          temp[1] = AES_SBOX[temp[2]];
          temp[2] = AES_SBOX[temp[3]];
          temp[3] = AES_SBOX[t];
          temp[0] ^= AES_RCON[i / AES_NK];
        } else if (i % AES_NK === 4) {
          temp[0] = AES_SBOX[temp[0]];
          temp[1] = AES_SBOX[temp[1]];
          temp[2] = AES_SBOX[temp[2]];
          temp[3] = AES_SBOX[temp[3]];
        }

        const base = i * 4;
        const src = (i - AES_NK) * 4;
        expanded[base] = expanded[src] ^ temp[0];
        expanded[base + 1] = expanded[src + 1] ^ temp[1];
        expanded[base + 2] = expanded[src + 2] ^ temp[2];
        expanded[base + 3] = expanded[src + 3] ^ temp[3];
        i++;
      }

      return expanded;
    }

    function aesAddRoundKey(stateBytes, expandedKey, round) {
      const offset = round * 16;
      for (let i = 0; i < 16; i++) {
        stateBytes[i] ^= expandedKey[offset + i];
      }
    }

    function aesSubBytes(stateBytes) {
      for (let i = 0; i < 16; i++) {
        stateBytes[i] = AES_SBOX[stateBytes[i]];
      }
    }

    function aesShiftRows(stateBytes) {
      const t = stateBytes.slice();
      stateBytes[1] = t[5];
      stateBytes[5] = t[9];
      stateBytes[9] = t[13];
      stateBytes[13] = t[1];
      stateBytes[2] = t[10];
      stateBytes[6] = t[14];
      stateBytes[10] = t[2];
      stateBytes[14] = t[6];
      stateBytes[3] = t[15];
      stateBytes[7] = t[3];
      stateBytes[11] = t[7];
      stateBytes[15] = t[11];
    }

    function aesXtime(value) {
      return ((value << 1) ^ (((value >> 7) & 1) * 0x1b)) & 0xff;
    }

    function aesMixColumns(stateBytes) {
      for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const a0 = stateBytes[i];
        const a1 = stateBytes[i + 1];
        const a2 = stateBytes[i + 2];
        const a3 = stateBytes[i + 3];
        const t = a0 ^ a1 ^ a2 ^ a3;
        const b0 = a0 ^ t ^ aesXtime(a0 ^ a1);
        const b1 = a1 ^ t ^ aesXtime(a1 ^ a2);
        const b2 = a2 ^ t ^ aesXtime(a2 ^ a3);
        const b3 = a3 ^ t ^ aesXtime(a3 ^ a0);
        stateBytes[i] = b0;
        stateBytes[i + 1] = b1;
        stateBytes[i + 2] = b2;
        stateBytes[i + 3] = b3;
      }
    }

    function aesEncryptBlock(block, expandedKey) {
      const stateBytes = new Uint8Array(16);
      stateBytes.set(block);
      aesAddRoundKey(stateBytes, expandedKey, 0);

      for (let round = 1; round < AES_NR; round++) {
        aesSubBytes(stateBytes);
        aesShiftRows(stateBytes);
        aesMixColumns(stateBytes);
        aesAddRoundKey(stateBytes, expandedKey, round);
      }

      aesSubBytes(stateBytes);
      aesShiftRows(stateBytes);
      aesAddRoundKey(stateBytes, expandedKey, AES_NR);
      return stateBytes;
    }

    function inc32(counter) {
      const out = counter.slice();
      for (let i = 15; i >= 12; i--) {
        out[i] = (out[i] + 1) & 0xff;
        if (out[i] !== 0) break;
      }
      return out;
    }

    function bytesToBigInt(bytes) {
      let result = 0n;
      for (let i = 0; i < bytes.length; i++) {
        result = (result << 8n) | BigInt(bytes[i]);
      }
      return result;
    }

    function bigIntToBytes(value) {
      const out = new Uint8Array(16);
      let v = value;
      for (let i = 15; i >= 0; i--) {
        out[i] = Number(v & 0xffn);
        v >>= 8n;
      }
      return out;
    }

    function xorBlock(left, right) {
      const out = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        out[i] = left[i] ^ right[i];
      }
      return out;
    }

    function writeUint64BE(out, offset, value) {
      let v = BigInt(value);
      for (let i = 7; i >= 0; i--) {
        out[offset + i] = Number(v & 0xffn);
        v >>= 8n;
      }
    }

    function galoisMultiply(xBytes, yBytes) {
      let z = 0n;
      let v = bytesToBigInt(yBytes);
      const x = bytesToBigInt(xBytes);
      for (let i = 0; i < 128; i++) {
        if (x & (1n << BigInt(127 - i))) z ^= v;
        if (v & 1n) {
          v = (v >> 1n) ^ GCM_R;
        } else {
          v >>= 1n;
        }
      }
      return bigIntToBytes(z);
    }

    function ghash(hSubkey, cipherBytes) {
      let y = new Uint8Array(16);
      for (let offset = 0; offset < cipherBytes.length; offset += 16) {
        const block = new Uint8Array(16);
        block.set(cipherBytes.slice(offset, offset + 16));
        y = galoisMultiply(xorBlock(y, block), hSubkey);
      }
      const lengthBlock = new Uint8Array(16);
      writeUint64BE(lengthBlock, 0, 0n);
      writeUint64BE(lengthBlock, 8, BigInt(cipherBytes.length) * 8n);
      y = galoisMultiply(xorBlock(y, lengthBlock), hSubkey);
      return y;
    }

    function aesGcmEncrypt(plainBytes, keyState, ivBytes) {
      if (!ivBytes || ivBytes.length !== TEXT_IV_BYTES) return null;
      const expanded = keyState.expanded;
      const hSubkey = aesEncryptBlock(new Uint8Array(16), expanded);
      const j0 = new Uint8Array(16);
      j0.set(ivBytes, 0);
      j0[15] = 1;

      let counter = j0.slice();
      const cipherBytes = new Uint8Array(plainBytes.length);
      for (let offset = 0; offset < plainBytes.length; offset += 16) {
        counter = inc32(counter);
        const stream = aesEncryptBlock(counter, expanded);
        const blockLen = Math.min(16, plainBytes.length - offset);
        for (let i = 0; i < blockLen; i++) {
          cipherBytes[offset + i] = plainBytes[offset + i] ^ stream[i];
        }
      }

      const tag = ghash(hSubkey, cipherBytes);
      const s = aesEncryptBlock(j0, expanded);
      for (let i = 0; i < 16; i++) {
        tag[i] ^= s[i];
      }

      return { cipher: cipherBytes, tag: tag };
    }

    function aesGcmDecrypt(cipherBytes, keyState, ivBytes) {
      if (!ivBytes || ivBytes.length !== TEXT_IV_BYTES) return null;
      if (!cipherBytes || cipherBytes.length < TEXT_TAG_BYTES) return null;
      const expanded = keyState.expanded;
      const hSubkey = aesEncryptBlock(new Uint8Array(16), expanded);
      const j0 = new Uint8Array(16);
      j0.set(ivBytes, 0);
      j0[15] = 1;

      const dataLen = cipherBytes.length - TEXT_TAG_BYTES;
      const data = cipherBytes.slice(0, dataLen);
      const tag = cipherBytes.slice(dataLen);
      const y = ghash(hSubkey, data);
      const s = aesEncryptBlock(j0, expanded);
      for (let i = 0; i < 16; i++) {
        if ((y[i] ^ s[i]) !== tag[i]) return null;
      }

      let counter = j0.slice();
      const plainBytes = new Uint8Array(dataLen);
      for (let offset = 0; offset < dataLen; offset += 16) {
        counter = inc32(counter);
        const stream = aesEncryptBlock(counter, expanded);
        const blockLen = Math.min(16, dataLen - offset);
        for (let i = 0; i < blockLen; i++) {
          plainBytes[offset + i] = data[offset + i] ^ stream[i];
        }
      }
      return plainBytes;
    }

    function buildEncryptedTextPayloadBinary(plainText) {
      const keyState = getTextKeyState();
      if (!keyState) return null;
      const iv = crypto.getRandomValues(new Uint8Array(TEXT_IV_BYTES));
      const plainBytes = HEADER_ENCODER.encode(plainText);
      const encrypted = aesGcmEncrypt(plainBytes, keyState, iv);
      if (!encrypted) return null;
      const out = new Uint8Array(1 + TEXT_IV_BYTES + encrypted.cipher.length + encrypted.tag.length);
      out[0] = TEXT_ENCRYPT_PREFIX_V2_BYTE;
      out.set(iv, 1);
      out.set(encrypted.cipher, 1 + TEXT_IV_BYTES);
      out.set(encrypted.tag, 1 + TEXT_IV_BYTES + encrypted.cipher.length);
      return out;
    }

    function parseEncryptedTextPayloadBinary(bytes) {
      if (!bytes || bytes.length < 1 + TEXT_IV_BYTES + TEXT_TAG_BYTES) return null;
      if (bytes[0] !== TEXT_ENCRYPT_PREFIX_V2_BYTE) return null;
      const ivStart = 1;
      const ivEnd = ivStart + TEXT_IV_BYTES;
      const ivBytes = bytes.slice(ivStart, ivEnd);
      const cipherBytes = bytes.slice(ivEnd);
      return { ivBytes: ivBytes, cipherBytes: cipherBytes };
    }

    function decryptEncryptedTextPayloadBinary(parsed) {
      const keyState = getTextKeyState();
      if (!keyState) return null;
      if (!parsed || !parsed.ivBytes || !parsed.cipherBytes) return null;
      const plainBytes = aesGcmDecrypt(parsed.cipherBytes, keyState, parsed.ivBytes);
      if (!plainBytes) return null;
      const text = HEADER_DECODER.decode(plainBytes);
      if (text.indexOf(TEXT_ENCRYPT_MAGIC) === 0) {
        return text.slice(TEXT_ENCRYPT_MAGIC.length);
      }
      return text;
    }

    function buildHiddenMessageFilename() {
      const time = Date.now().toString(36);
      const rand = Math.random().toString(36).slice(2, 8);
      return "hidden-" + time + "-" + rand + DNI_FILE_EXTENSION;
    }

    function buildHiddenMessageFileBytes(plainText) {
      const keyState = getTextKeyState();
      if (!keyState) return null;
      const iv = crypto.getRandomValues(new Uint8Array(TEXT_IV_BYTES));
      const plainBytes = HEADER_ENCODER.encode(TEXT_ENCRYPT_MAGIC + plainText);
      const encrypted = aesGcmEncrypt(plainBytes, keyState, iv);
      if (!encrypted) return null;
      const headerSize = DNI_FILE_MAGIC_BYTES.length;
      const totalSize = headerSize + TEXT_IV_BYTES + encrypted.cipher.length + encrypted.tag.length;
      const out = new Uint8Array(totalSize);
      out.set(DNI_FILE_MAGIC_BYTES, 0);
      out.set(iv, headerSize);
      out.set(encrypted.cipher, headerSize + TEXT_IV_BYTES);
      out.set(encrypted.tag, headerSize + TEXT_IV_BYTES + encrypted.cipher.length);
      return out;
    }

    function decodeHiddenMessageFileBytes(bytes) {
      const keyState = getTextKeyState();
      if (!keyState || !bytes) return null;
      const headerSize = DNI_FILE_MAGIC_BYTES.length;
      if (bytes.length < headerSize + TEXT_IV_BYTES + TEXT_TAG_BYTES) return null;
      for (let i = 0; i < headerSize; i++) {
        if (bytes[i] !== DNI_FILE_MAGIC_BYTES[i]) return null;
      }
      const ivStart = headerSize;
      const ivEnd = ivStart + TEXT_IV_BYTES;
      const ivBytes = bytes.slice(ivStart, ivEnd);
      const cipherBytes = bytes.slice(ivEnd);
      const plainBytes = aesGcmDecrypt(cipherBytes, keyState, ivBytes);
      if (!plainBytes) return null;
      const text = HEADER_DECODER.decode(plainBytes);
      if (text.indexOf(TEXT_ENCRYPT_MAGIC) !== 0) return null;
      return text.slice(TEXT_ENCRYPT_MAGIC.length);
    }

    function isHiddenMessageUrl(url) {
      try {
        const parsed = new URL(url, location.href);
        return parsed.pathname.toLowerCase().endsWith(DNI_FILE_EXTENSION);
      } catch (_) {
        return false;
      }
    }

    function guessMimeFromFilename(name) {
      const lower = name ? name.toLowerCase() : "";
      if (lower.endsWith(".png")) return "image/png";
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
      if (lower.endsWith(".gif")) return "image/gif";
      if (lower.endsWith(".webp")) return "image/webp";
      if (lower.endsWith(".bmp")) return "image/bmp";
      if (lower.endsWith(".txt")) return "text/plain";
      return "application/octet-stream";
    }

    function isTextAttachment(mime, name) {
      if (mime && mime.indexOf("text/") === 0) return true;
      return isTextFilename(name);
    }

    function decodeTextBytes(bytes) {
      try {
        return HEADER_DECODER.decode(bytes);
      } catch (_) {
        return null;
      }
    }

    function buildMetaPayload(meta) {
      if (!meta || !meta.files || Object.keys(meta.files).length === 0) return "";
      try {
        const json = JSON.stringify(meta);
        const encoded = base64EncodeText(json);
        return META_PREFIX + META_SEPARATOR + encoded + META_SEPARATOR;
      } catch (_) {
        return "";
      }
    }

    function parseMetaPayload(body) {
      if (!body || body.indexOf(META_PREFIX + META_SEPARATOR) !== 0) {
        return { text: body || "", meta: null };
      }

      const rest = body.slice((META_PREFIX + META_SEPARATOR).length);
      const sepIndex = rest.indexOf(META_SEPARATOR);
      if (sepIndex === -1) return { text: body, meta: null };

      const metaEncoded = rest.slice(0, sepIndex);
      const text = rest.slice(sepIndex + META_SEPARATOR.length);
      const json = base64DecodeText(metaEncoded);
      if (!json) return { text: body, meta: null };

      try {
        return { text: text, meta: JSON.parse(json) };
      } catch (_) {
        return { text: body, meta: null };
      }
    }

    function decodePayloadText(body) {
      return parseMetaPayload(body);
    }

    function normalizeUrlKey(url) {
      try {
        return new URL(url, location.href).toString();
      } catch (_) {
        return url;
      }
    }

    function normalizeUrlNoQuery(url) {
      try {
        const parsed = new URL(url, location.href);
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString();
      } catch (_) {
        return url;
      }
    }

    function extractFilenameFromUrl(url) {
      try {
        const pathname = new URL(url, location.href).pathname;
        const parts = pathname.split("/");
        return decodeURIComponent(parts[parts.length - 1] || "");
      } catch (_) {
        return "";
      }
    }

    function getBaseName(value) {
      if (!value || typeof value !== "string") return "";
      const parts = value.split("/");
      return parts[parts.length - 1] || "";
    }

    function findMetaRecord(meta, candidate) {
      if (!meta || !meta.files || !candidate) return null;
      if (meta.files[candidate]) return meta.files[candidate];
      const base = getBaseName(candidate);
      if (base && meta.files[base]) return meta.files[base];

      for (const key in meta.files) {
        if (!Object.prototype.hasOwnProperty.call(meta.files, key)) continue;
        if (key === candidate) return meta.files[key];
        if (base && key.endsWith("/" + base)) return meta.files[key];
        if (candidate && candidate.endsWith("/" + key)) return meta.files[key];
      }
      return null;
    }

    function isEncryptedFilename(name) {
      if (!name) return false;
      return name.toLowerCase().endsWith(ENCRYPTED_EXTENSION);
    }

    function isImageFile(file) {
      if (!file) return false;
      if (file.type && file.type.indexOf("image/") === 0) return true;
      const name = file.name ? file.name.toLowerCase() : "";
      return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
    }

    function isTextFile(file) {
      if (!file) return false;
      if (file.type && file.type.indexOf("text/") === 0) return true;
      const name = file.name ? file.name.toLowerCase() : "";
      return /\.txt$/i.test(name);
    }

    function isTextFilename(name) {
      if (!name || typeof name !== "string") return false;
      return /\.txt$/i.test(name);
    }

    function shouldEncryptFile(file) {
      return isImageFile(file) || isTextFile(file);
    }

    function buildEncryptedFilename() {
      const time = Date.now().toString(36);
      const rand = Math.random().toString(36).slice(2, 8);
      return "hidden-" + time + "-" + rand + ENCRYPTED_EXTENSION;
    }

    function buildEncryptedPayload(iv, mime, name, cipherBuffer) {
      const mimeBytes = HEADER_ENCODER.encode(mime || "application/octet-stream");
      const nameBytes = HEADER_ENCODER.encode(name || "file");
      const headerSize = 4 + 12 + 2 + 2 + mimeBytes.length + nameBytes.length;
      const cipherBytes = new Uint8Array(cipherBuffer);
      const out = new Uint8Array(headerSize + cipherBytes.length);
      out[0] = FILE_MAGIC.charCodeAt(0);
      out[1] = FILE_MAGIC.charCodeAt(1);
      out[2] = FILE_MAGIC.charCodeAt(2);
      out[3] = FILE_MAGIC.charCodeAt(3);
      out.set(iv, 4);
      const view = new DataView(out.buffer);
      view.setUint16(16, mimeBytes.length, false);
      view.setUint16(18, nameBytes.length, false);
      out.set(mimeBytes, 20);
      out.set(nameBytes, 20 + mimeBytes.length);
      out.set(cipherBytes, 20 + mimeBytes.length + nameBytes.length);
      return out;
    }

    function readEncryptedHeader(bytes) {
      if (bytes.length < 20) return null;
      if (
        bytes[0] !== FILE_MAGIC.charCodeAt(0) ||
        bytes[1] !== FILE_MAGIC.charCodeAt(1) ||
        bytes[2] !== FILE_MAGIC.charCodeAt(2) ||
        bytes[3] !== FILE_MAGIC.charCodeAt(3)
      ) {
        return null;
      }

      const iv = bytes.slice(4, 16);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const mimeLength = view.getUint16(16, false);
      const nameLength = view.getUint16(18, false);
      const headerSize = 20 + mimeLength + nameLength;
      if (headerSize > bytes.length) return null;

      const mimeBytes = bytes.slice(20, 20 + mimeLength);
      const nameBytes = bytes.slice(20 + mimeLength, headerSize);
      const cipherBytes = bytes.slice(headerSize);

      return {
        iv: iv,
        mime: HEADER_DECODER.decode(mimeBytes),
        name: HEADER_DECODER.decode(nameBytes),
        cipher: cipherBytes
      };
    }

    async function encryptFile(file) {
      const keys = await getCryptoKeys();
      if (!keys || !keys.gcm) return null;
      if (!file || !shouldEncryptFile(file) || isEncryptedFilename(file.name)) return null;

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await file.arrayBuffer();
      const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, keys.gcm, data);
      const payload = buildEncryptedPayload(iv, file.type, file.name, cipher);
      const blob = new Blob([payload], { type: "application/octet-stream" });
      return { blob: blob, filename: buildEncryptedFilename() };
    }

    async function encryptUploads(uploads) {
      if (!state.enabled) return;
      const keyText = getSharedKey();
      if (!keyText) return;
      if (!Array.isArray(uploads) || uploads.length === 0) return;

      for (const upload of uploads) {
        if (!upload || upload.__dhiEncrypted) continue;
        const file = upload.item && upload.item.file ? upload.item.file : upload.file;
        if (!file || !shouldEncryptFile(file) || isEncryptedFilename(file.name)) continue;

        const encrypted = await encryptFile(file);
        if (!encrypted) continue;

        let encryptedFile;
        try {
          encryptedFile = new File([encrypted.blob], encrypted.filename, { type: "application/octet-stream" });
        } catch (_) {
          encryptedFile = encrypted.blob;
          encryptedFile.name = encrypted.filename;
        }

        if (upload.item && upload.item.file) upload.item.file = encryptedFile;
        if (upload.file) upload.file = encryptedFile;
        if (typeof upload.filename === "string") upload.filename = encrypted.filename;
        if (typeof upload.mimeType === "string") upload.mimeType = "application/octet-stream";
        if (typeof upload.isImage === "boolean") upload.isImage = false;
        if (typeof upload.isVideo === "boolean") upload.isVideo = false;
        upload.__dhiEncrypted = true;
      }
    }

    async function decryptArrayBuffer(buffer) {
      const keys = await getCryptoKeys();
      if (!keys || !keys.gcm) return null;
      const bytes = new Uint8Array(buffer);
      const header = readEncryptedHeader(bytes);
      if (!header) return null;

      try {
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: header.iv }, keys.gcm, header.cipher);
        return {
          bytes: new Uint8Array(plain),
          mime: header.mime || "application/octet-stream",
          name: header.name || "file"
        };
      } catch (_) {
        return null;
      }
    }

    const pendingUploadsById = new Map();
    const pendingUploadsByUrl = new Map();
    const pendingMetaByFilename = new Map();
    const attachmentMetaByUrl = new Map();
    const attachmentMetaByFilename = new Map();

    async function encryptArrayBufferCtr(buffer, counter) {
      const keys = await getCryptoKeys();
      if (!keys || !keys.ctr) return null;
      return crypto.subtle.encrypt(
        {
          name: "AES-CTR",
          counter: counter,
          length: 64
        },
        keys.ctr,
        buffer
      );
    }

    async function decryptArrayBufferCtr(buffer, counter) {
      const keys = await getCryptoKeys();
      if (!keys || !keys.ctr) return null;
      return crypto.subtle.decrypt(
        {
          name: "AES-CTR",
          counter: counter,
          length: 64
        },
        keys.ctr,
        buffer
      );
    }

    async function encryptUploadBody(body, meta) {
      debugLog("Encrypt upload body start", { id: meta && meta.id, body: describeBody(body) });
      if (!meta) return null;
      const buffer = await readBodyAsArrayBuffer(body);
      if (!buffer) {
        debugLog("Encrypt upload body missing buffer", { id: meta.id, body: describeBody(body) });
        return null;
      }
      const counter = crypto.getRandomValues(new Uint8Array(16));
      const cipher = await encryptArrayBufferCtr(buffer, counter);
      if (!cipher) {
        debugLog("Encrypt upload body failed", { id: meta.id });
        return null;
      }
      meta.iv = base64EncodeBytes(counter);
      debugLog("Encrypted upload body", { id: meta.id, size: buffer.byteLength });
      return cipher;
    }

    async function readBodyAsArrayBuffer(body) {
      if (!body) return null;
      if (body instanceof ArrayBuffer) return body;
      if (ArrayBuffer.isView(body)) {
        const view = body;
        return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
      }
      if (body instanceof Blob) {
        try {
          return await body.arrayBuffer();
        } catch (_) {
          debugLog("Failed to read Blob body", { body: describeBody(body) });
          return null;
        }
      }
      if (typeof body.arrayBuffer === "function") {
        try {
          return await body.arrayBuffer();
        } catch (_) {
          debugLog("Failed to read arrayBuffer body", { body: describeBody(body) });
          return null;
        }
      }
      if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
        try {
          return await new Response(body).arrayBuffer();
        } catch (_) {
          debugLog("Failed to read ReadableStream body", { body: describeBody(body) });
          return null;
        }
      }
      if (body && typeof body.getReader === "function") {
        try {
          return await new Response(body).arrayBuffer();
        } catch (_) {
          debugLog("Failed to read stream body", { body: describeBody(body) });
          return null;
        }
      }
      debugLog("Unsupported upload body type", { body: describeBody(body) });
      return null;
    }

    function cloneRequestWithBody(request, body) {
      const init = {
        method: request.method,
        headers: new Headers(request.headers),
        body: body,
        mode: request.mode,
        credentials: request.credentials,
        cache: request.cache,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        integrity: request.integrity,
        keepalive: request.keepalive,
        signal: request.signal
      };
      if ("duplex" in request) init.duplex = request.duplex;
      return new Request(request.url, init);
    }

    function stripContentType(headers) {
      if (!headers) return;
      if (headers instanceof Headers) {
        headers.delete("content-type");
        headers.delete("Content-Type");
        return;
      }
      if (typeof headers === "object") {
        for (const key in headers) {
          if (key && key.toLowerCase() === "content-type") {
            delete headers[key];
          }
        }
      }
    }

    function transformAttachmentsRequestPayload(payload) {
      if (!payload || typeof payload !== "object" || !Array.isArray(payload.files)) return payload;

      for (const file of payload.files) {
        if (!file || typeof file !== "object") continue;
        const id = String(file.id != null ? file.id : "");
        const filename = file.filename || "";
        if (!id || !filename) continue;
        if (!/\.(png|jpe?g|gif|webp|bmp|txt)$/i.test(filename)) continue;
        if (!getSharedKey()) continue;

        const dhiName = buildEncryptedFilename();
        pendingUploadsById.set(id, {
          id: id,
          name: filename,
          dhiName: dhiName,
          mime: guessMimeFromFilename(filename)
        });

        file.filename = dhiName;
        file.original_content_type = "application/octet-stream";
        debugLog("Prepared attachment", { id: id, newName: dhiName, size: file.file_size });
      }

      if (Array.isArray(payload.attachments)) {
        for (const attachment of payload.attachments) {
          if (!attachment || typeof attachment !== "object") continue;
          const updated = pendingUploadsById.get(String(attachment.id));
          if (updated) attachment.filename = updated.dhiName;
        }
      }

      return payload;
    }

    function registerAttachmentsResponse(payload) {
      if (!payload || typeof payload !== "object" || !Array.isArray(payload.attachments)) return;

      for (const attachment of payload.attachments) {
        if (!attachment || typeof attachment !== "object") continue;
        const id = String(attachment.id != null ? attachment.id : "");
        const meta = pendingUploadsById.get(id);
        if (!meta) continue;
        debugLog("Received upload URL", { id: id, hasUploadUrl: !!attachment.upload_url });
        if (attachment.upload_url) {
          const urlKey = normalizeUrlKey(attachment.upload_url);
          pendingUploadsByUrl.set(urlKey, meta);
          pendingUploadsByUrl.set(normalizeUrlNoQuery(attachment.upload_url), meta);
        }
        if (attachment.upload_filename) {
          meta.uploadFilename = attachment.upload_filename;
          pendingMetaByFilename.set(attachment.upload_filename, meta);
        }
        pendingUploadsById.delete(id);
      }
    }

    function buildAttachmentMetaForPayload(payload) {
      if (!payload || !Array.isArray(payload.attachments)) return null;

      const files = {};
      for (const attachment of payload.attachments) {
        if (!attachment || typeof attachment !== "object") continue;
        const key = attachment.uploaded_filename || attachment.filename;
        if (!key) continue;
        const meta = pendingMetaByFilename.get(key);
        if (!meta || !meta.iv) continue;
        if (!meta.iv) {
          debugLog("Missing iv for attachment meta", { key: key });
          continue;
        }
        files[key] = {
          iv: meta.iv,
          name: meta.name || "file",
          mime: meta.mime || "application/octet-stream"
        };
        debugLog("Meta iv length", { key: key, length: meta.iv.length });
        if (meta.dhiName) attachment.filename = meta.dhiName;
        pendingMetaByFilename.delete(key);
      }

      const keys = Object.keys(files);
      if (keys.length === 0) return null;
      debugLog("Built attachment meta", { count: keys.length, keys: keys.slice(0, 5) });
      return { v: 1, files: files };
    }

    function registerAttachmentMetaFromMessage(msg, meta) {
      if (!meta || !meta.files || !msg || !Array.isArray(msg.attachments)) return;
      debugLog("Register attachment meta from message", { count: Object.keys(meta.files).length });
      for (const attachment of msg.attachments) {
        if (!attachment || typeof attachment !== "object") continue;
        const candidates = [];
        if (attachment.filename) candidates.push(attachment.filename);
        if (attachment.uploaded_filename) candidates.push(attachment.uploaded_filename);
        if (attachment.url) candidates.push(extractFilenameFromUrl(attachment.url));
        if (attachment.proxy_url) candidates.push(extractFilenameFromUrl(attachment.proxy_url));

        let record = null;
        for (const candidate of candidates) {
          record = findMetaRecord(meta, candidate);
          if (record) {
            attachmentMetaByFilename.set(candidate, record);
            const base = getBaseName(candidate);
            if (base) attachmentMetaByFilename.set(base, record);
            debugLog("Matched attachment meta", { name: candidate, base: base, ivLen: record.iv ? record.iv.length : 0 });
            break;
          }
        }

        if (record && attachment.url) {
          record.url = attachment.url;
          attachmentMetaByUrl.set(attachment.url, record);
        }
        if (record && attachment.proxy_url) {
          record.proxyUrl = attachment.proxy_url;
          attachmentMetaByUrl.set(attachment.proxy_url, record);
        }
      }
    }

    async function encryptFormData(form) {
      const keys = await getCryptoKeys();
      const key = keys ? keys.gcm : null;

      const payloadJson = form.get("payload_json");
      let payload = null;
      const overflowInfo = { overflow: null };
      if (typeof payloadJson === "string") {
        try {
          payload = JSON.parse(payloadJson);
        } catch (_) {
          payload = null;
        }
      }

      if (payload) transformOutgoingPayload(payload, overflowInfo);

      const newForm = new FormData();
      const renamed = new Map();

      for (const entry of form.entries()) {
        const keyName = entry[0];
        const value = entry[1];
        if (keyName === "payload_json") continue;

        if (value instanceof File) {
          if (key) {
            const encrypted = await encryptFile(value);
            if (encrypted) {
              newForm.append(keyName, encrypted.blob, encrypted.filename);
              const idMatch = keyName.match(/^files\[(\d+)\]$/);
              if (idMatch) renamed.set(idMatch[1], encrypted.filename);
              continue;
            }
          }
        }

        newForm.append(keyName, value);
      }

      if (payload && Array.isArray(payload.attachments) && renamed.size > 0) {
        for (const attachment of payload.attachments) {
          if (!attachment || typeof attachment !== "object") continue;
          const updatedName = renamed.get(String(attachment.id));
          if (updatedName) {
            attachment.filename = updatedName;
            attachment.content_type = "application/octet-stream";
          }
        }
      }

      if (payload && overflowInfo.overflow && overflowInfo.overflow.bytes) {
        const attachmentId = getNextAttachmentId(payload, form);
        const filename = overflowInfo.overflow.filename || buildHiddenMessageFilename();
        const blob = new Blob([overflowInfo.overflow.bytes], { type: DNI_FILE_MIME });
        if (!payload.attachments || !Array.isArray(payload.attachments)) {
          payload.attachments = [];
        }
        payload.attachments.push({ id: attachmentId, filename: filename });
        newForm.append("files[" + attachmentId + "]", blob, filename);
      }

      if (payload) {
        newForm.append("payload_json", JSON.stringify(payload));
      } else if (typeof payloadJson === "string") {
        newForm.append("payload_json", payloadJson);
      }

      return newForm;
    }

    const attachmentCache = new Map();
    const failedFetches = new Map();
    const textPreviewByHost = new WeakMap();

    function getMetaForUrl(url) {
      if (attachmentMetaByUrl.has(url)) {
        debugLog("Found meta by url", { name: extractFilenameFromUrl(url) });
        return attachmentMetaByUrl.get(url);
      }
      const filename = extractFilenameFromUrl(url);
      if (filename && attachmentMetaByFilename.has(filename)) {
        debugLog("Found meta by filename", { name: filename });
        return attachmentMetaByFilename.get(filename);
      }
      return null;
    }

    function shouldSkipFetch(url) {
      const last = failedFetches.get(url);
      if (!last) return false;
      return Date.now() - last < FETCH_FAIL_TTL;
    }

    function markFetchFailed(url) {
      failedFetches.set(url, Date.now());
    }

    function isEncryptedAttachmentUrl(url) {
      try {
        const parsed = new URL(url, location.href);
        return parsed.pathname.toLowerCase().endsWith(ENCRYPTED_EXTENSION);
      } catch (_) {
        return false;
      }
    }

    async function decryptArrayBufferWithMeta(buffer, meta) {
      const ivText = meta && meta.iv ? meta.iv : "";
      const ivBytes = base64DecodeBytes(ivText);
      if (!ivBytes || ivBytes.length !== 16) {
        debugLog("Invalid iv bytes", { ivLen: ivBytes ? ivBytes.length : 0, ivTextLen: ivText.length });
        return null;
      }
      try {
        const plain = await decryptArrayBufferCtr(buffer, ivBytes);
        if (!plain) return null;
        return {
          bytes: new Uint8Array(plain),
          mime: meta.mime || "application/octet-stream",
          name: meta.name || "file"
        };
      } catch (error) {
        debugLog("Decrypt CTR exception", { error: String(error) });
        return null;
      }
    }

    function gmFetchArrayBuffer(url) {
      if (typeof GM_xmlhttpRequest === "function") {
        return new Promise((resolve) => {
          try {
            GM_xmlhttpRequest({
              method: "GET",
              url: url,
              responseType: "arraybuffer",
              anonymous: false,
              onload: function (response) {
                if (response.status >= 200 && response.status < 300 && response.response) {
                  resolve(response.response);
                  return;
                }
                debugLog("GM fetch failed", { name: extractFilenameFromUrl(url), status: response.status });
                resolve(null);
              },
              onerror: function (error) {
                debugLog("GM fetch error", { name: extractFilenameFromUrl(url), error: String(error) });
                resolve(null);
              },
              ontimeout: function () {
                debugLog("GM fetch timeout", { name: extractFilenameFromUrl(url) });
                resolve(null);
              }
            });
          } catch (error) {
            debugLog("GM fetch exception", { name: extractFilenameFromUrl(url), error: String(error) });
            resolve(null);
          }
        });
      }
      return Promise.resolve(null);
    }

    async function fetchAttachmentBuffer(urls) {
      for (const candidate of urls) {
        if (!candidate) continue;
        const nativeBuffer = await nativeFetchArrayBuffer(candidate);
        if (nativeBuffer) return nativeBuffer;
        const nativeHelper = getNativeHelper();
        if (nativeHelper && typeof nativeHelper.fetchBinary === "function") {
          continue;
        }
        try {
          const response = await fetch(candidate);
          if (!response.ok) {
            debugLog("Attachment fetch failed", { name: extractFilenameFromUrl(candidate), status: response.status });
            const gmBuffer = await gmFetchArrayBuffer(candidate);
            if (gmBuffer) return gmBuffer;
            continue;
          }
          return await response.arrayBuffer();
        } catch (error) {
          debugLog("Attachment fetch error", { name: extractFilenameFromUrl(candidate), error: String(error) });
          const gmBuffer = await gmFetchArrayBuffer(candidate);
          if (gmBuffer) return gmBuffer;
        }
      }
      return null;
    }

    async function getDecryptedAttachmentUrl(url, meta) {
      const sources = [];
      if (meta && meta.url) sources.push(meta.url);
      if (meta && meta.proxyUrl) sources.push(meta.proxyUrl);
      sources.push(url);

      const primarySource = sources[0];
      if (primarySource && shouldSkipFetch(primarySource)) return null;

      const cacheKey = meta && meta.iv ? sources[0] + "|" + meta.iv : sources[0];
      if (attachmentCache.has(cacheKey)) return attachmentCache.get(cacheKey);

      const buffer = await fetchAttachmentBuffer(sources);
      if (!buffer) {
        if (primarySource) markFetchFailed(primarySource);
        return null;
      }

      const result = meta ? await decryptArrayBufferWithMeta(buffer, meta) : await decryptArrayBuffer(buffer);
      if (!result) {
        if (primarySource) markFetchFailed(primarySource);
        return null;
      }
      const blob = new Blob([result.bytes], { type: result.mime });
      const blobUrl = URL.createObjectURL(blob);
      const record = { url: blobUrl, name: result.name, mime: result.mime };
      if (isTextAttachment(result.mime, result.name)) {
        const text = decodeTextBytes(result.bytes);
        if (text !== null) record.text = text;
      }
      attachmentCache.set(cacheKey, record);
      debugLog("Decrypted attachment", { name: extractFilenameFromUrl(url), mime: result.mime, size: result.bytes.length });
      return attachmentCache.get(cacheKey);
    }

    function ensureAttachmentStyles() {
      if (document.getElementById("dhi-attachment-style")) return;
      const style = document.createElement("style");
      style.id = "dhi-attachment-style";
      style.textContent =
        ".dhi-preview-wrap{position:relative;display:inline-block;max-width:100%;}" +
        ".dhi-preview{display:block;margin-top:6px;max-width:100%;border-radius:8px;cursor:zoom-in;opacity:1 !important;transform:none !important;filter:none !important;transition:none !important;}" +
        ".dhi-preview:hover{opacity:1 !important;transform:none !important;filter:none !important;}" +
        ".dhi-preview-wrap:hover .dhi-preview{opacity:1 !important;transform:none !important;filter:none !important;}" +
        ".dhi-text-preview{display:block;margin:0;padding:0;background:transparent;white-space:pre-wrap;word-break:break-word;font:inherit;color:inherit;line-height:1.35;}" +
        ".dhi-text-toggle{margin-left:6px;padding:0;border:0;background:none;color:var(--text-link, #00a8fc);font:inherit;cursor:pointer;}" +
        ".dhi-text-toggle:hover{text-decoration:underline;}" +
        ".dhi-accessory{margin-top:6px;display:flex;flex-direction:column;gap:6px;}" +
        ".dhi-accessory-link{display:inline-flex;align-items:center;gap:6px;color:var(--text-link, #00a8fc);text-decoration:none;}" +
        ".dhi-accessory-link:hover{text-decoration:underline;}" +
        ".dhi-lightbox{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);z-index:9999;}" +
        ".dhi-lightbox.open{display:flex;}" +
        ".dhi-lightbox-img{max-width:92vw;max-height:92vh;width:auto;height:auto;border-radius:10px;}" +
        ".dhi-lightbox-controls{position:absolute;top:16px;right:16px;display:flex;gap:8px;}" +
        ".dhi-lightbox-btn{width:36px;height:36px;padding:0;border-radius:10px;border:1px solid rgba(255,255,255,0.35);background:rgba(28,30,32,0.75);color:#f2f3f5;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.45);}" +
        ".dhi-lightbox-btn svg{width:18px;height:18px;display:block;fill:currentColor;}" +
        ".dhi-lightbox-btn:hover{background:rgba(28,30,32,0.95);}";
      (document.head || document.documentElement).appendChild(style);
    }

    let lightbox = null;
    let lightboxImg = null;
    let lightboxControls = null;
    let lightboxClose = null;
    let lightboxDownload = null;
    let lightboxDelete = null;
    let lightboxReady = false;
    let lightboxCurrent = null;

    function ensureLightbox() {
      if (lightboxReady) return;
      lightboxReady = true;
      ensureAttachmentStyles();

      lightbox = document.createElement("div");
      lightbox.className = "dhi-lightbox";
      lightbox.addEventListener("click", function (event) {
        if (event.target === lightbox) closeLightbox();
      });

      lightboxImg = document.createElement("img");
      lightboxImg.className = "dhi-lightbox-img";

      lightboxControls = document.createElement("div");
      lightboxControls.className = "dhi-lightbox-controls";

      lightboxDownload = document.createElement("button");
      lightboxDownload.type = "button";
      lightboxDownload.className = "dhi-lightbox-btn";
      lightboxDownload.setAttribute("aria-label", "Download image");
      lightboxDownload.appendChild(createIcon([
        "M12 3c.55 0 1 .45 1 1v8.59l2.3-2.3a1 1 0 0 1 1.4 1.42l-4.01 4a1 1 0 0 1-1.38 0l-4.01-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4c0-.55.45-1 1-1z",
        "M5 19c0-.55.45-1 1-1h12a1 1 0 1 1 0 2H6c-.55 0-1-.45-1-1z"
      ]));
      lightboxDownload.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (lightboxCurrent) triggerDownload(lightboxCurrent.fileUrl, lightboxCurrent.name);
      });

      lightboxDelete = document.createElement("button");
      lightboxDelete.type = "button";
      lightboxDelete.className = "dhi-lightbox-btn";
      lightboxDelete.setAttribute("aria-label", "Delete preview");
      lightboxDelete.appendChild(createIcon([
        "M9 3c.4 0 .77.24.93.62L10.3 5H14l.37-1.38c.12-.38.48-.62.88-.62h.75c.55 0 1 .45 1 1v1h2c.55 0 1 .45 1 1s-.45 1-1 1h-1.02l-.76 12.1c-.05.83-.74 1.48-1.57 1.48H7.35c-.83 0-1.52-.65-1.57-1.48L5 7H4c-.55 0-1-.45-1-1s.45-1 1-1h2V4c0-.55.45-1 1-1h.75zm1.1 4l.58 10.5h1.64L11.74 7h-1.64zm4.56 0l-.58 10.5h1.64L15.3 7h-1.64z"
      ]));
      lightboxDelete.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (lightboxCurrent) {
          removePreview(lightboxCurrent.wrapper, lightboxCurrent.anchor, true);
        }
        closeLightbox();
      });

      lightboxClose = document.createElement("button");
      lightboxClose.type = "button";
      lightboxClose.className = "dhi-lightbox-btn";
      lightboxClose.setAttribute("aria-label", "Close preview");
      lightboxClose.appendChild(createIcon([
        "M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4l-4.9-4.9 4.9-4.9a1 1 0 0 0 0-1.4z"
      ]));
      lightboxClose.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeLightbox();
      });

      lightboxControls.appendChild(lightboxDownload);
      lightboxControls.appendChild(lightboxDelete);
      lightboxControls.appendChild(lightboxClose);
      lightbox.appendChild(lightboxControls);
      lightbox.appendChild(lightboxImg);
      (document.body || document.documentElement).appendChild(lightbox);

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeLightbox();
      });
    }

    function openLightbox(img, wrapper, anchor) {
      ensureLightbox();
      lightboxCurrent = { wrapper: wrapper, anchor: anchor, fileUrl: img.src, name: img.alt };
      lightboxImg.src = img.src;
      lightbox.classList.add("open");
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove("open");
    }

    function removePreview(wrapper, anchor, hideLink) {
      if (wrapper && wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
      if (anchor) {
        anchor.dataset.dhiIgnored = "1";
        if (!anchor.dataset.dhiPrevDisplay) {
          anchor.dataset.dhiPrevDisplay = anchor.style.display || "";
        }
        if (hideLink) {
          anchor.style.display = "none";
        } else {
          anchor.style.display = anchor.dataset.dhiPrevDisplay;
        }
      }
    }

    function createIcon(paths) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      for (const pathD of paths) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathD);
        path.setAttribute("fill", "currentColor");
        svg.appendChild(path);
      }
      return svg;
    }

    function triggerDownload(fileUrl, name) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = name || "file";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    function hasVisibleAnchorText(anchor) {
      if (!anchor || typeof anchor.textContent !== "string") return false;
      return anchor.textContent.trim().length > 0;
    }

    function removeOriginalFileCard(host) {
      if (!host || !host.querySelector) return;
      const card = host.querySelector(".file__0ccae");
      if (card && card.parentElement) card.parentElement.removeChild(card);
    }

    function findPreviewHost(anchor) {
      if (!anchor || !anchor.closest) return null;
      return anchor.closest(".fileWrapper__0ccae") || anchor.closest(".mosaicItemContent__6c706");
    }

    function findMessageContentHost(anchor) {
      if (!anchor || !anchor.closest) return null;
      let host = anchor.closest("[id^='message-content-']");
      if (host) return host;
      host = anchor.closest("[class*='messageContent']");
      if (host) return host;
      host = anchor.closest("[class*='markup']");
      if (host) return host;
      const root = anchor.closest("[data-list-item-id]");
      if (!root || !root.querySelector) return null;
      return (
        root.querySelector("[id^='message-content-']") ||
        root.querySelector("[class*='messageContent']") ||
        root.querySelector("[class*='markup']")
      );
    }

    function hideAttachmentAnchor(anchor) {
      if (!anchor) return;
      anchor.dataset.dhiIgnored = "1";
      if (!anchor.dataset.dhiPrevDisplay) {
        anchor.dataset.dhiPrevDisplay = anchor.style.display || "";
      }
      anchor.style.display = "none";
    }

    function hasTextPreview(host, key) {
      if (!host || !key) return false;
      const set = textPreviewByHost.get(host);
      if (!set) return false;
      return set.has(key);
    }

    function markTextPreview(host, key) {
      if (!host || !key) return;
      let set = textPreviewByHost.get(host);
      if (!set) {
        set = new Set();
        textPreviewByHost.set(host, set);
      }
      set.add(key);
    }

    function buildTextPreview(text) {
      const wrapper = document.createElement("div");
      wrapper.className = "dhi-text-preview";
      if (text.length <= TEXT_PREVIEW_LIMIT) {
        wrapper.textContent = text;
        return wrapper;
      }

      const content = document.createElement("span");
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "dhi-text-toggle";
      toggle.textContent = "Show more...";

      let offset = 0;
      function appendNextChunk() {
        const nextEnd = Math.min(offset + TEXT_PREVIEW_LIMIT, text.length);
        content.textContent += text.slice(offset, nextEnd);
        offset = nextEnd;
        if (offset >= text.length) {
          ellipsis.remove();
          toggle.remove();
        }
      }

      appendNextChunk();
      wrapper.appendChild(content);
      wrapper.appendChild(ellipsis);
      wrapper.appendChild(toggle);

      toggle.addEventListener("click", function () {
        appendNextChunk();
      });

      return wrapper;
    }

    async function processHiddenMessageAnchor(anchor) {
      if (USE_ACCESSORY_PREVIEW) return;
      if (!state.enabled) return;
      if (!anchor || anchor.dataset.dhiTextIgnored === "1") return;
      if (anchor.dataset.dhiTextProcessed === "failed") {
        const failedAt = parseInt(anchor.dataset.dhiTextFailedAt || "0", 10);
        if (!failedAt || Date.now() - failedAt < FETCH_FAIL_TTL) return;
        delete anchor.dataset.dhiTextProcessed;
        delete anchor.dataset.dhiTextFailedAt;
      }
      if (anchor.dataset.dhiTextProcessed) return;
      const url = anchor.href;
      if (!url) return;
      anchor.dataset.dhiTextProcessed = "pending";

      const buffer = await fetchAttachmentBuffer([url]);
      if (!buffer) {
        anchor.dataset.dhiTextProcessed = "failed";
        anchor.dataset.dhiTextFailedAt = String(Date.now());
        debugLog("Failed to fetch hidden message", { name: extractFilenameFromUrl(url) });
        return;
      }
      const decoded = decodeHiddenMessageFileBytes(new Uint8Array(buffer));
      if (decoded === null) {
        anchor.dataset.dhiTextProcessed = "failed";
        anchor.dataset.dhiTextFailedAt = String(Date.now());
        debugLog("Failed to decode hidden message", { name: extractFilenameFromUrl(url) });
        return;
      }

      const parsed = parseMetaPayload(decoded);
      const text = parsed.text || "";
      ensureAttachmentStyles();
      const wrapper = document.createElement("div");
      wrapper.className = "dhi-text-preview";
      wrapper.textContent = text;

      const host = findPreviewHost(anchor);
      const messageHost = findMessageContentHost(anchor);
      const parent = messageHost || host || anchor.parentElement || anchor;
      const previewKey = messageHost || host || anchor.parentElement || anchor;
      if (previewKey && previewKey.dataset && previewKey.dataset.dhiTextPreviewAttached === "1") {
        hideAttachmentAnchor(anchor);
        removeOriginalFileCard(host || parent);
        anchor.dataset.dhiTextProcessed = "1";
        return;
      }
      if (messageHost) messageHost.textContent = "";
      parent.appendChild(wrapper);
      if (previewKey && previewKey.dataset) previewKey.dataset.dhiTextPreviewAttached = "1";
      hideAttachmentAnchor(anchor);
      removeOriginalFileCard(host || parent);
      anchor.dataset.dhiTextProcessed = "1";
    }

    async function processEncryptedAnchor(anchor) {
      if (USE_ACCESSORY_PREVIEW) return;
      if (!state.enabled) return;
      if (!anchor || anchor.dataset.dhiIgnored === "1") return;
      if (isHiddenMessageUrl(anchor.href || "")) {
        processHiddenMessageAnchor(anchor);
        return;
      }
      if (anchor.dataset.dhiProcessed === "failed") {
        const failedAt = parseInt(anchor.dataset.dhiFailedAt || "0", 10);
        if (!failedAt || Date.now() - failedAt < FETCH_FAIL_TTL) return;
        delete anchor.dataset.dhiProcessed;
        delete anchor.dataset.dhiFailedAt;
      }
      if (anchor.dataset.dhiProcessed) return;
      const url = anchor.href;
      if (!url) return;
      const meta = getMetaForUrl(url);
      if (!meta && !isEncryptedAttachmentUrl(url)) return;
      anchor.dataset.dhiProcessed = "pending";

      const decrypted = await getDecryptedAttachmentUrl(url, meta);
      if (!decrypted) {
        anchor.dataset.dhiProcessed = "failed";
        anchor.dataset.dhiFailedAt = String(Date.now());
        debugLog("Failed to decrypt attachment", { name: extractFilenameFromUrl(url) });
        return;
      }
      anchor.dataset.dhiProcessed = "1";

      anchor.href = decrypted.url;
      anchor.download = decrypted.name || "file";

      if (typeof decrypted.text === "string" && isTextAttachment(decrypted.mime, decrypted.name)) {
        ensureAttachmentStyles();
        const wrapper = buildTextPreview(decrypted.text);
        const host = findPreviewHost(anchor);
        const messageHost = findMessageContentHost(anchor);
        const parent = messageHost || host || anchor.parentElement || anchor;
        const previewKey = messageHost || host || anchor.parentElement || anchor;
        const previewId = decrypted.url || url;

        if (hasTextPreview(previewKey, previewId)) {
          hideAttachmentAnchor(anchor);
          removeOriginalFileCard(host || parent);
          return;
        }

        if (messageHost && messageHost.textContent && messageHost.textContent.trim().length > 0) {
          wrapper.style.marginTop = "4px";
        } else if (messageHost) {
          messageHost.textContent = "";
        }
        parent.appendChild(wrapper);
        markTextPreview(previewKey, previewId);
        hideAttachmentAnchor(anchor);
        removeOriginalFileCard(host || parent);
        return;
      }

      if (decrypted.mime && decrypted.mime.indexOf("image/") === 0) {
        ensureAttachmentStyles();
        const img = document.createElement("img");
        img.className = "dhi-preview";
        img.src = decrypted.url;
        img.alt = decrypted.name || "image";
        img.loading = "lazy";
        img.style.opacity = "1";
        img.style.transform = "none";
        img.style.filter = "none";
        img.style.transition = "none";

        const wrapper = document.createElement("div");
        wrapper.className = "dhi-preview-wrap";

        wrapper.appendChild(img);

        img.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          openLightbox(img, wrapper, anchor);
        });

        const host = findPreviewHost(anchor);
        const parent = host || anchor.parentElement || anchor;
        const previewKey = host || anchor.parentElement || anchor;
        const previewAttached = !!(previewKey && previewKey.dataset && previewKey.dataset.dhiPreviewAttached === "1");
        const canAttachPreview = !previewAttached && hasVisibleAnchorText(anchor);
        if (canAttachPreview) {
          if (!anchor.dataset.dhiPrevDisplay) {
            anchor.dataset.dhiPrevDisplay = anchor.style.display || "";
          }
          anchor.style.display = "none";
          parent.appendChild(wrapper);
          if (previewKey && previewKey.dataset) previewKey.dataset.dhiPreviewAttached = "1";
          removeOriginalFileCard(host || parent);
        }
      }
    }

    function scanForEncryptedAnchors(root) {
      if (!root) return;
      if (root.nodeType === 1) {
        const element = root;
        if (element.tagName === "A") processEncryptedAnchor(element);
        const anchors = element.querySelectorAll ? element.querySelectorAll("a[href]") : [];
        for (const anchor of anchors) {
          processEncryptedAnchor(anchor);
        }
      }
    }

    function startAttachmentObserver() {
      const target = document.body || document.documentElement;
      if (!target) {
        setTimeout(startAttachmentObserver, 200);
        return;
      }

      scanForEncryptedAnchors(target);

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            scanForEncryptedAnchors(node);
          }
        }
      });

      observer.observe(target, { childList: true, subtree: true });
    }

    function findMessageRoot(message) {
      if (!message || !message.id) return null;
      const root = document.querySelector("[data-list-item-id*='" + message.id + "']");
      if (root) return root;
      const content = document.getElementById("message-content-" + message.id);
      if (content) return content.closest("[data-list-item-id]") || content.parentElement;
      return null;
    }

    function hideOriginalAttachmentsForMessage(message) {
      if (!message || !Array.isArray(message.attachments) || message.attachments.length === 0) return;

      const urlSet = new Set();
      for (const attachment of message.attachments) {
        if (!attachment) continue;
        if (attachment.url) urlSet.add(normalizeUrlNoQuery(attachment.url));
        if (attachment.proxy_url) urlSet.add(normalizeUrlNoQuery(attachment.proxy_url));
      }
      if (urlSet.size === 0) return;

      const root = findMessageRoot(message) || document;
      const anchors = root.querySelectorAll ? root.querySelectorAll("a[href]") : [];
      for (const anchor of anchors) {
        if (!anchor || !anchor.href) continue;
        const hrefKey = normalizeUrlNoQuery(anchor.href);
        if (!urlSet.has(hrefKey)) continue;
        if (anchor.dataset && anchor.dataset.dhiHidden === "1") continue;
        hideAttachmentAnchor(anchor);
        const host = findPreviewHost(anchor);
        removeOriginalFileCard(host);
        if (anchor.dataset) anchor.dataset.dhiHidden = "1";
      }
    }

    function AttachmentTextPreview(props) {
      const text = props.text || "";
      const [expanded, setExpanded] = useState(false);
      if (text.length <= TEXT_PREVIEW_LIMIT) {
        return React.createElement("div", { className: "dhi-text-preview" }, text);
      }

      const displayText = expanded ? text : text.slice(0, TEXT_PREVIEW_LIMIT);
      return React.createElement(
        "div",
        { className: "dhi-text-preview" },
        React.createElement("span", null, displayText + (expanded ? "" : "...")),
        !expanded
          ? React.createElement(
            "button",
            {
              type: "button",
              className: "dhi-text-toggle",
              onClick: function () {
                setExpanded(true);
              }
            },
            "Show more..."
          )
          : null
      );
    }

    function HiddenInkAccessory(props) {
      const message = props && props.message ? props.message : null;
      const [items, setItems] = useState([]);

      useEffect(
        function () {
          let cancelled = false;

          async function load() {
            if (!state.enabled) {
              if (!cancelled) setItems([]);
              return;
            }
            if (!message || !Array.isArray(message.attachments) || message.attachments.length === 0) {
              if (!cancelled) setItems([]);
              return;
            }

            const previews = [];
            for (const attachment of message.attachments) {
              const url = attachment && (attachment.url || attachment.proxy_url);
              if (!url) continue;

              if (isHiddenMessageUrl(url)) {
                const buffer = await fetchAttachmentBuffer([url]);
                if (!buffer) continue;
                const decoded = decodeHiddenMessageFileBytes(new Uint8Array(buffer));
                if (decoded === null) continue;
                const parsed = parseMetaPayload(decoded);
                previews.push({
                  kind: "text",
                  key: url,
                  text: parsed.text || "",
                  name: attachment.filename || "hidden-message"
                });
                continue;
              }

              const meta = getMetaForUrl(url);
              if (!meta && !isEncryptedAttachmentUrl(url)) continue;

              const decrypted = await getDecryptedAttachmentUrl(url, meta);
              if (!decrypted) continue;

              if (typeof decrypted.text === "string" && isTextAttachment(decrypted.mime, decrypted.name)) {
                previews.push({
                  kind: "text",
                  key: url,
                  text: decrypted.text,
                  name: decrypted.name || attachment.filename || "text"
                });
                continue;
              }

              if (decrypted.mime && decrypted.mime.indexOf("image/") === 0) {
                previews.push({
                  kind: "image",
                  key: url,
                  url: decrypted.url,
                  name: decrypted.name || attachment.filename || "image"
                });
                continue;
              }

              previews.push({
                kind: "file",
                key: url,
                url: decrypted.url,
                name: decrypted.name || attachment.filename || "file",
                mime: decrypted.mime || "application/octet-stream"
              });
            }

            if (!cancelled) {
              if (previews.length > 0) {
                ensureAttachmentStyles();
                requestAnimationFrame(function () {
                  hideOriginalAttachmentsForMessage(message);
                });
              }
              setItems(previews);
            }
          }

          load();
          return function () {
            cancelled = true;
          };
        },
        [
          message ? message.id : "",
          message && Array.isArray(message.attachments) ? message.attachments.length : 0,
          state.sharedKey,
          state.enabled
        ]
      );

      if (!items || items.length === 0) return null;

      return React.createElement(
        "div",
        { className: "dhi-accessory" },
        items.map(function (item) {
          if (item.kind === "image") {
            return React.createElement(
              "div",
              { className: "dhi-preview-wrap", key: item.key },
              React.createElement("img", {
                className: "dhi-preview",
                src: item.url,
                alt: item.name || "image",
                loading: "lazy"
              })
            );
          }

          if (item.kind === "text") {
            return React.createElement(
              AttachmentTextPreview,
              {
                key: item.key,
                text: item.text || ""
              }
            );
          }

          return React.createElement(
            "a",
            {
              key: item.key,
              className: "dhi-accessory-link",
              href: item.url,
              download: item.name || "file",
              rel: "noopener"
            },
            "Download decrypted file",
            item.name ? " (" + item.name + ")" : ""
          );
        })
      );
    }

    // === Mention preservation ===
    const MENTION_REGEX = /<@!?\d+>|<@&\d+>|<#\d+>|@everyone|@here/g;

    function extractVisibleMentions(content) {
      const tokens = [];
      let match;
      MENTION_REGEX.lastIndex = 0;
      while ((match = MENTION_REGEX.exec(content)) !== null) {
        const token = match[0];
        if (token === "@everyone" || token === "@here") {
          const prev = content[match.index - 1];
          const next = content[match.index + token.length];
          if ((prev && /[A-Za-z0-9_]/.test(prev)) || (next && /[A-Za-z0-9_]/.test(next))) {
            continue;
          }
        }
        tokens.push(token);
      }
      return tokens;
    }

    function encodeOutgoingContentWithOverflow(content, meta) {
      const safeContent = typeof content === "string" ? content : "";
      const hasMeta = meta && meta.files && Object.keys(meta.files).length > 0;
      if (!hasMeta && safeContent.length === 0) return { content: content, overflow: null };

      const encoded = encodeOutgoingContent(safeContent, meta);
      if (typeof encoded !== "string") return { content: encoded, overflow: null };
      if (encoded.length <= MAX_MESSAGE_LENGTH) return { content: encoded, overflow: null };

      const metaPrefix = hasMeta ? buildMetaPayload(meta) : "";
      const payloadText = metaPrefix + safeContent;
      const fileBytes = buildHiddenMessageFileBytes(payloadText);
      if (!fileBytes) return { content: encoded, overflow: null };

      const mentions = extractVisibleMentions(safeContent);
      let hiddenMeta = "";
      if (hasMeta) hiddenMeta = encodeOutgoingContent("", meta);

      let fallback = mentions.join(" ");
      if (hiddenMeta) fallback = fallback ? fallback + " " + hiddenMeta : hiddenMeta;
      if (fallback.length > MAX_MESSAGE_LENGTH) {
        debugLog("Overflow content still too long", { mentionCount: mentions.length, metaLength: hiddenMeta.length });
        fallback = mentions.join(" ");
      }

      return {
        content: fallback,
        overflow: {
          bytes: fileBytes,
          filename: buildHiddenMessageFilename()
        }
      };
    }

    function encodeOutgoingContent(content, meta) {
      const safeContent = typeof content === "string" ? content : "";
      const hasMeta = meta && meta.files && Object.keys(meta.files).length > 0;
      if (!hasMeta && safeContent.length === 0) return content;
      if (!hasMeta && codec.hasPayload(safeContent)) return content;
      if (!hasMeta) {
        for (const legacy of legacyCodecs) {
          if (legacy.hasPayload(safeContent)) return content;
        }
      }

      const mentions = extractVisibleMentions(safeContent);
      const metaPrefix = hasMeta ? buildMetaPayload(meta) : "";
      const payloadText = metaPrefix + safeContent;
      const keyText = getSharedKey();
      let hidden;
      if (keyText) {
        const encryptedBytes = buildEncryptedTextPayloadBinary(payloadText);
        if (encryptedBytes) {
          hidden = codec.encodeBytes(encryptedBytes);
        } else {
          hidden = codec.encode(payloadText);
        }
      } else {
        hidden = codec.encode(payloadText);
      }
      debugLog("Encoded outgoing content", { hasMeta: hasMeta, metaLength: metaPrefix.length, contentLength: safeContent.length });

      if (mentions.length === 0) return hidden;
      return mentions.join(" ") + " " + hidden;
    }

    function decodeIncomingContent(content) {
      if (typeof content !== "string" || content.length === 0) return null;
      const decodedBytes = codec.decodeBytesFromContent(content);
      if (decodedBytes) {
        const parsedBinary = parseEncryptedTextPayloadBinary(decodedBytes);
        if (parsedBinary) {
          const decrypted = decryptEncryptedTextPayloadBinary(parsedBinary);
          if (decrypted === null) return null;
          return parseMetaPayload(decrypted);
        }
      }
      const decoded = codec.decodeFromContent(content);
      if (decoded !== null) return decodePayloadText(decoded);
      for (const legacy of legacyCodecs) {
        const fallback = legacy.decodeFromContent(content);
        if (fallback !== null) return decodePayloadText(fallback);
      }
      return null;
    }

    function getNextAttachmentId(payload, form) {
      let maxId = -1;
      if (payload && Array.isArray(payload.attachments)) {
        for (const attachment of payload.attachments) {
          const id = parseInt(attachment && attachment.id, 10);
          if (!Number.isNaN(id)) maxId = Math.max(maxId, id);
        }
      }
      if (form && typeof form.entries === "function") {
        for (const entry of form.entries()) {
          const keyName = entry[0];
          const match = typeof keyName === "string" ? keyName.match(/^files\[(\d+)\]$/) : null;
          if (!match) continue;
          const id = parseInt(match[1], 10);
          if (!Number.isNaN(id)) maxId = Math.max(maxId, id);
        }
      }
      return maxId + 1;
    }

    function buildOverflowFormData(payload, overflow) {
      if (!overflow || !overflow.bytes) return null;
      const form = new FormData();
      const attachmentId = getNextAttachmentId(payload, null);
      const filename = overflow.filename || buildHiddenMessageFilename();
      const blob = new Blob([overflow.bytes], { type: DNI_FILE_MIME });

      if (!payload.attachments || !Array.isArray(payload.attachments)) {
        payload.attachments = [];
      }
      payload.attachments.push({ id: attachmentId, filename: filename });
      form.append("files[" + attachmentId + "]", blob, filename);
      form.append("payload_json", JSON.stringify(payload));
      return form;
    }

    // === Payload transformers ===
    function transformJsonString(body) {
      try {
        const payload = JSON.parse(body);
        const info = { overflow: null };
        const updated = transformOutgoingPayload(payload, info);
        if (info.overflow) return buildOverflowFormData(updated, info.overflow);
        return JSON.stringify(updated);
      } catch (_) {
        return null;
      }
    }

    function transformAttachmentsJsonString(body) {
      try {
        const payload = JSON.parse(body);
        const updated = transformAttachmentsRequestPayload(payload);
        return JSON.stringify(updated);
      } catch (_) {
        return null;
      }
    }

    function transformOutgoingPayload(payload, options) {
      if (!payload || typeof payload !== "object") return payload;
      const attachmentMeta = buildAttachmentMetaForPayload(payload);
      if (Array.isArray(payload.attachments) && attachmentMeta && attachmentMeta.files) {
        for (const attachment of payload.attachments) {
          if (!attachment || typeof attachment !== "object") continue;
          const key = attachment.uploaded_filename || attachment.filename;
          const meta = key ? attachmentMeta.files[key] : null;
          if (meta && attachment.filename && attachment.filename.toLowerCase().endsWith(ENCRYPTED_EXTENSION)) {
            attachment.content_type = "application/octet-stream";
          }
        }
      }

      if (typeof payload.content === "string" || attachmentMeta) {
        const result = encodeOutgoingContentWithOverflow(payload.content || "", attachmentMeta);
        if (typeof result.content === "string" && result.content !== payload.content) {
          payload.content = result.content;
        }
        if (options) options.overflow = result.overflow || null;
      }
      return payload;
    }

    function decodeMessageObject(msg) {
      if (!msg || typeof msg !== "object") return false;
      if (typeof msg.content !== "string") return false;
      const decoded = decodeIncomingContent(msg.content);
      if (decoded === null) return false;
      msg.content = decoded.text;
      if (decoded.meta) registerAttachmentMetaFromMessage(msg, decoded.meta);
      return true;
    }

    function getMessageChannelId(msg, fallback) {
      return (msg && (msg.channel_id || msg.channelId)) || fallback || null;
    }

    function decodeMessageAndUpdate(msg, fallbackChannelId) {
      const changed = decodeMessageObject(msg);
      if (!changed) return false;
      const channelId = getMessageChannelId(msg, fallbackChannelId);
      const messageId = msg && msg.id;
      if (channelId && messageId) {
        updateMessage(channelId, messageId, { content: msg.content });
      }
      return true;
    }

    function decodeMessageList(messages, fallbackChannelId) {
      if (!Array.isArray(messages)) return false;
      let changed = false;
      for (const item of messages) {
        if (Array.isArray(item)) {
          if (decodeMessageList(item, fallbackChannelId)) changed = true;
          continue;
        }
        if (decodeMessageAndUpdate(item, fallbackChannelId)) changed = true;
      }
      return changed;
    }

    function decodeFluxAction(action) {
      if (!state.enabled || !action || typeof action !== "object") return false;
      let changed = false;
      const fallbackChannelId = action.channelId || action.channel_id || null;

      if (action.message) {
        if (decodeMessageAndUpdate(action.message, fallbackChannelId)) changed = true;
      }
      if (action.message && action.message.message) {
        if (decodeMessageAndUpdate(action.message.message, fallbackChannelId)) changed = true;
      }
      if (Array.isArray(action.messages)) {
        if (decodeMessageList(action.messages, fallbackChannelId)) changed = true;
      }
      if (action.data && Array.isArray(action.data.messages)) {
        if (decodeMessageList(action.data.messages, fallbackChannelId)) changed = true;
      }
      if (action.d && Array.isArray(action.d.messages)) {
        if (decodeMessageList(action.d.messages, fallbackChannelId)) changed = true;
      }

      return changed;
    }

    function decodeMessagesInPayload(payload) {
      let changed = false;
      if (Array.isArray(payload)) {
        for (const msg of payload) {
          if (decodeMessageObject(msg)) changed = true;
        }
        return changed;
      }

      if (payload && payload.d) {
        const data = payload.d;
        if (Array.isArray(data.messages)) {
          for (const group of data.messages) {
            if (Array.isArray(group)) {
              for (const msg of group) {
                if (decodeMessageObject(msg)) changed = true;
              }
            } else if (decodeMessageObject(group)) {
              changed = true;
            }
          }
        } else if (decodeMessageObject(data)) {
          changed = true;
        }
      }

      if (payload && Array.isArray(payload.messages)) {
        for (const group of payload.messages) {
          if (Array.isArray(group)) {
            for (const msg of group) {
              if (decodeMessageObject(msg)) changed = true;
            }
          } else if (decodeMessageObject(group)) {
            changed = true;
          }
        }
        return changed;
      }

      if (decodeMessageObject(payload)) changed = true;
      return changed;
    }

    // === Fetch patch ===
    const originalFetch = window.fetch;

    function getUrl(input) {
      return typeof input === "string" ? input : input.url;
    }

    function getMethod(input, init) {
      if (init && init.method) return init.method.toUpperCase();
      if (input && input.method) return String(input.method).toUpperCase();
      return "GET";
    }

    function getPath(url) {
      try {
        return new URL(url, location.href).pathname;
      } catch (_) {
        return "";
      }
    }

    function isMessageEndpoint(path) {
      return /\/api\/v\d+\/channels\/\d+\/messages(\/\d+)?$/.test(path);
    }

    function isMessageSearchEndpoint(path) {
      return /\/api\/v\d+\/channels\/\d+\/messages\/search$/.test(path);
    }

    function isAttachmentsEndpoint(path) {
      return /\/api\/v\d+\/channels\/\d+\/attachments$/.test(path);
    }

    function shouldInterceptOutgoing(path, method) {
      return isMessageEndpoint(path) && (method === "POST" || method === "PATCH");
    }

    function shouldInterceptIncoming(path, method) {
      if (method !== "GET") return false;
      return isMessageEndpoint(path) || isMessageSearchEndpoint(path);
    }

    async function transformFetchRequest(input, init) {
      if (!state.enabled) return { input, init };
      const method = getMethod(input, init);
      const url = getUrl(input);
      const path = getPath(url);

      const urlKey = normalizeUrlKey(url);
      const urlKeyNoQuery = normalizeUrlNoQuery(url);
      if (method === "PUT") {
        const meta = pendingUploadsByUrl.get(urlKey) || pendingUploadsByUrl.get(urlKeyNoQuery);
        if (meta) {
          debugLog("Intercept PUT upload", { id: meta.id });
          const body = init && init.body ? init.body : null;
          if (body) {
            const cipher = await encryptUploadBody(body, meta);
            if (cipher) {
              const newInit = Object.assign({}, init, { body: cipher });
              if (meta.uploadFilename || meta.dhiName) {
                pendingMetaByFilename.set(meta.uploadFilename || meta.dhiName, meta);
              }
              pendingUploadsByUrl.delete(urlKey);
              pendingUploadsByUrl.delete(urlKeyNoQuery);
              return { input, init: newInit };
            }
          }

          if (typeof Request !== "undefined" && input instanceof Request) {
            try {
              const buffer = await readBodyAsArrayBuffer(input);
              const cipher = await encryptUploadBody(buffer, meta);
              if (cipher) {
                const newRequest = cloneRequestWithBody(input, cipher);
                if (meta.uploadFilename || meta.dhiName) {
                  pendingMetaByFilename.set(meta.uploadFilename || meta.dhiName, meta);
                }
                pendingUploadsByUrl.delete(urlKey);
                pendingUploadsByUrl.delete(urlKeyNoQuery);
                return { input: newRequest, init };
              }
            } catch (_) {
              return { input, init };
            }
          }
        }
      }

      if (isAttachmentsEndpoint(path) && method === "POST") {
        debugLog("Intercept /attachments POST");
        const body = init && init.body ? init.body : null;
        if (body && typeof body === "string") {
          const newBody = transformAttachmentsJsonString(body);
          if (!newBody) return { input, init };
          const newInit = Object.assign({}, init, { body: newBody });
          return { input, init: newInit };
        }

        if (typeof Request !== "undefined" && input instanceof Request) {
          try {
            const text = await input.clone().text();
            const newBody = transformAttachmentsJsonString(text);
            if (!newBody) return { input, init };
            const newRequest = new Request(input, { body: newBody });
            return { input: newRequest, init };
          } catch (_) {
            return { input, init };
          }
        }
      }

      if (!shouldInterceptOutgoing(path, method)) return { input, init };

      const body = init && init.body ? init.body : null;
      if (body) {
        if (typeof body === "string") {
          const newBody = transformJsonString(body);
          if (!newBody) return { input, init };
          const newInit = Object.assign({}, init, { body: newBody });
          if (newBody instanceof FormData) stripContentType(newInit.headers);
          return { input, init: newInit };
        }

        if (body instanceof FormData) {
          const newForm = await encryptFormData(body);
          const newInit = Object.assign({}, init, { body: newForm });
          stripContentType(newInit.headers);
          return { input, init: newInit };
        }

        return { input, init };
      }

      if (typeof Request !== "undefined" && input instanceof Request) {
        const request = input;
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data") && request.formData) {
          try {
            const form = await request.clone().formData();
            const newForm = await encryptFormData(form);
            const headers = new Headers(request.headers);
            stripContentType(headers);
            const newRequest = new Request(request, { body: newForm, headers: headers });
            return { input: newRequest, init };
          } catch (_) {
            return { input, init };
          }
        }

        try {
          const text = await request.clone().text();
          const newBody = transformJsonString(text);
          if (!newBody) return { input, init };
          if (newBody instanceof FormData) {
            const headers = new Headers(request.headers);
            stripContentType(headers);
            const newRequest = new Request(request, { body: newBody, headers: headers });
            return { input: newRequest, init };
          }
          const newRequest = new Request(request, { body: newBody });
          return { input: newRequest, init };
        } catch (_) {
          return { input, init };
        }
      }

      return { input, init };
    }

    async function transformFetchResponse(response, url, method) {
      if (!state.enabled) return response;
      const path = getPath(url);
      if (isAttachmentsEndpoint(path) && method === "POST") {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return response;

        const clone = response.clone();
        let data;
        try {
          data = await clone.json();
        } catch (_) {
          return response;
        }

        registerAttachmentsResponse(data);
        const body = JSON.stringify(data);
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers)
        });
      }

      if (!shouldInterceptIncoming(path, method)) return response;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return response;

      const clone = response.clone();
      let data;
      try {
        data = await clone.json();
      } catch (_) {
        return response;
      }

      const changed = decodeMessagesInPayload(data);
      if (!changed) return response;

      const newHeaders = new Headers(response.headers);
      const body = JSON.stringify(data);
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    window.fetch = async function (input, init) {
      const { input: newInput, init: newInit } = await transformFetchRequest(input, init);
      const response = await originalFetch.call(this, newInput, newInit);
      const url = getUrl(newInput);
      const method = getMethod(newInput, newInit);
      return transformFetchResponse(response, url, method);
    };

    // === JSON.parse patch (decode gateway payloads) ===
    const originalJSONParse = JSON.parse;
    JSON.parse = function (text, reviver) {
      const result = originalJSONParse.call(this, text, reviver);
      if (!state.enabled) return result;
      if (result && (typeof result === "object" || Array.isArray(result))) {
        try {
          registerAttachmentsResponse(result);
          decodeMessagesInPayload(result);
        } catch (_) {
          // ignore
        }
      }
      return result;
    };

    // === XHR patch (encode outgoing) ===
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const xhrMeta = new WeakMap();

    XMLHttpRequest.prototype.open = function (method, url) {
      xhrMeta.set(this, {
        method: String(method || "GET").toUpperCase(),
        url: url,
        headers: [],
        headersApplied: false
      });
      return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      const meta = xhrMeta.get(this);
      if (meta) {
        meta.headers.push([name, value]);
        return;
      }
      return originalXHRSetRequestHeader.call(this, name, value);
    };

    function applyXhrHeaders(xhr, meta, skipContentType) {
      if (!meta || meta.headersApplied) return;
      if (meta.headers && meta.headers.length > 0) {
        for (const pair of meta.headers) {
          const name = pair[0];
          const value = pair[1];
          if (skipContentType && name && String(name).toLowerCase() === "content-type") continue;
          originalXHRSetRequestHeader.call(xhr, name, value);
        }
      }
      meta.headersApplied = true;
    }

    function sendXhrWithHeaders(xhr, meta, body, skipContentType) {
      applyXhrHeaders(xhr, meta, !!skipContentType);
      return originalXHRSend.call(xhr, body);
    }

    function transformXhrBody(body) {
      if (!state.enabled) return body;
      if (typeof body === "string") {
        const newBody = transformJsonString(body);
        if (!newBody) return body;
        return newBody;
      }
      return body;
    }

    XMLHttpRequest.prototype.send = function (body) {
      const meta = xhrMeta.get(this);
      if (meta && state.enabled) {
        const path = getPath(meta.url || "");
        const urlKey = normalizeUrlKey(meta.url || "");
        const urlKeyNoQuery = normalizeUrlNoQuery(meta.url || "");

        if (isAttachmentsEndpoint(path) && meta.method === "POST") {
          const xhr = this;
          debugLog("Intercept /attachments POST (XHR)");
          xhr.addEventListener(
            "load",
            function () {
              try {
                if (xhr.responseType === "json" && xhr.response) {
                  registerAttachmentsResponse(xhr.response);
                } else if (!xhr.responseType || xhr.responseType === "text") {
                  if (xhr.responseText) {
                    registerAttachmentsResponse(JSON.parse(xhr.responseText));
                  }
                }
              } catch (_) {
                // ignore
              }
            },
            { once: true }
          );
        }

        if (meta.method === "PUT" && (pendingUploadsByUrl.has(urlKey) || pendingUploadsByUrl.has(urlKeyNoQuery))) {
          const uploadMeta = pendingUploadsByUrl.get(urlKey) || pendingUploadsByUrl.get(urlKeyNoQuery);
          if (uploadMeta) {
            debugLog("Intercept PUT upload (XHR)", { id: uploadMeta.id });
            encryptUploadBody(body, uploadMeta)
              .then((cipher) => {
                if (cipher) {
                  if (uploadMeta.uploadFilename || uploadMeta.dhiName) {
                    pendingMetaByFilename.set(uploadMeta.uploadFilename || uploadMeta.dhiName, uploadMeta);
                  }
                  pendingUploadsByUrl.delete(urlKey);
                  pendingUploadsByUrl.delete(urlKeyNoQuery);
                  sendXhrWithHeaders(this, meta, cipher, false);
                } else {
                  debugLog("Encrypt upload body failed", { id: uploadMeta.id });
                  sendXhrWithHeaders(this, meta, body, body instanceof FormData);
                }
              })
              .catch((error) => {
                debugLog("Encrypt upload body exception", { id: uploadMeta.id, error: String(error) });
                sendXhrWithHeaders(this, meta, body, body instanceof FormData);
              });
            return;
          }
        }

        if (isAttachmentsEndpoint(path) && meta.method === "POST" && typeof body === "string") {
          const newBody = transformAttachmentsJsonString(body);
          return sendXhrWithHeaders(this, meta, newBody || body, false);
        }

        if (shouldInterceptOutgoing(path, meta.method)) {
          if (body instanceof FormData) {
            encryptFormData(body)
              .then((newForm) => sendXhrWithHeaders(this, meta, newForm, true))
              .catch(() => sendXhrWithHeaders(this, meta, body, true));
            return;
          }
          const updatedBody = transformXhrBody(body);
          return sendXhrWithHeaders(this, meta, updatedBody, updatedBody instanceof FormData);
        }
      }
      return sendXhrWithHeaders(this, meta, body, body instanceof FormData);
    };

    // === WebSocket patch (decode incoming messages) ===
    const originalWsAddEventListener = WebSocket.prototype.addEventListener;
    const originalWsRemoveEventListener = WebSocket.prototype.removeEventListener;
    const messageListenerMap = new WeakMap();

    function decodeWsDataString(dataStr) {
      let payload;
      try {
        payload = JSON.parse(dataStr);
      } catch (_) {
        return dataStr;
      }

      if (!payload || (payload.t !== "MESSAGE_CREATE" && payload.t !== "MESSAGE_UPDATE")) {
        return dataStr;
      }

      if (!payload.d || typeof payload.d.content !== "string") return dataStr;
      const decoded = decodeIncomingContent(payload.d.content);
      if (!decoded) return dataStr;
      payload.d.content = decoded.text;
      if (decoded.meta) registerAttachmentMetaFromMessage(payload.d, decoded.meta);
      return JSON.stringify(payload);
    }

    function wrapMessageListener(listener) {
      const existingWrap = messageListenerMap.get(listener);
      if (existingWrap) return existingWrap;

      const wrapped = function (event) {
        if (!state.enabled || !event || typeof event.data !== "string") return listener.call(this, event);
        const decoded = decodeWsDataString(event.data);
        if (decoded === event.data) return listener.call(this, event);
        const newEvent = new MessageEvent("message", {
          data: decoded,
          origin: event.origin,
          lastEventId: event.lastEventId,
          source: event.source,
          ports: event.ports
        });
        return listener.call(this, newEvent);
      };

      messageListenerMap.set(listener, wrapped);
      return wrapped;
    }

    WebSocket.prototype.addEventListener = function (type, listener, options) {
      if (type === "message" && typeof listener === "function") {
        return originalWsAddEventListener.call(this, type, wrapMessageListener(listener), options);
      }
      return originalWsAddEventListener.call(this, type, listener, options);
    };

    WebSocket.prototype.removeEventListener = function (type, listener, options) {
      if (type === "message" && typeof listener === "function") {
        const wrapped = messageListenerMap.get(listener);
        if (wrapped) {
          return originalWsRemoveEventListener.call(this, type, wrapped, options);
        }
      }
      return originalWsRemoveEventListener.call(this, type, listener, options);
    };

    const onMessageDescriptor = Object.getOwnPropertyDescriptor(WebSocket.prototype, "onmessage");
    if (onMessageDescriptor && onMessageDescriptor.set) {
      Object.defineProperty(WebSocket.prototype, "onmessage", {
        configurable: true,
        enumerable: true,
        get: function () {
          return onMessageDescriptor.get.call(this);
        },
        set: function (listener) {
          if (typeof listener === "function") {
            return onMessageDescriptor.set.call(this, wrapMessageListener(listener));
          }
          return onMessageDescriptor.set.call(this, listener);
        }
      });
    }

    startAttachmentObserver();

    if (win.__DISCORD_STEG__) {
      win.__DISCORD_STEG__.decodeFluxAction = decodeFluxAction;
      win.__DISCORD_STEG__.encryptUploads = encryptUploads;
      if (USE_ACCESSORY_PREVIEW) {
        win.__DISCORD_STEG__.renderMessageAccessory = HiddenInkAccessory;
      }
    }
  })();

  return win.__DISCORD_STEG__;
}

export default definePlugin({
  name: "DiscordHiddenInk",
  description: "Hide Discord messages using invisible encoding with optional shared-key encryption.",
  authors: [Devs.afang],
  settings,
  startAt: StartAt.Init,
  patches: [
    {
      find: "async uploadFiles(",
      replacement: {
        match: /async uploadFiles\((\i)\){/,
        replace: "$&await $self.encryptUploads($1);"
      }
    }
  ],
  flux: {
    MESSAGE_CREATE(action) {
      if (controller && controller.decodeFluxAction) controller.decodeFluxAction(action);
    },
    MESSAGE_UPDATE(action) {
      if (controller && controller.decodeFluxAction) controller.decodeFluxAction(action);
    },
    LOAD_MESSAGES_SUCCESS(action) {
      if (controller && controller.decodeFluxAction) controller.decodeFluxAction(action);
    },
    LOAD_MESSAGES(action) {
      if (controller && controller.decodeFluxAction) controller.decodeFluxAction(action);
    }
  },
  async encryptUploads(uploads) {
    if (controller && controller.encryptUploads) {
      await controller.encryptUploads(uploads);
    }
  },
  renderMessageAccessory(props) {
    if (controller && controller.renderMessageAccessory) {
      return React.createElement(controller.renderMessageAccessory, props);
    }
    return null;
  },
  start() {
    controller = installHiddenInk(settings.store.enabled, settings.store.sharedKey);

    if (typeof VencordNative !== "undefined" && VencordNative.csp) {
      const origins = ["https://cdn.discordapp.com", "https://media.discordapp.net"];
      origins.forEach((origin) => {
        VencordNative.csp.isDomainAllowed(origin, ["connect-src"]).then((allowed) => {
          if (allowed) return;
          VencordNative.csp.requestAddOverride(origin, ["connect-src"], "DiscordHiddenInk").then((result) => {
            if (result === "ok") {
              showToast("Hidden Ink: Allow CDN connect-src and restart Discord", Toasts.Type.MESSAGE);
            }
          });
        });
      });
    }
  },
  stop() {
    if (controller && controller.setEnabled) controller.setEnabled(false);
  }
});
