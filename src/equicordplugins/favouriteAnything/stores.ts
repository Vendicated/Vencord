/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazyWebpack } from "@webpack";
import { Constants, Flux, FluxDispatcher, RestAPI } from "@webpack/common";

import { RefreshedUrlsResponse } from "./types";
import { BatchedRequestQueue, isAllowedHost } from "./utils";

export interface SignedUrlsStoreType {
    get(url: string): string | null;
    addSigned(url: string): void;
}

/** Used for storing and automatically refreshing signed CDN/Media proxy urls ({@link https://docs.discord.food/reference#signed-attachment-urls}). */
export const SignedUrlsStore = proxyLazyWebpack(() => {
    class SignedUrlsStoreClass extends Flux.Store implements SignedUrlsStoreType {
        public static readonly _expirationThreshold = 60 * 60 * 1000;

        public _urls = new Map<string, string>();
        public _queue = new BatchedRequestQueue<string>(batch => this._handleBatch(batch), {
            maxCount: 50,
            timeout: 50
        });

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

        public _refresh(url: URL): void {
            this._queue.add(`${this._clean(url)}`);
        }

        public _clean(url: URL): URL {
            const clean = new URL(url);
            clean.search = "";
            clean.hash = "";
            return clean;
        }

        public _isValid(url: URL | null): url is URL {
            return !!(url && isAllowedHost(url.hostname));
        }

        public _willExpire(url: URL): boolean {
            const expiryTimestamp = parseInt(url.searchParams.get("ex")!, 16) * 1000;
            return isNaN(expiryTimestamp) || expiryTimestamp - SignedUrlsStoreClass._expirationThreshold < Date.now();
        }

        public _update(urls: [string, string][]): void {
            let hasChanged: boolean = false;

            for (const [url, value] of urls) {
                if (!value || url === value || this._urls.get(url) === value) continue;

                this._urls.set(url, value);
                hasChanged = true;
            }

            if (hasChanged) this.emitChange();
        }

        public async _handleBatch(batch: string[]): Promise<void> {
            await RestAPI.post({
                url: Constants.Endpoints.ATTACHMENTS_REFRESH_URLS,
                body: { attachment_urls: batch },
                retries: 3
            }).then(({ body }: { body: RefreshedUrlsResponse; }) =>
                this._update(body.refreshed_urls.map(({ original, refreshed }) => [original, refreshed!]))
            );
        }
    }

    return new SignedUrlsStoreClass(FluxDispatcher) as SignedUrlsStoreType;
});
