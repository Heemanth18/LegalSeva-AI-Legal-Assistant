import json
import os

BASE_DIR = os.path.dirname(__file__)
INPUT_FILE = os.path.join(BASE_DIR, "..", "datasets", "indian_laws", "ipc.json")

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

print("🔍 Top-level type:", type(data))

# Case 1: List
if isinstance(data, list):
    print("🔍 List length:", len(data))
    print("🔍 First item type:", type(data[0]))
    if isinstance(data[0], dict):
        print("🔍 Keys in first item:", data[0].keys())

# Case 2: Dict
elif isinstance(data, dict):
    keys = list(data.keys())
    print("🔍 Dict key count:", len(keys))
    print("🔍 First 5 keys:", keys[:5])

    first_value = data[keys[0]]
    print("🔍 First value type:", type(first_value))
    if isinstance(first_value, dict):
        print("🔍 Keys in first value:", first_value.keys())
        