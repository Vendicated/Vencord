/*
 * Store للفولدرات المخفية
 */

import * as DataStore from "@api/DataStore";
import { Guild } from "@vencord/discord-types";
import { findStoreLazy, proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher, GuildStore } from "@webpack/common";

const DB_KEY = "HideFolders_folders";

type HiddenData = Set<string>;

export const HiddenFoldersStore = proxyLazyWebpack(() => {
    const { Store } = Flux;
    const SortedGuildStore = findStoreLazy("SortedGuildStore");

    class HiddenFoldersStore extends Store {
        public _hiddenFolders: HiddenData = new Set();

        get hiddenFolders() {
            return this._hiddenFolders;
        }

        async load() {
            const data = await DataStore.get(DB_KEY);
            if (data && data instanceof Set) {
                this._hiddenFolders = data;
            } else if (data && Array.isArray(data)) {
                this._hiddenFolders = new Set(data);
            }
        }

        unload() {
            this._hiddenFolders.clear();
        }

        save() {
            DataStore.set(DB_KEY, this._hiddenFolders);
        }

        addHiddenFolder(id: string) {
            this._hiddenFolders.add("folder-" + id);
            this.save();
            this.emitChange();
        }

        removeHiddenFolder(id: string) {
            this._hiddenFolders.delete("folder-" + id);
            this.save();
            this.emitChange();
        }

        clearHidden() {
            this._hiddenFolders.clear();
            DataStore.del(DB_KEY);
            this.emitChange();
        }

        hiddenFoldersDetail(): { folderId: number; folderName: string; guilds: Guild[] }[] {
            const folders = SortedGuildStore.getGuildFolders().filter((f: any) => f.folderId !== undefined);
            return folders
                .filter((f: any) => this._hiddenFolders.has("folder-" + f.folderId))
                .map((f: any) => ({
                    folderId: f.folderId,
                    folderName: f.folderName || "Folder",
                    guilds: (f.guildIds as string[]).map(id => GuildStore.getGuild(id)).filter(Boolean),
                }));
        }
    }

    return new HiddenFoldersStore(FluxDispatcher);
});
