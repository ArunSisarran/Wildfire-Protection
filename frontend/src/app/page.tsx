'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

export default function Home() {
  const [apiStatus, setApiStatus] = useState<string>('');
  const [apiMessage, setApiMessage] = useState<string>('');

  const testApiConnection = async () => {
    setApiStatus('Testing...');
    try {
      const healthResponse = await apiClient.health();
      if (healthResponse.data) {
        setApiStatus('✅ Backend connected');
        const helloResponse = await apiClient.hello('Wildfire Protection');
        if (helloResponse.data) {
          setApiMessage(helloResponse.data.message);
        }
      } else {
        setApiStatus('❌ Backend connection failed');
        setApiMessage(healthResponse.error || 'Unknown error');
      }
    } catch (error) {
      setApiStatus('❌ Network error');
      setApiMessage('Cannot reach backend API');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white text-gray-900">
      <header className="border-b border-orange-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            Wildfire Protection
          </h1>
          <nav className="hidden sm:flex gap-6 text-sm font-medium">
            <a className="hover:text-orange-600" href="#problem">Problem</a>
            <a className="hover:text-orange-600" href="#audience">Audience</a>
            <a className="hover:text-orange-600" href="#features">Core features</a>
          </nav>
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
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-md bg-orange-600 px-5 py-3 text-white font-semibold shadow-sm hover:bg-orange-700"
                >
                  Explore features
                </a>
                <a
                  href="#audience"
                  className="inline-flex items-center justify-center rounded-md border border-orange-200 px-5 py-3 font-semibold text-orange-700 bg-white hover:bg-orange-50"
                >
                  Who we help
                </a>
              </div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-white p-6 shadow-sm">
              <div className="rounded-lg h-60 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-800 font-semibold">
                Real-time smoke and AQI insights
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Concept preview. Future version will visualize wind-driven smoke
                plumes, affected radius, and AQI forecasts by region.
              </p>
              
              {/* API Test Section */}
              <div className="mt-4 pt-4 border-t border-orange-200">
                <h4 className="font-semibold text-sm mb-2">Backend Connection Test</h4>
                <button
                  onClick={testApiConnection}
                  className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                >
                  Test API
                </button>
                {apiStatus && (
                  <div className="mt-2">
                    <p className="text-xs font-medium">{apiStatus}</p>
                    {apiMessage && (
                      <p className="text-xs text-gray-600">{apiMessage}</p>
                    )}
                  </div>
                )}
              </div>
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
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-gray-600">
          © {new Date().getFullYear()} Wildfire Protection
        </div>
      </footer>
    </div>
  );
}
