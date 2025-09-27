# Wildfire Risk Assessment Application

An advanced wildfire risk assessment and simulation tool with interactive fire modeling, enhanced visualization, and AI-powered assistance.

## Features

### Enhanced Heat Map Visualization
- Expanded coverage with 12-point interpolation per station
- 100px radius for comprehensive visual coverage
- Reduced empty areas through intelligent data distribution
- Real-time weather station data integration

### Interactive Fire Simulation
- Click-to-place fire locations on the map
- Real-time plume dispersion calculations
- Wind-based fire spread predictions  
- Smoke plume visualization with time-stepped animation
- Support for multiple simultaneous fire sources

### AI-Powered Chat Assistant
- Integrated sidebar with collapsible interface
- Context-aware responses using current fire risk data
- Real-time safety recommendations
- Session management for continuous conversations

### Comprehensive Dashboard
- Live fire risk statistics
- Station-by-station assessment
- Weather condition monitoring
- Active fire counter
- Automatic data refresh every 60 seconds

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
Edit the `.env` file with your actual API keys:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_API_BASE_URL=your_backend_api_url
```

3. **Start the application**:
```bash
npm start
```

## Usage

### Adding Fire Locations
1. Click the "Add Fire Location" button
2. Click anywhere on the map to place a fire
3. View automatic plume calculations

### Viewing Smoke Plumes
- Toggle with the "Plumes" control
- Shows 6-hour projections
- Updates based on real wind conditions

### Using the AI Assistant
1. Click "AI Assistant" button
2. Ask questions about:
   - Current fire conditions
   - Risk assessments
   - Safety recommendations
   - Weather impacts

### Map Controls
- **Heat Map**: Toggle weather station risk visualization
- **Plumes**: Toggle smoke dispersion overlays
- **Clear**: Remove all fire markers
- **AI Assistant**: Open chat interface

## API Integration

The application connects to the following endpoints:
- `/api/fire-risk/assessment` - Fire risk data
- `/api/plume_dynamic` - Plume calculations
- `/api/llm/chat` - AI chat interface
- `/api/weather/observations` - Weather data

## Technical Stack

- **React 18** with TypeScript
- **Google Maps JavaScript API**
- **Tailwind CSS** for styling
- **Axios** for API calls
- **UUID** for unique IDs
- **React Icons** for UI icons

## Development

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Environment Variables

Required environment variables:
- `REACT_APP_GOOGLE_MAPS_API_KEY` - Google Maps API key with Maps JavaScript API and Visualization library enabled
- `REACT_APP_API_BASE_URL` - Backend API URL for FEMS data, plume calculations, and chat

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License
