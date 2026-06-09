# -*- coding: utf-8 -*-
with open('src/api/client.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("?via=\", "?via=")
content = content.replace("\?via=", "?via=")

with open('src/api/client.ts', 'w', encoding='utf-8') as f:
    f.write(content)
