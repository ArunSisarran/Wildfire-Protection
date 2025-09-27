import requests, json
payload = {
  "lat": 40.7128,
  "lon": -74.0060,
  "hours": [0.5,1,2],
  "wind_speed": 8.0,
  "wind_dir_from": 310.0,
  "burning_index": 80,
  "one_hr_fm": 5.0
}

r = requests.post("http://localhost:8000/api/plume", json=payload, timeout=30, )
print(r.status_code)
print(json.dumps(r.json(), indent=2))