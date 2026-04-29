import os
path = r'c:\Users\Akshit\Desktop\MAJOR PROJECT\ML-Powered-Scrap-Trading-Platform\server\models'
os.makedirs(path, exist_ok=True)
with open(os.path.join(path, 'test.txt'), 'w') as f:
    f.write('created')
print('done')
