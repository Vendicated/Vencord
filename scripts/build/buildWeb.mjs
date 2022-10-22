// TODO: Modularise the plugins since both build scripts use them

import { createWriteStream, readFileSync } from "fs";
import yazl from "yazl";
import esbuild from "esbuild";
// wtf is this assert syntax
import PackageJSON from "../../package.json" assert { type: "json" };
import { commonOpts, gitHashPlugin, globPlugins } from "./common.mjs";

/**
 * @type {esbuild.BuildOptions}
 */
const commonOptions = {
    ...commonOpts,
    entryPoints: ["browser/Vencord.ts"],
    globalName: "Vencord",
    format: "iife",
    external: ["plugins", "git-hash"],
    plugins: [
        globPlugins,
        gitHashPlugin
    ],
    target: ["esnext"],
    define: {
        IS_WEB: "true"
    }
};

await Promise.all(
    [
        esbuild.build({
            ...commonOptions,
            outfile: "dist/browser.js",
            footer: { js: "//# sourceURL=VencordWeb" },
        }),
        esbuild.build({
            ...commonOptions,
            outfile: "dist/Vencord.user.js",
            banner: {
                js: readFileSync("browser/userscript.meta.js", "utf-8").replace("%version%", PackageJSON.version)
            },
            footer: {
                // UserScripts get wrapped in an iife, so define Vencord prop on window that returns our local
                js: "Object.defineProperty(window,'Vencord',{get:()=>Vencord});"
            },
        })
    ]
);

const zip = new yazl.ZipFile();
zip.outputStream.pipe(createWriteStream("dist/extension.zip")).on("close", () => {
    console.info("Extension written to dist/extension.zip");
});

zip.addFile("dist/browser.js", "dist/Vencord.js");
["background.js", "content.js", "manifest.json"].forEach(f => {
    zip.addFile(`browser/${f}`, `${f}`);
});
zip.end();
