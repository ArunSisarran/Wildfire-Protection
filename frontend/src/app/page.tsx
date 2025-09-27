'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChatPanel from '@/components/ChatModal';
import RespiraLogo from '@/components/RespiraLogo';

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white text-gray-900">
      <header className="border-b border-orange-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <RespiraLogo size="md" />
          <Link
            href="/map"
            className="inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-white font-semibold shadow-sm hover:bg-orange-700"
          >
            Try now
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
                Early warnings for wildfire smoke and air quality risk
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                Wildfires are more frequent and their smoke travels far. We surface
                fast, actionable alerts about smoke direction, spread radius, and
                expected AQI—so people can prepare before stepping outside.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="inline-flex items-center justify-center rounded-md bg-orange-600 px-5 py-3 text-white font-semibold shadow-sm hover:bg-orange-700"
                >
                  🔥 Chat with Fire Risk Assistant
                </button>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center rounded-md border border-orange-200 px-5 py-3 font-semibold text-orange-700 bg-white hover:bg-orange-50"
                >
                  Explore features
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-white p-6 shadow-sm">
              {/* Forest/Haze/Smoke Image */}
              <div className="relative h-60 rounded-lg overflow-hidden">
                {/* Forest Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-500 to-green-400">
                  {/* Haze/Smoke Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-600/40 via-transparent to-gray-400/20"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-300/50 via-transparent to-orange-500/40"></div>
                  
                  {/* Smoke Effect */}
                  <div className="absolute inset-0 opacity-40">
                    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/30 rounded-full blur-xl"></div>
                    <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-orange-200/40 rounded-full blur-lg"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-40 h-40 bg-gray-300/30 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-28 h-28 bg-orange-300/35 rounded-full blur-xl"></div>
                  </div>
                  
                  {/* Overlay Text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">🌲</div>
                      <h3 className="text-lg font-bold drop-shadow-lg">Forest Fire Risk</h3>
                      <p className="text-sm opacity-90 drop-shadow-md">Real-time monitoring</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Visual representation of forest areas with smoke and haze effects, showing the environmental impact of wildfires.
              </p>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="py-12 sm:py-16">
          <h3 className="text-2xl font-bold mb-4">Problem statement</h3>
          <p className="text-gray-700 leading-relaxed">
            Wildfires are becoming increasingly rampant and hazardous. Respiratory
            issues are also rising—adult asthma prevalence has increased notably in
            recent years. Smoke can travel across states, and public alerts about
            worsening air quality often arrive too late. This delay endangers
            everyone, especially the elderly, asthma patients, and kids who may step
            outside without protection.
          </p>
        </section>

        {/* Audience */}
        <section id="audience" className="py-12 sm:py-16">
          <h3 className="text-2xl font-bold mb-4">Target audience</h3>
          <p className="text-gray-700 leading-relaxed mb-6">
            We aim to help everyone affected by wildfire smoke, with a focus on
            those most at risk: the elderly, people with asthma, and children.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-orange-200 bg-white p-4">
              <h4 className="font-semibold">Elderly</h4>
              <p className="text-sm text-gray-700">Early alerts to limit exposure and plan indoors.</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-white p-4">
              <h4 className="font-semibold">Asthma patients</h4>
              <p className="text-sm text-gray-700">Risk-aware guidance and mask reminders.</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-white p-4">
              <h4 className="font-semibold">Kids</h4>
              <p className="text-sm text-gray-700">School/outdoor activity advisories for guardians.</p>
            </div>
          </div>
        </section>

        {/* Core features */}
        <section id="features" className="py-12 sm:py-16">
          <h3 className="text-2xl font-bold mb-6">Core features</h3>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <li className="rounded-lg border border-orange-200 bg-white p-5">
              <h4 className="font-semibold mb-2">Smoke direction & spread</h4>
              <p className="text-sm text-gray-700">
                Rapid modeling of wind-driven smoke plumes soon after a wildfire
                starts, including estimated affected radius from the epicenter.
              </p>
            </li>
            <li className="rounded-lg border border-orange-200 bg-white p-5">
              <h4 className="font-semibold mb-2">AQI forecasts</h4>
              <p className="text-sm text-gray-700">
                Short-term AQI predictions for impacted areas to guide protective
                steps like masks and air purifiers.
              </p>
            </li>
            <li className="rounded-lg border border-orange-200 bg-white p-5">
              <h4 className="font-semibold mb-2">Risk by demographic</h4>
              <p className="text-sm text-gray-700">
                Clear risk levels tailored for elderly, asthma patients, and kids
                (e.g., AQI 120 = moderate for healthy adults, high for asthma).
              </p>
            </li>
          </ul>
        </section>
      </main>

      <footer className="mt-10 border-t border-orange-200/60 bg-white/60">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <RespiraLogo size="sm" />
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Respira
          </div>
        </div>
      </footer>

      {/* Chat Panel */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />
    </div>
  );
}
