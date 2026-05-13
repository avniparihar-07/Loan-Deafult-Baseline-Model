
import re

path = r"c:\Users\thakk\GroundZero\Loan-Deafult-Baseline-Model\frontend\src\components\BankDashboard.jsx"

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def check_nesting(start_line):
    depth_curly = 0
    depth_paren = 0
    div_stack = []
    
    print(f"Checking nesting starting from line {start_line}...")
    
    for i in range(start_line - 1, len(lines)):
        line = lines[i]
        
        # Simple brace/paren check
        depth_curly += line.count('{') - line.count('}')
        depth_paren += line.count('(') - line.count(')')
        
        # Div tracking
        # Find all <div... and </div>
        tokens = re.findall(r'<(div|/div)', line)
        for t in tokens:
            if t == 'div':
                # Check if it's self-closing
                # This is a bit hard with regex on a single line if it spans multiple lines
                # But let's assume if it has '/>' on the same line it's self-closing
                if '/>' in line and line.find('<div') < line.find('/>'):
                    # Probable self-closing
                    pass
                else:
                    div_stack.append(i + 1)
            else:
                if div_stack:
                    div_stack.pop()
                else:
                    print(f"ERROR: Extra </div> at line {i+1}")
        
    print(f"Final depths: Curly={depth_curly}, Paren={depth_paren}")
    if div_stack:
        print(f"Unclosed divs (line numbers): {div_stack}")
    else:
        print("All divs closed!")

check_nesting(750)
