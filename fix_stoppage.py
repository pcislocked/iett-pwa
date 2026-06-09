# -*- coding: utf-8 -*-
with open('src/pages/StopPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  const filteredRouteBuses = useMemo(() => {
    if (activeRoutes.size === 0) return routeBuses
    return routeBuses.filter(b => activeRoutes.has(b.route_code ?? ''))
  }, [routeBuses, activeRoutes])

  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.
  // Derive bus positions from arrivals (which already carry lat/lon from YBS response).
  const routeBuses = useMemo<BusPosition[]>(
"""
replacement = """  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.
  // Derive bus positions from arrivals (which already carry lat/lon from YBS response).
  const routeBuses = useMemo<BusPosition[]>(
"""

# wait, it's easier to just use eplace_file_content or regex
import re
# find routeBuses block
match = re.search(r"(  // Full fleet polled every 30 s.*?\n  const routeBuses = useMemo<BusPosition\[\]>\(\n.*?\n  \))", content, re.DOTALL)
route_buses_block = match.group(1)

content = content.replace(route_buses_block, "")
# insert it before filteredRouteBuses
content = content.replace("  const filteredRouteBuses", route_buses_block + "\n\n  const filteredRouteBuses")

with open('src/pages/StopPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
