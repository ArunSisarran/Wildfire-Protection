'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChatPanel from '@/components/ChatModal';
import RespiraLogo from '@/components/RespiraLogo';

export default function MapPage() {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white text-gray-900">
      <header className="border-b border-orange-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <RespiraLogo size="md" />
          </Link>
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-orange-700"
          >
            {isChatOpen ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </header>

      <main className="relative">
        {/* Map Container */}
        <div className="h-screen w-full relative">
          {/* Placeholder Map with Forest/Haze/Smoke Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-500 to-orange-400 opacity-80">
            {/* Forest/Haze/Smoke Visual Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-600/30 via-transparent to-gray-400/20"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-300/40 via-transparent to-orange-500/30"></div>
            
            {/* Overlay Pattern for Smoke Effect */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
              <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-orange-200/30 rounded-full blur-lg"></div>
              <div className="absolute bottom-1/3 left-1/3 w-40 h-40 bg-gray-300/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-28 h-28 bg-orange-300/25 rounded-full blur-xl"></div>
            </div>
          </div>

          {/* Map Content Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4 drop-shadow-lg">
                Interactive Fire Risk Map
              </h1>
              <p className="text-xl mb-8 drop-shadow-md opacity-90">
                Real-time wildfire smoke tracking and air quality monitoring
              </p>
              
              {/* Map Features Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl mb-2">🔥</div>
                  <h3 className="font-semibold mb-2">Active Fires</h3>
                  <p className="text-sm opacity-90">Real-time fire detection and tracking</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl mb-2">💨</div>
                  <h3 className="font-semibold mb-2">Smoke Plumes</h3>
                  <p className="text-sm opacity-90">Wind-driven smoke direction and spread</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="font-semibold mb-2">AQI Levels</h3>
                  <p className="text-sm opacity-90">Air quality index by region</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <h3 className="font-semibold text-sm mb-2">Map Controls</h3>
            <div className="space-y-2">
              <button className="w-full text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                Show Fires
              </button>
              <button className="w-full text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                Show Smoke
              </button>
              <button className="w-full text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                Show AQI
              </button>
            </div>
          </div>

          {/* Location Info */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <h3 className="font-semibold text-sm mb-2">Current Location</h3>
            <p className="text-xs text-gray-600">Empire State Building, NYC</p>
            <p className="text-xs text-gray-600">Risk Level: LOW</p>
            <p className="text-xs text-gray-600">AQI: 45</p>
          </div>
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />
    </div>
  );
}
