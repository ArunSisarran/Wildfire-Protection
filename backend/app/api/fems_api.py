import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pandas as pd

class FEMSFireRiskAPI:
    def __init__(self):
        self.base_url = "https://fems.fs2c.usda.gov/api/climatology/graphql"
        self.headers = {
            'Content-Type': 'application/json',
        }
        
    def query_graphql(self, query: str) -> Dict:
        response = requests.post(
            self.base_url,
            json={'query': query},
            headers=self.headers
        )
        
        if response.status_code != 200:
            raise Exception(f"Query failed with status {response.status_code}: {response.text}")
            
        return response.json()
    
    def get_ny_stations(self) -> Dict:
        query = """
        query {
            stationMetaData(
                stateId: "NY"
                hasHistoricData: TRUE
                stationType: "RAWS (SAT NFDRS)"
                returnAll: true
            ) {
                _metadata {
                    total_count
                }
                data {
                    station_id
                    wrcc_id
                    station_name
                    latitude
                    longitude
                    elevation
                    station_type
                    station_status
                    time_zone
                }
            }
        }
        """
        return self.query_graphql(query)
    
    def get_weather_observations(self, station_ids: str, hours_back: int = 24) -> Dict:

        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours_back)
        
        query = f"""
        query {{
            weatherObs(
                startDateTimeRange: "{start_time.strftime('%Y-%m-%dT%H:%M:%SZ')}"
                endDateTimeRange: "{end_time.strftime('%Y-%m-%dT%H:%M:%SZ')}"
                stationIds: "{station_ids}"
                timeZone: "America/New_York"
            ) {{
                _metadata {{
                    total_count
                }}
                data {{
                    station_id
                    station_name
                    latitude
                    longitude
                    observation_time
                    temperature
                    relative_humidity
                    hourly_precip
                    hr24Precipitation
                    hr48Precipitation
                    hr72Precipitation
                    wind_speed
                    wind_direction
                    peak_gust_speed
                    peak_gust_dir
                    sol_rad
                }}
            }}
        }}
        """
        return self.query_graphql(query)
    
    def get_nfdrs_observations(self, station_ids: str, days_back: int = 7) -> Dict:

        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days_back)
        
        query = f"""
        query {{
            nfdrsObs(
                startDateRange: "{start_date.strftime('%Y-%m-%d')}"
                endDateRange: "{end_date.strftime('%Y-%m-%d')}"
                stationIds: "{station_ids}"
                nfdrType: "O"
                fuelModels: "Y"
                startHour: 12
                endHour: 14
            ) {{
                _metadata {{
                    total_count
                }}
                data {{
                    station_id
                    nfdr_date
                    nfdr_time
                    fuel_model
                    kbdi
                    one_hr_tl_fuel_moisture
                    ten_hr_tl_fuel_moisture
                    hun_hr_tl_fuel_moisture
                    thou_hr_tl_fuel_moisture
                    ignition_component
                    spread_component
                    energy_release_component
                    burning_index
                    herbaceous_lfi_fuel_moisture
                    woody_lfi_fuel_moisture
                }}
            }}
        }}
        """
        return self.query_graphql(query)
    
    def get_fire_danger_percentiles(self, station_ids: str) -> Dict:

        current_date = datetime.now()
        start_month_day = (current_date - timedelta(days=7)).strftime("%m-%d")
        end_month_day = current_date.strftime("%m-%d")
        
        query = f"""
        query {{
            percentileLevels(
                stationIds: "{station_ids}"
                fuelModel: "Y"
                climatology: {{
                    startYear: 2015
                    endYear: 2024
                    startMonthDay: "{start_month_day}"
                    endMonthDay: "{end_month_day}"
                    startHour: 10
                    endHour: 20
                }}
                percentileLevels: "60,70,80,90,97"
            ) {{
                data {{
                    station_id
                    kbdi {{
                        six0th
                        seven0th
                        eight0th
                        nine0th
                        nine7th
                    }}
                    energy_release_component {{
                        six0th
                        seven0th
                        eight0th
                        nine0th
                        nine7th
                    }}
                    burning_index {{
                        six0th
                        seven0th
                        eight0th
                        nine0th
                        nine7th
                    }}
                    spread_component {{
                        six0th
                        seven0th
                        eight0th
                        nine0th
                        nine7th
                    }}
                }}
            }}
        }}
        """
        return self.query_graphql(query)

    def calculate_fire_risk_score(self, nfdrs_data: Dict, weather_data: Dict) -> float:
        score = 0
        weights = {
            'burning_index': 0.25,
            'ignition_component': 0.20,
            'spread_component': 0.15,
            'kbdi': 0.10,
            'fuel_moisture': 0.15,
            'wind_speed': 0.10,
            'relative_humidity': 0.05
        }
        
        bi = min(nfdrs_data.get('burning_index', 0) / 2, 100)
        score += bi * weights['burning_index']
        
        ic = nfdrs_data.get('ignition_component', 0)
        score += ic * weights['ignition_component']
        
        sc = min(nfdrs_data.get('spread_component', 0), 100)
        score += sc * weights['spread_component']
        
        kbdi = nfdrs_data.get('kbdi', 0) / 8
        score += kbdi * weights['kbdi']
        
        fuel_1hr = nfdrs_data.get('one_hr_tl_fuel_moisture', 30)
        fuel_risk = max(0, 100 - (fuel_1hr * 3.33))
        score += fuel_risk * weights['fuel_moisture']
        
        wind = weather_data.get('wind_speed', 0)
        wind_risk = min(wind * 3, 100)
        score += wind_risk * weights['wind_speed']
        
        rh = weather_data.get('relative_humidity', 50)
        rh_risk = max(0, 100 - rh)
        score += rh_risk * weights['relative_humidity']
        
        return round(score, 2)

