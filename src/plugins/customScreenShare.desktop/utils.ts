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
