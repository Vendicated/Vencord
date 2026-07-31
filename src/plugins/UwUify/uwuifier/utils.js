// deno-lint-ignore-file no-explicit-any
function isLetter(char) {
    return /^\p{L}/u.test(char);
}
function isUpperCase(char) {
    return char === char.toUpperCase();
}
export function getCapitalPercentage(str) {
    let totalLetters = 0;
    let upperLetters = 0;
    for (const currentLetter of str) {
        if (!isLetter(currentLetter))
            continue;
        if (isUpperCase(currentLetter)) {
            upperLetters++;
        }
        totalLetters++;
    }
    return upperLetters / totalLetters;
}
export function InitModifierParam() {
    return (target, key) => {
        let value = target[key];
        let sum = 0;
        const getter = () => value;
        const setter = (next) => {
            if (typeof next === "object") {
                sum = Object.values(next).reduce((a, b) => a + b);
            }
            if (next < 0 || sum < 0 || next > 1 || sum > 1) {
                throw new Error(`${key} modifier value must be a number between 0 and 1`);
            }
            value = next;
        };
        Object.defineProperty(target, key, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true,
        });
    };
}
export function isUri(value) {
    if (!value)
        return false;
    // Check for illegal characters
    if (/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)) {
        return false;
    }
    // Check for hex escapes that aren't complete
    if (/%[^0-9a-f]/i.test(value) || /%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) {
        return false;
    }
    // Directly from RFC 3986
    const split = value.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
    if (!split)
        return false;
    const [, scheme, authority, path] = split;
    // Scheme and path are required, though the path can be empty
    if (!(scheme && scheme.length && path.length >= 0))
        return false;
    // If authority is present, the path must be empty or begin with a /
    if (authority && authority.length) {
        if (!(path.length === 0 || /^\//.test(path)))
            return false;
    }
    else if (/^\/\//.test(path)) {
        // If authority is not present, the path must not start with //
        return false;
    }
    // Scheme must begin with a letter, then consist of letters, digits, +, ., or -
    if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase()))
        return false;
    return true;
}
export function isAt(value) {
    // Check if the first character is '@'
    const first = value.charAt(0);
    return first === "@";
}
