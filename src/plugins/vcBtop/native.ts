import * as os from "os";

export const getCpuUsage = (): number => {
    const cpus = os.cpus(); 
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
        totalTick += Object.values(cpu.times).reduce((a, b) => a + b);
        totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;

    const usage = 100 - Math.round((idle / total) * 100);
    return usage; // Return the CPU usage directly
};
