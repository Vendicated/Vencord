// exists to export default definePlugin({...})
export default function definePlugin(p: PluginDef) {
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
    author: string;
    start?(): void;
    patches?: Patch[];
    dependencies?: string[],
    required?: boolean;
}

// @ts-ignore lole
interface PluginDef extends Plugin {
    patches?: Omit<Patch, "plugin">[];
} 