"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSpawnEventSupported = void 0;
/**
 * Checks whether the spawn event of a process is supported (requires node version 15.1+)
 * @returns Whether spawn is supported
 */
function isSpawnEventSupported() {
    const nodeVersion = process.versions.node;
    const nums = nodeVersion.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!nums)
        return false;
    const major = Number(nums[1]);
    const minor = Number(nums[2]);
    const spawnEventSupported = major > 15 || (major == 15 && minor >= 1);
    return spawnEventSupported;
}
exports.isSpawnEventSupported = isSpawnEventSupported;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNTcGF3bkV2ZW50U3VwcG9ydGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3RzL2lzU3Bhd25FdmVudFN1cHBvcnRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7O0dBR0c7QUFDSCxTQUFnQixxQkFBcUI7SUFDakMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDMUMsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3RELElBQUksQ0FBQyxJQUFJO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFFeEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5QixNQUFNLG1CQUFtQixHQUFHLEtBQUssR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0RSxPQUFPLG1CQUFtQixDQUFDO0FBQy9CLENBQUM7QUFURCxzREFTQyJ9