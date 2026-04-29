import sys
import os

def convert(file_path):
    utf8_path = file_path.replace('.txt', '_utf8.txt')
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
        print(f"Converted {file_path} to {utf8_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        convert(sys.argv[1])
