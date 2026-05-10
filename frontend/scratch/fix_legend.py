import re

def fix_legend(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Target the legend block specifically
    pattern = r'<div style=\{\{ marginTop: \'20px\' \}\}>\s+<div style=\{\{ display: \'flex\', justifyContent: \'space-between\', fontSize: \'13px\', color: \'var\(--text2\)\', marginBottom: \'8px\' \}\}>.*?High \(.*?60%\)</span></div>\s+</div>'
    
    replacement = """<div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38C9B0' }}></div>
                      <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Low Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9973C' }}></div>
                      <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Medium Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E85475' }}></div>
                      <span style={{ color: 'var(--slate)', fontWeight: 600 }}>High Risk</span>
                    </div>
                  </div>"""
    
    # Use re.DOTALL to match across lines
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_legend('src/components/BankDashboard.jsx')
print("Legend fixed successfully.")
