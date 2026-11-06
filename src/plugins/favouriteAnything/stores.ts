/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazyWebpack } from "@webpack";
import { Constants, Flux, FluxDispatcher, RestAPI } from "@webpack/common";

import { RefreshedUrlsResponse } from "./types";
import { BatchedRequestQueue, isAllowedHost } from "./utils";

/** Used for storing and automatically refreshing signed CDN/Media proxy urls ({@link https://docs.discord.food/reference#signed-attachment-urls}). */
export const SignedUrlsStore = proxyLazyWebpack(() => {
    class SignedUrlsStoreClass extends Flux.Store {
        public static readonly displayName = "SignedUrlsStore";
        private static readonly _expirationThreshold = 60 * 60 * 1000;

        private _urls = new Map<string, string>();
        private _queue = new BatchedRequestQueue<string>(batch => this._handleBatch(batch), {
            maxCount: 50,
            timeout: 50
        });

        // Makes debugging easier with discord devtools
        __getLocalVars() {
            return { urls: this._urls, queue: this._queue };
        }

        public get(url: string): string | null {
            const key = URL.parse(url);
            if (!this._isValid(key)) return null;

            const value = this._urls.get(`${this._clean(key)}`) ?? null;

            const parsed = URL.parse(value!);
            if (!parsed || this._willExpire(parsed)) this._refresh(key);

            return value;
        }

        public addSigned(url: string): void {
            const parsed = URL.parse(url);
            if (!this._isValid(parsed)) return;

            if (this._willExpire(parsed)) this._refresh(parsed);
            else this._update([[`${this._clean(parsed)}`, url]]);
        }

        private _refresh(url: URL): void {
            this._queue.add(`${this._clean(url)}`);
        }

        private _clean(url: URL): URL {
            const clean = new URL(url);
            clean.search = "";
            clean.hash = "";
            return clean;
        }

        private _isValid(url: URL | null): url is URL {
            return !!(url && isAllowedHost(url.hostname));
        }

        private _willExpire(url: URL): boolean {
            const expiryTimestamp = parseInt(url.searchParams.get("ex")!, 16) * 1000;
            return isNaN(expiryTimestamp) || expiryTimestamp - SignedUrlsStoreClass._expirationThreshold < Date.now();
        }

        private _update(urls: [string, string][]): void {
            let hasChanged: boolean = false;

            for (const [url, value] of urls) {
                if (!value || url === value || this._urls.get(url) === value) continue;

                this._urls.set(url, value);
                hasChanged = true;
            }

            if (hasChanged) this.emitChange();
        }

        private async _handleBatch(batch: string[]): Promise<void> {
            await RestAPI.post({ url: Constants.Endpoints.ATTACHMENTS_REFRESH_URLS, body: { attachment_urls: batch }, retries: 3 })
                .then(({ body }: { body: RefreshedUrlsResponse; }) =>
                    this._update(body.refreshed_urls.map(({ original, refreshed }) => [original, refreshed!]))
                );
        }
    }

    return new SignedUrlsStoreClass(FluxDispatcher);
});
