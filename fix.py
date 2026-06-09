with open('src/pages/__tests__/StopPage.test.tsx', 'r', encoding='utf-8') as f: content = f.read()

content = content.replace("const btn = await screen.findByRole('button', { name: /Duyurular \(1\)/i })", "const btn = await screen.findByRole('button', { name: /Duyurular \(2\)/i })")

with open('src/pages/__tests__/StopPage.test.tsx', 'w', encoding='utf-8') as f: f.write(content)
