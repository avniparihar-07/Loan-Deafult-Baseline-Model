import re

with open('BankDashboard.jsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# 1. Fix modal close button - any garbage inside the button
content = re.sub(
    r'(<button className="modal-close"[^>]*>)[^<]*(</button>)',
    r'\1\u2715\2',
    content
)

# 2. Fix insight emoji - replace the pos/neg icons
old_insight = "ins.type === 'pos' ? '\u00c3\u00b0\u00c5\u00b8\u00c2\u00c2\u00a6' : '\u26a0\ufe0f\u00c3\u00af\u00c2\u00b8\u00c2'"
new_insight = "ins.type === 'pos' ? '\u2705' : '\u26a0\ufe0f'"
content = content.replace(old_insight, new_insight)

# 3. Fix decision summary garbage text - multiple possible garbled versions
garbled_patterns = [
    "\u00c3\u00a2\u00c2\u00c5\u2019",
    "\u00c3\u00a2\u00c2\u00c5'",
    "Ã¢ÂÅ'",
]
for pat in garbled_patterns:
    content = content.replace(pat + " High Risk / Weak Capacity'}", "\u274c High Risk \u2014 Weak Repayment Capacity'}")

# Also fix the warning+FE0F combo in the decision line
content = content.replace(
    "\u26a0\ufe0f\u00c3\u00af\u00c2\u00b8\u00c2 Moderate Risk / Manual Review",
    "\u26a0\ufe0f Moderate Risk \u2014 Manual Review Required"
)

# 4. Fix any other known garbled patterns anywhere
content = content.replace('\u00c3\u00af\u00c2\u00b8\u00c2', '')  # FE0F variation selector garbage

with open('BankDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Unicode cleanup complete')
