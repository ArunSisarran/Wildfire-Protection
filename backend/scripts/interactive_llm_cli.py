"""Simple CLI wrapper to chat with the wildfire risk assessment LLM."""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Ensure the backend package is importable when the script is executed from the repository root
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

load_dotenv()

from app.api.llm_endpoint import (  # noqa: E402
    EMPIRE_STATE_COORDS,
    build_chat_response,
    get_fire_risk_context,
)



def _print_fire_risk_summary(fire_risk: Optional[Dict[str, Any]]) -> None:
    fire_risk = fire_risk or {}
    risk_level = fire_risk.get("risk_level", "UNKNOWN")
    risk_score = fire_risk.get("risk_score")
    station = fire_risk.get("station", {})
    warnings = fire_risk.get("warnings", [])

    station_name = station.get("station_name", "Unknown station")
    distance = station.get("distance_miles")
    distance_text = f" (~{distance} mi away)" if distance is not None else ""

    print("\n--- Fire Risk Snapshot ---")
    print(f"Station: {station_name}{distance_text}")
    print(f"Risk Level: {risk_level}")
    if risk_score is not None:
        print(f"Risk Score: {risk_score}/100")

    weather = fire_risk.get("weather") or {}
    if weather:
        print("Weather: " + ", ".join(
            filter(
                None,
                [
                    f"Temp {weather.get('temperature')}°F" if weather.get('temperature') is not None else None,
                    f"RH {weather.get('relative_humidity')}%" if weather.get('relative_humidity') is not None else None,
                    f"Wind {weather.get('wind_speed')} mph" if weather.get('wind_speed') is not None else None,
                ],
            )
        ))

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f" - {warning}")
    print("---------------------------\n")


def interactive_chat(location: Optional[Dict[str, float]] = None) -> None:
    """Start an interactive CLI chat session with the LLM."""

    session_id = f"cli-{datetime.utcnow().timestamp():.0f}"
    location_to_use = location or EMPIRE_STATE_COORDS

    print("Wildfire Risk Assistant (type 'exit' to quit, ':risk' to show context)\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue

        lower_input = user_input.lower()
        if lower_input in {"exit", "quit", ":q"}:
            print("Goodbye!")
            break

        if lower_input == ":risk":
            risk_data = get_fire_risk_context(location_to_use)
            if "error" in risk_data:
                print(f"\nUnable to retrieve fire risk data: {risk_data['error']}\n")
            else:
                _print_fire_risk_summary(risk_data)
            continue

        response = build_chat_response(
            message=user_input,
            session_id=session_id,
            location=location_to_use,
        )
        _print_fire_risk_summary(response.fire_risk_data)
        print(f"Assistant: {response.response}\n")


if __name__ == "__main__":
    interactive_chat()
