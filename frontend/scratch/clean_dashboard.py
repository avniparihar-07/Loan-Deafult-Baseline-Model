import re

def clean_file(file_path):
    with open(file_path, 'rb') as f:
        content = f.read().decode('utf-8', 'ignore')
    
    # Common broken character patterns
    replacements = {
        r'Ã¢â€“Â¦': '■',
        r'Ã¢â€”Â': '●',
        r'Ã¢Å“â€"': '✓',
        r'Ã¢Å“â€œ': '✓',
        r'Ã°Å¸â€™Â°': '💰',
        r'Ã°Å¸Â Â ': '🏠',
        r'Ã°Å¸Â Â¢': '🏢',
        r'Ã°Å¸â€œâ€°': '📈',
        r'Ã°Å¸â€Â': '⚠️',
        r'Ã¯Â¸Â ': '', # Emoji modifier junk
        r'Ã°Å¸Â Â': '🏠',
        r'Ã°Å¸â€šÂ ': '⚠️',
        r'Ã¢â€°Â¡Ã†â€™Ã†â€™ÃƒÂ³': 'Low Risk',
        r'Ã¢â€°Â¡Ã†â€™Ã†â€™ÃƒÂ­': 'Medium Risk',
        r'Ã¢â€°Â¡Ã†â€™Ã†â€™ÃƒÂ¶Ã¢â€ Â¤': 'High Risk',
        r'30—œ60%': '30-60%',
        r'Ã¢â€°Â¡Ã†â€™Ã†â€™ÃƒÂ²': 'Low Risk', # Added more variations
        r'Ã¢â€°Â¡Ã†â€™Ã†â€™ÃƒÂ ': 'High Risk',
    }
    
    for pattern, repl in replacements.items():
        content = re.sub(pattern, repl, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

clean_file('src/components/BankDashboard.jsx')
print("File cleaned successfully.")
