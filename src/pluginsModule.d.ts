declare module "plugins" {
    const plugins: import("./utils/types").Plugin[];
    export default plugins;
}

declare module "git-hash" {
    const hash: string;
    export default hash;
}
