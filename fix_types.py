import re

def fix_map_page(filepath):
    with open(filepath, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace("import { useState, useRef, useEffect, useMemo, useCallback } from 'react'", "import { useState, useRef, useEffect, useMemo } from 'react'")
    content = content.replace(".filter((b) =>", ".filter((b: any) =>")
    with open(filepath, 'w', encoding='utf-8') as f: f.write(content)

def fix_route_page(filepath):
    with open(filepath, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace(".map((b) =>", ".map((b: any) =>")
    content = content.replace(".map((b,", ".map((b: any,")
    content = content.replace(".filter((b) =>", ".filter((b: any) =>")
    with open(filepath, 'w', encoding='utf-8') as f: f.write(content)

def fix_stop_page(filepath):
    with open(filepath, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace("routes.map", "(routes || []).map")
    with open(filepath, 'w', encoding='utf-8') as f: f.write(content)

def fix_test(filepath):
    with open(filepath, 'r', encoding='utf-8') as f: content = f.read()
    content = re.sub(r"id:\s*'123',\n", "", content)
    content = re.sub(r"\{\s*type:\s*'Info',\s*updated_at:\s*'2024-01-01',\s*message:\s*'Test'\s*\}", "{ type: 'Info', updated_at: '2024-01-01', message: 'Test', route_code: '15A', route_name: 'Test Route' }", content)
    with open(filepath, 'w', encoding='utf-8') as f: f.write(content)

fix_map_page('src/pages/MapPage.tsx')
fix_route_page('src/pages/RoutePage.tsx')
fix_stop_page('src/pages/StopPage.tsx')
fix_test('src/pages/__tests__/StopPage.test.tsx')
