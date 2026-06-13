import os
import re
import json

SRC_DIR = "src"
LOCALES_DIR = "public/locales"

pattern = re.compile(r"t\(\s*['\"]([^'\"]+)['\"]\s*,\s*\{\s*defaultValue\s*:\s*['\"]([^'\"]+)['\"]\s*\}\s*\)")
pattern_no_default = re.compile(r"t\(\s*['\"]([^'\"]+)['\"]\s*\)")

keys = {}

for root, _, files in os.walk(SRC_DIR):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            with open(os.path.join(root, file), "r", encoding="utf-8") as f:
                content = f.read()
                matches = pattern.findall(content)
                for key, default_val in matches:
                    keys[key] = default_val

# Create nested dictionaries
def set_nested(d, key, val):
    parts = key.split('.')
    current = d
    for part in parts[:-1]:
        if part not in current:
            current[part] = {}
        current = current[part]
    current[parts[-1]] = val

for lang in ["en", "tr"]:
    file_path = os.path.join(LOCALES_DIR, f"{lang}.json")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}

    for k, v in keys.items():
        # Only set if not already set or we want to overwrite empty
        parts = k.split('.')
        current = data
        missing = False
        for part in parts[:-1]:
            if part not in current:
                missing = True
                break
            current = current[part]
        if missing or parts[-1] not in current:
            set_nested(data, k, v)
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(keys)} keys into locales.")
