import re

def main():
    # Read original
    with open('original_BankDashboard_utf8.jsx', 'r', encoding='utf-8') as f:
        orig = f.read()
    
    # Extract pg-assess chart block
    assess_chart_match = re.search(r"(\s*\} else if \(page === 'pg-assess' && result\) \{[\s\S]*?\n\s*\})(?=[\s\n]*\} else if \(page === 'pg-behaviour'\))", orig)
    if not assess_chart_match:
        print("Failed to find pg-assess chart block")
        return
    assess_chart_code = assess_chart_match.group(1).replace("page === 'pg-assess'", "page === 'bd-risk'")

    # Extract pg-invest chart block
    invest_chart_match = re.search(r"(\s*\} else if \(page === 'pg-invest'\) \{[\s\S]*?\n\s*\})(?=[\s\n]*\} else if \(page === 'pg-suggest'\))", orig)
    if not invest_chart_match:
        print("Failed to find pg-invest chart block")
        return
    invest_chart_code = invest_chart_match.group(1).replace("page === 'pg-invest'", "page === 'bd-portfolio'")

    # Read current
    with open('frontend/src/components/BankDashboard.jsx', 'r', encoding='utf-8') as f:
        curr = f.read()
        
    # Replace bd-portfolio chart block
    curr = re.sub(r"\s*\} else if \(page === 'bd-portfolio'\) \{[\s\S]*?\n\s*\}(?=[\s\n]*\} else if \(page === 'bd-risk'\))", invest_chart_code, curr)
    
    # Delete bd-assess block (since we rename assess to bd-risk)
    curr = re.sub(r"\s*\} else if \(page === 'bd-assess' && result\) \{[\s\S]*?\n\s*\}(?=[\s\n]*\} else if \(page === 'bd-behaviour'\))", "", curr)

    # Replace bd-risk chart block with pg-assess chart block
    curr = re.sub(r"\s*\} else if \(page === 'bd-risk'\) \{[\s\S]*?\n\s*\}(?=[\s\n]*return \(\) => \{)", assess_chart_code, curr)

    # Write back
    with open('frontend/src/components/BankDashboard.jsx', 'w', encoding='utf-8') as f:
        f.write(curr)
        
    print("Successfully replaced chart blocks!")

if __name__ == '__main__':
    main()
