let tokenModuleCache: any = null;

export const getToken = () => {
    if (tokenModuleCache) {
        return tokenModuleCache.exports.default.getToken();
    }

    try {
        let m: any[] = [];
        (window as any).webpackChunkdiscord_app.push([
            [""],
            {},
            (e: any) => {
                for (let c in e.c) m.push(e.c[c]);
            },
        ]);

        const tokenModule = m.find(
            (module) => module?.exports?.default?.getToken !== void 0
        );

        if (!tokenModule) {
            return null;
        }

        tokenModuleCache = tokenModule;

        const token = tokenModule.exports.default.getToken();

        if (!token) {
            return null;
        }

        return token;
    } catch (error) {
        return null;
    }
};
