import os

file_path = r'c:\Users\Akshit\Desktop\MAJOR PROJECT\ML-Powered-Scrap-Trading-Platform\scripts\analysis_results.txt'
utf8_path = r'c:\Users\Akshit\Desktop\MAJOR PROJECT\ML-Powered-Scrap-Trading-Platform\scripts\analysis_results_utf8.txt'

try:
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Try decoding as utf-16le (common in powershell)
    try:
        decoded = content.decode('utf-16le')
    except:
        decoded = content.decode('utf-8')
    
    with open(utf8_path, 'w', encoding='utf-8') as f:
        f.write(decoded)
    print("Converted successfully")
except Exception as e:
    print(f"Error: {e}")
