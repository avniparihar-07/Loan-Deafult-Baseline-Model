import io

def fix_encoding(file_path):
    with io.open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Common corrupted sequences from CP1252/UTF-8 mismatch
    replacements = {
        'Γé╣': '₹',
        'ΓÇö': '—',
        'ΓÇô': '–',
        '≡ƒöª': '🏠',
        '≡ƒÜù': '🚗',
        '≡ƒÄô': '🎓',
        'Γ£ô': '✓',
        'ΓÜá': '⚠',
        'Γûá': '■',
        'I"Ac': '₹', # Sometimes seen in certain terminal outputs
        '┬á': ' ',
        'ΓÇÖ': "'",
        'ΓÇ£': '"',
        'ΓÇ¥': '"',
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    # Also handle some emoji specific corruption if they exist
    # 🏠 = \ud83c\udfe0 in utf-16, f0 9f 8f a0 in utf-8
    # 🚗 = \ud83d\ude97 in utf-16, f0 9f 9a 97 in utf-8
    
    with io.open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    fix_encoding('frontend/src/components/BankDashboard.jsx')
    print("Encoding fixed.")
