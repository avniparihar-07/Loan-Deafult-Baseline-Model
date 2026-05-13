import io

def final_fix(file_path):
    with io.open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Brute force replacement for BankDashboard.jsx specifically
    replacements = {
        '≡ƒÅá': '🏠',
        '≡ƒÅó': '🏢',
        '≡ƒÅÑ': '🏥',
        '≡ƒæñ': '👤',
        '≡ƒôª': '📦',
        'Γ£Å∩╕Å': '✍️',
        '┬╖': '·',
        'Γé╣': '₹',
        '┬á': ' ',
        '≡ƒÄ»': '🎯',
        '≡ƒÅ¢∩╕Å': '🏦',
        'Γåæ': '→',
        '≡ƒôè': '📊',
        '≡ƒÆ╝': '💼',
        '≡ƒÆí': '💡',
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    with io.open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    final_fix('frontend/src/components/BankDashboard.jsx')
    print("Final fix applied.")
