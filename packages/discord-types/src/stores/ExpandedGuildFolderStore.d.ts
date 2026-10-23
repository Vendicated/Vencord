import { FluxStore } from "..";

export interface ExpandedGuildFolderState {
    expandedFolders: number[];
}

export class ExpandedGuildFolderStore extends FluxStore {
    getExpandedFolders(): Set<number>;
    getState(): ExpandedGuildFolderState;
    isFolderExpanded(folderId: number): boolean;
}
