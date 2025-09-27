import requests, json

payload = {
  "lat": 40.7128,
  "lon": -74.0060,
  "hours": [0.5, 1, 2],   # target hours you want frames for
  "wind_speed": 8.0,      # m/s
  "wind_dir_from": 310.0, # degrees, wind blowing from NW
  "burning_index": 80,
  "one_hr_fm": 5.0,
  "step_minutes": 30,     # march every 30 min
  "simulation_mode": "segment",  # or "cumulative_union", "cumulative_last"
  "only_target_frames": True    # True = only return exact 0.5h,1h,2h frames
}

payload2 = {
  "lat": 40.7128,
  "lon": -74.0060,
  "hours": [0.5,1,2],
  "wind_speed": 8.0,
  "wind_dir_from": 310.0,
  "burning_index": 80,
  "one_hr_fm": 5.0
}

r = requests.post("http://localhost:8000/api/plume_dynamic", json=payload, timeout=30)
print(r.status_code)
print(json.dumps(r.json(), indent=2))
