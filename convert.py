import os
try:
    with open('server/requirements.txt', 'rb') as f:
        content = f.read()
    text = content.decode('utf-16le')
    with open('server/requirements.txt_utf8.txt', 'w', encoding='utf-8') as f2:
        f2.write(text)
except Exception as e:
    with open('server/error.log', 'w') as f3:
        f3.write(str(e))
