import React from 'react';

interface RespiraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function RespiraLogo({ className = '', size = 'md' }: RespiraLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} relative`}>
        {/* Cloud Background */}
        <div className="absolute inset-0 bg-teal-700 rounded-full opacity-90"></div>
        
        {/* Fire Flames */}
        <div className="absolute inset-0 flex items-end justify-center">
          <div className="relative">
            {/* Main flame */}
            <div className="w-3 h-4 bg-orange-500 rounded-t-full transform -rotate-12"></div>
            {/* Secondary flame */}
            <div className="absolute top-0 left-1 w-2 h-3 bg-yellow-400 rounded-t-full transform rotate-6"></div>
            {/* Third flame */}
            <div className="absolute top-0 right-1 w-2 h-3 bg-orange-400 rounded-t-full transform -rotate-6"></div>
          </div>
        </div>
        
        {/* Tree */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-3 bg-teal-700 transform rotate-45"></div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-teal-700 rounded-full"></div>
        </div>
        
        {/* Wind Lines */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="flex flex-col gap-1">
            <div className="w-2 h-0.5 bg-teal-400 rounded-full"></div>
            <div className="w-2 h-0.5 bg-teal-400 rounded-full"></div>
            <div className="w-2 h-0.5 bg-teal-400 rounded-full"></div>
          </div>
        </div>
      </div>
      
      {/* Logo Text */}
      <span className={`font-bold text-teal-700 ${textSizes[size]}`}>
        Respira
      </span>
    </div>
  );
}
