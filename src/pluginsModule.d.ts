declare module "plugins" {
    const plugins: Record<string, import("./utils/types").Plugin>;
    export default plugins;
}

declare module "git-hash" {
    const hash: string;
    export default hash;
}
