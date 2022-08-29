// exists to export default definePlugin({...})
export default function definePlugin(p: Plugin) {
    return p;
}

export interface PatchReplacement {
    match: string | RegExp;
    replace: string | ((match: string, ...groups: string[]) => string);
}

export interface Patch {
    plugin: string;
    find: string,
    replacement: PatchReplacement | PatchReplacement[];
}

export interface Plugin {
    name: string;
    description: string;
    author: string[];
    start?(): void;
    patches?: Patch[];
}