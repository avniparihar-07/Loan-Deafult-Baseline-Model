
path = r"c:\Users\thakk\GroundZero\Loan-Deafult-Baseline-Model\frontend\src\components\BankDashboard.jsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def find_mismatch(text):
    stack = []
    for i, char in enumerate(text):
        if char == '{':
            stack.append(('{', i))
        elif char == '}':
            if not stack:
                return f"Unmatched '}}' at position {i} (Line {text[:i].count('\\n') + 1})"
            stack.pop()
    
    if stack:
        char, pos = stack.pop()
        return f"Unmatched '{char}' at position {pos} (Line {text[:pos].count('\\n') + 1})"
    
    return "Balanced!"

# Also check for parentheses
def find_mismatch_paren(text):
    stack = []
    for i, char in enumerate(text):
        if char == '(':
            stack.append(('(', i))
        elif char == ')':
            if not stack:
                return f"Unmatched ')' at position {i} (Line {text[:i].count('\\n') + 1})"
            stack.pop()
    
    if stack:
        char, pos = stack.pop()
        return f"Unmatched '{char}' at position {pos} (Line {text[:pos].count('\\n') + 1})"
    
    return "Balanced!"

print("Checking braces:")
print(find_mismatch(content))
print("\nChecking parentheses:")
print(find_mismatch_paren(content))
