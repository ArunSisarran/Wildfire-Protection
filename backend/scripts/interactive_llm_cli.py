"""Simple CLI wrapper to chat with the wildfire risk assessment LLM."""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Ensure the backend package is importable
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

load_dotenv()

from app.api.llm_endpoint import (
    DEFAULT_LOCATION,
    build_chat_response,
    get_fire_risk_context,
)

def _print_fire_risk_summary(fire_risk: Optional[Dict[str, Any]]) -> None:
    if not fire_risk: return
    # ... (function content remains the same)

def interactive_chat(location: Optional[Dict[str, float]] = None) -> None:
    """Start an interactive CLI chat session with the LLM."""
    session_id = f"cli-{datetime.utcnow().timestamp():.0f}"
    location_to_use = location or DEFAULT_LOCATION

    # --- UPDATED INTRO ---
    print("\nWelcome to the Respira Wildfire Assistant.")
    print("You can ask for the risk at your location or general questions about wildfire safety.")
    print("Type 'exit' to quit, or ':risk' to show the current data context.\n")

    # Pre-fetch initial risk context for the default location
    initial_risk_data = get_fire_risk_context(location_to_use)
    _print_fire_risk_summary(initial_risk_data)

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input: continue
        if user_input.lower() in {"exit", "quit", ":q"}:
            print("Goodbye!")
            break

        if user_input.lower() == ":risk":
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
        print(f"\nAssistant: {response.response}\n")


if __name__ == "__main__":
    interactive_chat()
