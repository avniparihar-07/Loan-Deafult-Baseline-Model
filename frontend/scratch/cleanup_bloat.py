import re

def deduplicate_newlines(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace 3 or more consecutive newlines with 1
    # Actually, let's be safer and replace 3 or more with 2
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

deduplicate_newlines('src/components/BankDashboard.jsx')
deduplicate_newlines('src/components/BorrowerPortal.jsx')
print("Deduplicated newlines in dashboards.")
