# -*- coding: utf-8 -*-
with open('src/pages/StopPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
# The exact match
target = """  const filteredRouteBuses = useMemo(() => {
    if (activeRoutes.size === 0) return routeBuses
    return routeBuses.filter(b => activeRoutes.has(b.route_code ?? ''))
  }, [routeBuses, activeRoutes])

  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.
  // Derive bus positions from arrivals (which already carry lat/lon from YBS response).
  const routeBuses = useMemo<BusPosition[]>(
"""
# And we need to find where it ends
match = re.search(r"(  const filteredRouteBuses = useMemo\(\(\) => \{.*?  \}, \[routeBuses, activeRoutes\]\)\n\n)(  // Full fleet polled every 30 s.*?  \))", content, re.DOTALL)
if match:
    old = match.group(0)
    new = match.group(2) + "\n\n" + match.group(1)
    content = content.replace(old, new)
    with open('src/pages/StopPage.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed via regex!")
else:
    print("Not found via regex, trying string split...")
    # fallback
    parts = content.split("  const filteredRouteBuses = useMemo(() => {\n")
    if len(parts) == 2:
        part2 = parts[1]
        parts2 = part2.split("  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.\n")
        if len(parts2) == 2:
            filtered_block = "  const filteredRouteBuses = useMemo(() => {\n" + parts2[0]
            rest = "  // Full fleet polled every 30 s via the shared cache — no per-route calls needed.\n" + parts2[1]
            
            # extract routeBuses block
            rest_parts = rest.split("  )\n\n")
            if len(rest_parts) >= 2:
                route_buses_block = rest_parts[0] + "  )\n\n"
                tail = "  )\n\n".join(rest_parts[1:])
                
                content = parts[0] + route_buses_block + filtered_block + tail
                with open('src/pages/StopPage.tsx', 'w', encoding='utf-8') as f:
                    f.write(content)
                print("Fixed via split!")
            else:
                print("Could not find end of routeBuses block")
        else:
            print("Could not find routeBuses block start")
    else:
        print("Could not find filteredRouteBuses block")
