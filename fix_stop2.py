# -*- coding: utf-8 -*-
with open('src/pages/StopPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
match = re.search(r"(  const filteredRouteBuses = useMemo\(\(\) => \{.*?  \}, \[routeBuses, activeRoutes\]\)\n\n)(  // Full fleet polled every 30 s.*?  \))", content, re.DOTALL)
if match:
    old = match.group(0)
    new = match.group(2) + "\n\n" + match.group(1)
    content = content.replace(old, new)
    with open('src/pages/StopPage.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Not found!")
