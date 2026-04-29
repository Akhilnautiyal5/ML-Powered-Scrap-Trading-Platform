import requests

try:
    res = requests.post("http://127.0.0.1:5000/api/auth/login", json={"identifier": "test", "password": "password"})
    print("Login Status:", res.status_code)
    print("Body:", res.text)
except Exception as e:
    print("Error:", e)
