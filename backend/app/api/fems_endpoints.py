import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import time

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
        """
        Fetches metadata for all stations, not limited to New York.
        The stateId filter has been removed.
        """
        query = """
        query {
            stationMetaData(
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

    def get_station_metadata(self, station_id: str) -> Dict:
            """Fetches metadata for a single station."""
            query = f"""
            query {{
                stationMetaData(stationIds: "{station_id}") {{
                    data {{
                        station_id
                        station_name
                        latitude
                        longitude
                    }}
                }}
            }}
            """
            return self.query_graphql(query)