let isOnCooldown = false;
let upNext: Function | undefined = undefined;
export default function cooldown(func: Function | undefined) {
    if (isOnCooldown) {
        upNext = func;
        return;
    }
    isOnCooldown = true;
    upNext = undefined;
    func && func();
    setTimeout(function () {
        isOnCooldown = false;
        upNext && cooldown(upNext);
    }, 1000);
}

export function normalize(value: number, minValue: number, maxValue: any): number | undefined {
    return (value - minValue) / (maxValue - minValue) * 100;
}

export function denormalize(number: number, minValue: number, maxValue: any) {
    return number * (maxValue - minValue) / 100 + minValue;
}
