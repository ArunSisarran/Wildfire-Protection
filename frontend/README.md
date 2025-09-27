# Fire Risk Heat Map Application

A real-time fire risk assessment application that visualizes wildfire danger levels across New York State using interactive heat maps and Google Maps integration.

## Features

- 🗺️ **Interactive Google Maps** with heat map visualization
- 🔥 **Real-time Fire Risk Data** from FEMS API
- 📊 **Risk Assessment Dashboard** with live statistics
- 🎨 **Color-coded Risk Levels** (Low to Extreme)
- 📍 **Station Markers** with detailed information
- 📱 **Responsive Design** for desktop and mobile
- 🔄 **Auto-refresh** every 60 seconds
- 💾 **Mock Data Fallback** for development

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Google Maps API key
- FEMS API endpoint (or use mock data)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fire-risk-heatmap
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
REACT_APP_FEMS_API_BASE_URL=https://your-fems-api.vercel.app
```

## Development

Start the development server:
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Build

Create a production build:
```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Project Structure

```
src/
├── components/         # React components
│   ├── MapContainer.tsx
│   ├── DataPanel.tsx
│   ├── FireRiskLegend.tsx
│   ├── ControlsPanel.tsx
│   ├── StationInfoPopup.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
├── context/           # React context providers
│   └── FireRiskContext.tsx
├── hooks/             # Custom React hooks
│   ├── useFireRiskData.ts
│   └── useGoogleMaps.ts
├── services/          # API services
│   └── apiService.ts
├── types/             # TypeScript type definitions
│   └── index.ts
├── utils/             # Utility functions
│   ├── constants.ts
│   └── helpers.ts
└── styles/            # CSS files
    ├── index.css
    └── App.css
```

## API Endpoints

The application uses the following FEMS API endpoints:

- `/api/stations/ny` - Get NY fire stations
- `/api/fire-risk/assessment` - Complete risk assessment
- `/api/weather/observations` - Weather data
- `/api/nfdrs/observations` - Fire danger indices

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Google Maps API** - Map visualization
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Context API** - State management

## Risk Level Classification

| Level | Score Range | Color | Description |
|-------|------------|-------|-------------|
| LOW | 0-20% | Green | Minimal fire risk |
| MODERATE | 20-40% | Yellow-Green | Some fire risk - stay alert |
| HIGH | 40-60% | Yellow | Significant fire risk - exercise caution |
| VERY HIGH | 60-80% | Orange | Dangerous conditions - extreme caution |
| EXTREME | 80-100% | Red | Critical fire danger - avoid outdoor burning |

## Deployment

### Vercel
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
netlify deploy --prod --dir=build
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FEMS (Forest Service Fire and Emergency Management System) for fire risk data
- Google Maps Platform for mapping services
- RAWS (Remote Automated Weather Stations) network for weather data
