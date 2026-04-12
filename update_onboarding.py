import re
path = 'c:/Users/Chandan Kumar/Pictures/pcl/health_assistant/HealthNew/static/js/onboarding.js'
with open(path, 'r', encoding='utf-8') as f: content = f.read()
orig = content
content = re.sub(
    r'showToast\(([\'"][^\'"]+[\'"])(\s*,\s*[\'"][^\'"]+[\'"])?\)',
    lambda m: f"showToast(t({m.group(1)}){m.group(2) if m.group(2) else ''})" if "t(" not in m.group(1) else f"showToast({m.group(1)}{m.group(2) if m.group(2) else ''})",
    content
)
if content != orig:
    with open(path, 'w', encoding='utf-8') as f: f.write(content)
    print('Updated js')
