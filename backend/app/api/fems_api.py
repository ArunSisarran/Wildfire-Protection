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

def main():
    
    print("\n" + "=" * 80)
    print(" " * 20 + "FEMS FIRE RISK API - NEW YORK DATA")
    print("=" * 80)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Endpoint: https://fems.fs2c.usda.gov/api/climatology/graphql")
    print("=" * 80)
    
    api = FEMSFireRiskAPI()
    
    try:
        print("\nSTATION METADATA QUERY")
        print("-" * 60)
        print("Fetching New York RAWS stations with NFDRS data...")
        
        stations_response = api.get_ny_stations()
        stations = stations_response.get('data', {}).get('stationMetaData', {}).get('data', [])
        total = stations_response.get('data', {}).get('stationMetaData', {}).get('_metadata', {}).get('total_count', 0)
        
        print(f"Found {total} stations in New York\n")
        
        print("Station Details (first 3):")
        print("-" * 40)
        for i, station in enumerate(stations[:3], 1):
            print(f"\n{i}. {station.get('station_name', 'Unknown')}")
            print(f"   ID: {station.get('station_id')}")
            print(f"   Location: {station.get('latitude')}°N, {station.get('longitude')}°W")
            print(f"   Elevation: {station.get('elevation')} ft")
            print(f"   Status: {station.get('station_status')}")
            print(f"   Type: {station.get('station_type')}")
        
        active_stations = [s for s in stations if s.get('station_status') == 'A'][:3]
        if not active_stations:
            active_stations = stations[:3]
        station_ids = ','.join(str(s['station_id']) for s in active_stations)
        
        print(f"\n→ Using Station IDs for remaining queries: {station_ids}")
        
        print("\n" + "=" * 80)
        print("\n WEATHER OBSERVATIONS QUERY")
        print("-" * 60)
        print("Fetching weather data from last 24 hours...")
        
        weather_response = api.get_weather_observations(station_ids, hours_back=24)
        weather_data = weather_response.get('data', {}).get('weatherObs', {}).get('data', [])
        weather_count = weather_response.get('data', {}).get('weatherObs', {}).get('_metadata', {}).get('total_count', 0)
        
        print(f"Retrieved {weather_count} weather observations\n")
        
        if weather_data:
            print("Current Weather Conditions:")
            print("-" * 40)
            for obs in weather_data[:5]:  # Show first 5
                print(f"\n• Station: {obs.get('station_name', 'Unknown')} (ID: {obs.get('station_id')})")
                print(f"  Time: {obs.get('observation_time')}")
                print(f"  Temperature: {obs.get('temperature')}°F")
                print(f"  Humidity: {obs.get('relative_humidity')}%")
                print(f"  Wind: {obs.get('wind_speed')} mph from {obs.get('wind_direction')}°")
                print(f"  Gust: {obs.get('peak_gust_speed')} mph")
                print(f"  Rain (24hr): {obs.get('hr24Precipitation')} in")
        else:
            print("No weather data available")
        
        print("\n" + "=" * 80)
        print("\nNFDRS FIRE DANGER OBSERVATIONS QUERY")
        print("-" * 60)
        print("Fetching fire danger indices from last 7 days...")
        
        nfdrs_response = api.get_nfdrs_observations(station_ids, days_back=7)
        nfdrs_data = nfdrs_response.get('data', {}).get('nfdrsObs', {}).get('data', [])
        nfdrs_count = nfdrs_response.get('data', {}).get('nfdrsObs', {}).get('_metadata', {}).get('total_count', 0)
        
        print(f"Retrieved {nfdrs_count} NFDRS observations\n")
        
        if nfdrs_data:
            print("Fire Danger Indices (most recent per station):")
            print("-" * 40)
            
            seen = set()
            for obs in nfdrs_data:
                if obs['station_id'] not in seen:
                    print(f"\n• Station ID: {obs.get('station_id')}")
                    print(f"  Date: {obs.get('nfdr_date')} at {obs.get('nfdr_time')}:00")
                    print(f"  Fuel Model: {obs.get('fuel_model')}")
                    print(f"  \n  Fire Indices:")
                    print(f"    - Burning Index: {obs.get('burning_index')}")
                    print(f"    - Ignition Component: {obs.get('ignition_component')}")
                    print(f"    - Spread Component: {obs.get('spread_component')}")
                    print(f"    - Energy Release: {obs.get('energy_release_component')}")
                    print(f"    - KBDI (Drought): {obs.get('kbdi')}")
                    print(f"  \n  Fuel Moisture:")
                    print(f"    - 1-hr: {obs.get('one_hr_tl_fuel_moisture')}%")
                    print(f"    - 10-hr: {obs.get('ten_hr_tl_fuel_moisture')}%")
                    print(f"    - 100-hr: {obs.get('hun_hr_tl_fuel_moisture')}%")
                    print(f"    - 1000-hr: {obs.get('thou_hr_tl_fuel_moisture')}%")
                    
                    seen.add(obs['station_id'])
                    if len(seen) >= 2:
                        break
        else:
            print("No NFDRS data available")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        print("\nTroubleshooting:")
        print("  • Check internet connection")
        print("  • Verify API is accessible")
        print("  • Some stations may not have recent data")

if __name__ == "__main__":
    main()
