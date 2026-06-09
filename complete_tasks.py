# -*- coding: utf-8 -*-
with open('task.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("- [ ] **", "- [x] **")

with open('task.md', 'w', encoding='utf-8') as f:
    f.write(content)
