export function debounce<T extends Function>(func: T, delay = 300): T {
    let timeout: NodeJS.Timeout;
    return function (...args: any[]) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => { func(...args); }, delay);
    } as T;
}
