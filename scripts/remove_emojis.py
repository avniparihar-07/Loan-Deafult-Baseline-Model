import re

with open('src/components/BankDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    # Form selects
    '🏠 Home': 'Home', '🚗 Auto': 'Auto', '🎓 Education': 'Education', '🏢 Business': 'Business',
    '🏥 Medical': 'Medical', '👤 Personal Loan': 'Personal Loan', '📦 Other': 'Other', '✍️ Custom': 'Custom',
    '✍️ Manual Entry': 'Manual Entry',
    '🏠 Home Loan': 'Home Loan', '🚗 Auto Loan': 'Auto Loan',
    '⚡ Assess Default Risk': 'Assess Default Risk',
    
    # Text with emojis
    '✅ Low Exposure': 'Low Exposure',
    '⚠️ Elevated Concern': 'Elevated Concern',
    '❌ Critical Risk': 'Critical Risk',
    '✅ Low Risk': 'Low Risk',
    '⚠️ Medium Risk': 'Medium Risk',
    '❌ High Risk': 'High Risk',
    '✅ Financially Stable / Strong Capacity': 'Financially Stable / Strong Capacity',
    '⚠️ Moderate Risk / Manual Review': 'Moderate Risk / Manual Review',
    '❌ High Risk / Weak Capacity': 'High Risk / Weak Capacity',
    '✅': '', '❌': '', '⚠️': '', '✓': '', '✕': '',
    '🏦 ': '', '☁️': '', '💰': '', '📊': '', '🎯': '', '🔍': '',
    '📈 Improving Trend': 'Improving Trend',
    "const icons = { Home: '🏠', Education: '🎓', Other: '📦', Business: '🏢' };": "const icons = { Home: '', Education: '', Other: '', Business: '' };",
    '📦 ': '',
    
    # Garbled unicode ones from before
    'Ã°Å¸Â Â\xa0 Home': 'Home',
    'Ã°Å¸Â Â¢ Business': 'Business',
    'Ã°Å¸Â Â¥ Medical': 'Medical',
    'Ã¢Å“Â Ã¯Â¸Â\x8f Custom': 'Custom',
    'Ã¢Å“Â Ã¯Â¸Â\x8f Manual Entry': 'Manual Entry',
    'Ã°Å¸Â Â\xa0 Home Loan': 'Home Loan',
    'Ã¢Å“Â Ã¯Â¸Â Custom': 'Custom',
    'Ã¢Å“Â Ã¯Â¸Â Manual Entry': 'Manual Entry'
}

for k, v in replacements.items():
    content = content.replace(k, v)

emoji_pattern = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27BF]')
content = emoji_pattern.sub('', content)

# Clean up empty spaces that might have been left
content = content.replace(' {', '{').replace(' }', '}')
content = content.replace('> <', '><')
content = content.replace("''", "''")

with open('src/components/BankDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Emojis removed successfully')
