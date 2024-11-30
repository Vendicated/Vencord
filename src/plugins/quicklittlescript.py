from os import walk, path
from glob import glob
import re

for root, *_ in walk(path.abspath(".")):
    for file in glob(path.join(root, "*/index.ts*")):
        script = path.join(root, file)
        scriptdir = path.dirname(script)
        print(script)
        if not path.exists(path.join(scriptdir, "README.md")):
            if not path.exists(path.join(scriptdir, "README.draft.md")):
                print("plugin is missing README.md, attempting generation using plugin description...")
                with open(script, 'r') as f:
                    script = f.read()
                    match = re.findall(r"definePlugin\({.*?description:.*?\"(.*?)\"", script, re.MULTILINE | re.DOTALL)
                    print(f'"{match[0]}"')
                    with open(path.join(scriptdir, "README.draft.md"), "a") as r:
                        r.write(f'# {path.basename(scriptdir)}\n\n{match[0]}')
            else:
                print("Draft exists.")
