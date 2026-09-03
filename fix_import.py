import re

filepath = 'src/components/Canvas/NebulaCanvas.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add DepthOfFieldEffect import after BloomEffect import
old_line = "import { BloomEffect } from '../Effects'"
new_line = "import { BloomEffect } from '../Effects'\nimport { DepthOfFieldEffect } from './Effects/DepthOfFieldEffect'"

if old_line in content:
    content = content.replace(old_line, new_line)
    with open(filepath, 'w') as f:
        f.write(content)
    print('Import added successfully')
else:
    print('Old line not found')