import urllib.request
import json

table_data = [
    ["APOYO", "TIPO", "X UTM (m)", "Y UTM (m)", None, None],
    ["1", "FL", "668.543,43", "4.495.351,94", None, None],
    ["2", "SUSP", "668.858,52", "4.495.492,46", None, None]
]

payload = {
    "table_data": table_data,
    "utm_zone": 30,
    "hemisphere": "N"
}

req = urllib.request.Request("http://localhost:8000/api/v1/merlot/process", data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print(json.dumps(json.loads(response.read().decode('utf-8')), indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(e)
