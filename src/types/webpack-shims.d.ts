declare module "@webpack" {
    export function findLazy<T = any>(predicate: (m: any) => boolean, allowMultiple?: boolean): T;
    export function findStoreLazy<T = any>(predicate: (s: any) => boolean, allowMultiple?: boolean): T;
    export function proxyLazyWebpack<T = any>(resolver: () => T): T;
    export function proxyLazy<T = any>(resolver: () => T): T;
    const _default: unknown;
    export default _default;
}
