import { FluxStore, GuildFolder } from "..";

export interface GuildsTreeNode {
    type: string;
    id: string | number;
    children: GuildsTreeNode[];
    name?: string;
    color?: number;
    expanded?: boolean;
}

export interface GuildsTree {
    root: GuildsTreeNode;
    version: number;
    getRoots(): GuildsTreeNode[];
    getNode(id: string | number): GuildsTreeNode | undefined;
    allNodes(): GuildsTreeNode[];
    sortedGuildNodes(): GuildsTreeNode[];
}

export class SortedGuildStore extends FluxStore {
    getGuildsTree(): GuildsTree;
    getFlattenedGuildFolderList(): GuildsTreeNode[];
    getCompatibleGuildFolders(): GuildFolder[];
    getFastListGuildFolders(): GuildsTreeNode[];
    getFlattenedGuildIds(): string[];
    getGuildFolderById(folderId: number): GuildFolder;
    getGuildFolders(): GuildFolder[];
}
