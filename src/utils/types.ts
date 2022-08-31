// exists to export default definePlugin({...})
export default function definePlugin(p: PluginDef & Record<string, any>) {
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

export interface Plugin extends PluginDef {
    patches?: Patch[];
    started: boolean;
}

interface PluginDef {
    name: string;
    description: string;
    author: string;
    start?(): void;
    stop?(): void;
    patches?: Omit<Patch, "plugin">[];
    dependencies?: string[],
    required?: boolean;
} 