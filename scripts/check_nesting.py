
import re

path = r"c:\Users\thakk\GroundZero\Loan-Deafult-Baseline-Model\frontend\src\components\BankDashboard.jsx"

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def check_nesting(start_line):
    depth_curly = 0
    depth_paren = 0
    # Simple div counter (ignores self-closing tags and strings)
    div_depth = 0
    
    print(f"Checking nesting starting from line {start_line}...")
    
    for i in range(start_line - 1, len(lines)):
        line = lines[i]
        
        # Count curly
        depth_curly += line.count('{') - line.count('}')
        # Count paren
        depth_paren += line.count('(') - line.count(')')
        
        # Count div
        # Very crude div count
        div_opens = len(re.findall(r'<div(?!\s*\/)', line))
        div_closes = line.count('</div>')
        div_depth += div_opens - div_closes
        
        if depth_curly < 0:
            print(f"ERROR: Unmatched '}}' at line {i+1}")
            # print(line)
        if depth_paren < 0:
            print(f"ERROR: Unmatched ')' at line {i+1}")
            # print(line)
        if div_depth < 0:
            print(f"ERROR: Unmatched '</div>' at line {i+1}")
            # print(line)
            
    print(f"Final depths: Curly={depth_curly}, Paren={depth_paren}, Div={div_depth}")

check_nesting(750)
