# -*- coding: utf-8 -*-
with open('src/pages/StopPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("${mapHeightPct}%", "${mapHeightPctRef.current}%")

with open('src/pages/StopPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
