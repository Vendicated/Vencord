# Baseline protocol (Windows 11)

Run each condition **at least 5 times**, same machine, same Discord version, same account and channel, same starting state.

1. Fully quit Discord (tray icon -> Quit), start it, wait 2 minutes.
2. Scenario A, idle visible: `.\measure-discord.ps1 -Label idle-visible -DurationSec 300`
3. Scenario B, minimised: minimise Discord, then run `-Label idle-minimised`.
4. Scenario C, interaction: run the script while you scroll the same long channel for 2 minutes, then switch between the same 20 channels.
5. Repeat with exactly one setting changed (e.g. UltraOptimizer "backdrop blur" on/off). Never change two things between runs.

If PowerShell blocks the script: `powershell -ExecutionPolicy Bypass -File .\measure-discord.ps1 -Label baseline`

Results are CSV files in `tools/measure/results/` (local only). Compare averages across runs and look at the spread before drawing conclusions.
