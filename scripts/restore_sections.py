import re

def main():
    # Read original
    with open('original_BankDashboard_utf8.jsx', 'r', encoding='utf-8') as f:
        orig = f.read()
    
    # Extract pg-assess
    assess_match = re.search(r"(\s*\{page === 'pg-assess' && \([\s\S]*?\n\s*\)\})[\s\n]*\{page === 'pg-history' && \(", orig)
    if not assess_match:
        print("Failed to find pg-assess")
        return
    assess_code = assess_match.group(1).replace("page === 'pg-assess'", "page === 'bd-risk'")

    # Extract pg-invest
    invest_match = re.search(r"(\s*\{page === 'pg-invest' && \([\s\S]*?\n\s*\)\})[\s\n]*\{page === 'pg-suggest' && \(", orig)
    if not invest_match:
        print("Failed to find pg-invest")
        return
    invest_code = invest_match.group(1).replace("page === 'pg-invest'", "page === 'bd-portfolio'")

    # Read current
    with open('frontend/src/components/BankDashboard.jsx', 'r', encoding='utf-8') as f:
        curr = f.read()
        
    # Replace bd-portfolio
    curr = re.sub(r"\s*\{page === 'bd-portfolio' && \([\s\S]*?\n\s*\)\}(?=[\s\n]*\{page === 'bd-risk' && \()", "\n" + invest_code, curr)
    
    # Replace bd-risk
    curr = re.sub(r"\s*\{page === 'bd-risk' && \([\s\S]*?\n\s*\)\}(?=[\s\n]*\{page === 'pg-suggest' && \()", "\n" + assess_code, curr)
    
    # Write back
    with open('frontend/src/components/BankDashboard.jsx', 'w', encoding='utf-8') as f:
        f.write(curr)
        
    print("Successfully replaced sections!")

if __name__ == '__main__':
    main()
