declare module "plugins" {
    const plugins: Record<string, import("./utils/types").Plugin>;
    export default plugins;
}

declare module "git-hash" {
    const hash: string;
    export default hash;
}

declare module "*.css" {
    const content: string;
    export default content;
}

declare module "*.sass" {
    const content: string;
    export default content;
}

declare module "*.scss" {
    const content: string;
    export default content;
}
