import re
with open('src/api/client.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace \?via=\ with \?via=\ (without backslashes)
text = text.replace(r"\?via=\", "?via=")

with open('src/api/client.ts', 'w', encoding='utf-8') as f:
    f.write(text)