def main():
    print("=" * 60)
    print("FEMS Fire Risk Assessment - New York State")
    print("=" * 60)
    
    api = FEMSFireRiskAPI()
    
    try:
        print("\n1. Fetching New York weather stations...")
        stations_response = api.get_ny_stations()
        stations = stations_response['data']['stationMetaData']['data']
        
        if not stations:
            print("No stations found in New York")
            return
        
        print(f"   Found {len(stations)} stations in New York")
        
        active_stations = [s for s in stations if s.get('station_status') == 'A'][:5]
        station_ids = ','.join(str(s['station_id']) for s in active_stations)
        
        print(f"\n   Using stations: {station_ids}")
        for station in active_stations:
            print(f"     - {station['station_name']} ({station['station_id']})")
            print(f"       Lat: {station['latitude']}, Lon: {station['longitude']}")
        
        print("\n2. Fetching current weather conditions...")
        weather_response = api.get_weather_observations(station_ids)
        weather_data = weather_response['data']['weatherObs']['data']
        
        print("\n3. Fetching fire danger indices...")
        nfdrs_response = api.get_nfdrs_observations(station_ids)
        nfdrs_data = nfdrs_response['data']['nfdrsObs']['data']
        
        print("\n" + "=" * 60)
        print("FIRE RISK ANALYSIS RESULTS")
        print("=" * 60)
        
        risk_assessments = []
        
        for station in active_stations:
            station_id = station['station_id']
            
            station_weather = next((w for w in weather_data if w['station_id'] == station_id), {})
            station_nfdrs = next((n for n in nfdrs_data if n['station_id'] == station_id), {})
            
            if not station_nfdrs:
                continue
            
            print(f"\nStation: {station['station_name']}")
            print(f"Location: {station['latitude']}, {station['longitude']}")
            print("-" * 40)
            
            risk_score = api.calculate_fire_risk_score(station_nfdrs, station_weather)
            
            if risk_score < 20:
                risk_level = "LOW"
            elif risk_score < 40:
                risk_level = "MODERATE"
            elif risk_score < 60:
                risk_level = "HIGH"
            elif risk_score < 80:
                risk_level = "VERY HIGH"
            else:
                risk_level = "EXTREME"
            
            print(f"\n🔥 FIRE RISK SCORE: {risk_score}/100 - {risk_level}")
            
            print(f"\nFire Danger Indices:")
            print(f"  • Burning Index: {station_nfdrs.get('burning_index', 'N/A')}")
            print(f"  • Ignition Component: {station_nfdrs.get('ignition_component', 'N/A')}%")
            print(f"  • Spread Component: {station_nfdrs.get('spread_component', 'N/A')}")
            print(f"  • Energy Release Component: {station_nfdrs.get('energy_release_component', 'N/A')}")
            print(f"  • KBDI (Drought Index): {station_nfdrs.get('kbdi', 'N/A')}")
            
            print(f"\nFuel Moisture Content:")
            print(f"  • 1-hour fuels: {station_nfdrs.get('one_hr_tl_fuel_moisture', 'N/A')}%")
            print(f"  • 10-hour fuels: {station_nfdrs.get('ten_hr_tl_fuel_moisture', 'N/A')}%")
            print(f"  • 100-hour fuels: {station_nfdrs.get('hun_hr_tl_fuel_moisture', 'N/A')}%")
            print(f"  • 1000-hour fuels: {station_nfdrs.get('thou_hr_tl_fuel_moisture', 'N/A')}%")
            
            if station_weather:
                print(f"\nWeather Conditions:")
                print(f"  • Temperature: {station_weather.get('temperature', 'N/A')}°F")
                print(f"  • Relative Humidity: {station_weather.get('relative_humidity', 'N/A')}%")
                print(f"  • 24hr Precipitation: {station_weather.get('hr24Precipitation', 'N/A')} inches")
                
            risk_assessments.append({
                'station': station['station_name'],
                'risk_score': risk_score,
                'risk_level': risk_level,
                'lat': station['latitude'],
                'lon': station['longitude']
            })
        
        print("\n" + "=" * 60)
        print("RISK SUMMARY - HIGH RISK AREAS")
        print("=" * 60)
        
        high_risk = [r for r in risk_assessments if r['risk_score'] >= 40]
        if high_risk:
            high_risk.sort(key=lambda x: x['risk_score'], reverse=True)
            print("\n⚠️  HIGH FIRE RISK LOCATIONS:")
            for area in high_risk:
                print(f"  • {area['station']}: {area['risk_level']} (Score: {area['risk_score']})")
                print(f"    Location: {area['lat']}, {area['lon']}")
        else:
            print("\n✓ No high-risk areas detected at this time")
        
        print("\n" + "=" * 60)
        print("Assessment complete. Monitor high-risk areas closely.")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nNote: This is a proof of concept. Some stations may not have recent data.")

if __name__ == "__main__":
    main()

