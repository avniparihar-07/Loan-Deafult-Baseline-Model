
import re

path = "BankDashboard.jsx"
content = open(path, 'r', encoding='utf-8').read()

print("Searching for broken 'co' toggles...")
for m in re.finditer(r"tog\('co', 'N'", content):
    start = m.start()
    snippet = content[start:start+40]
    if not snippet.startswith("tog('co', 'N')"):
        print(f"FOUND BROKEN: {repr(snippet)}")
