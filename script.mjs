import child_process from "child_process";
import util from "util"

console.log((
    await util.promisify(child_process.exec)("git remote get-url origin", {
        encoding: "utf-8",
    })
).stdout
    .trim()
    .replace("https://github.com/", "")
    .replace("git@github.com:", "")
    .replace(/.git$/, ""))
