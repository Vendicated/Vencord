import definePlugin from "../../utils/types";
import { Devs } from "../../utils/constants";
import ERROR_CODES from "./codes.json";

export default definePlugin({
    name: "UnminifyErrors",
    description: 'Replaces "Minifed React Error" with the actual error.',
    authors: [Devs.Cyn],
    patches: [
        {
            find: '"https://reactjs.org/docs/error-decoder.html?invariant="',
            replacement: {
                match: /function (.)\(.\){for\(var .="https:\/\/reactjs\.org\/docs\/error-decoder\.html\?invariant="\+.,.=1;.<arguments\.length;.\+\+\).\+="&args\[\]="\+encodeURIComponent\(arguments\[.\]\);return"Minified React error #"\+.\+"; visit "\+.\+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}/,
                replace: (_, functionName) =>
                    `function ${functionName}(){return Vencord.Plugins.plugins.UnminifyErrors.decodeError.apply(null, arguments);}`,
            },
        },
    ],
    decodeError(code: Number, ...args: any) {
        let index = 0;
        return ERROR_CODES[code].replace(/%s/g, () => {
            const arg = args[index];
            index++;
            return arg;
        });
    },
});
