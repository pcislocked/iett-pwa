import re

def wrap_with_query_client(filepath):
    with open(filepath, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace("import { MemoryRouter, Route, Routes } from 'react-router-dom'", "import { MemoryRouter, Route, Routes } from 'react-router-dom'\nimport { QueryClient, QueryClientProvider } from '@tanstack/react-query'")
    
    provider_open = "const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })\n    return render(\n      <QueryClientProvider client={queryClient}>\n        <MemoryRouter initialEntries={[/stops/]}>"
    provider_close = "        </MemoryRouter>\n      </QueryClientProvider>\n    )"
    
    content = content.replace("return render(\n      <MemoryRouter initialEntries={[/stops/]}>", provider_open)
    content = content.replace("</MemoryRouter>\n    )", provider_close)
    
    with open(filepath, 'w', encoding='utf-8') as f: f.write(content)

wrap_with_query_client('src/pages/__tests__/StopPage.test.tsx')
