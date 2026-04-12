import os, re
dr = 'c:/Users/Chandan Kumar/Pictures/pcl/health_assistant/HealthNew/templates'
def process(path):
    with open(path, 'r', encoding='utf-8') as f: content = f.read()
    orig = content
    # replace showToast('msg'...) wait, doing this via regex is tricky.
    # It's better to just do it simply.
    content = re.sub(
        r'showToast\(([\'"][^\'"]+[\'"])(\s*,\s*[\'"][^\'"]+[\'"])?\)',
        lambda m: f"showToast({m.group(1)}{m.group(2) if m.group(2) else ''})" if "t(" in m.group(1) else f"showToast(t({m.group(1)}){m.group(2) if m.group(2) else ''})",
        content
    )
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f: f.write(content)
        print('Updated', path)

for root, _, files in os.walk(dr):
    for f in files:
        if f.endswith('.html'):
            process(os.path.join(root, f))
