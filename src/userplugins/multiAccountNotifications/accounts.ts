/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { findByPropsLazy, findStoreLazy } from "@webpack";
import { UserStore } from "@webpack/common";

import { DiscordNotifier } from "./notifier";
import { Status } from "./types";

const { getToken } = findByPropsLazy("setToken");
const MultiAccountStore = findStoreLazy("MultiAccountStore");


export class Accounts extends EventTarget {
    state: {
        accounts: {
            id: string;
            status: Status;
            notifier: DiscordNotifier;
        }[];
        current: string;
    };

    checkStatus() {
        const stat = this.state.accounts.filter((v) => v.id !== this.state.current);
        if (stat.some((v) => v.status == "ping")) {
            this.dispatchEvent(new CustomEvent('state', { detail: { type: 'ping' } }));
            return;
        }
        if (stat.some((v) => v.status == "badge")) {
            this.dispatchEvent(new CustomEvent('state', { detail: { type: 'badge' } }));
            return;
        }
        this.dispatchEvent(new CustomEvent('state', { detail: { type: 'clear' } }));
    }

    handleEvents(ev: { status: Status; id: string; }) {
        const account = this.state.accounts.find((e) => e.id == ev.id);
        if (!account) {
            return;
        }
        account.status = ev.status;
        this.checkStatus();
    }

    constructor() {
        super();
        const currentUser = UserStore.getCurrentUser().id;
        this.state = { accounts: [], current: currentUser };
        const users = MultiAccountStore.getValidUsers();
        for (const user of users) {
            const account = {
                id: user.id,
                notifier: new DiscordNotifier(getToken(user.id)),
                status: "clear"
            } as const;
            account.notifier.addEventListener('state', ((e) => { this.handleEvents((e as any).detail); }));
            this.state.accounts.push(account);
        }
    }

    connect() {
        for (const account of this.state.accounts) {
            account.notifier.connect();
        }
    }

    stop() {
        for (const account of this.state.accounts) {
            account.notifier.stop();
        }
    }
}
