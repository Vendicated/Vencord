rg -n "useSettings\(" src
rg -n "useSettings\(\[\[" src
rg -n "useSettings\(\)" src
rg -n "UseSettings<|ResolveUseSettings<|use: settings => useSettings" src/api/Settings.ts
rg -n "\"[A-Za-z0-9_.*-]+\"" src | rg -n "useSettings\(\["
