import React from 'react';

interface CounterDisplayProps {
  label: string;
  value: number;
  color?: string;
  isLarge?: boolean;
}

const CounterDisplay: React.FC<CounterDisplayProps> = ({ label, value, color = 'text-slate-800', isLarge = false }) => {
  const valueClasses = isLarge 
    ? "text-6xl font-bold" 
    : "text-4xl font-semibold";

  const labelClasses = isLarge
    ? "text-lg font-medium text-slate-600"
    : "text-base font-normal text-slate-500";

  return (
    <div className={`p-4 rounded-xl ${isLarge ? 'bg-slate-200' : 'bg-white border border-slate-200'}`}>
      <p className={labelClasses}>{label}</p>
      <p className={`${valueClasses} ${color} tracking-tight`}>{value.toLocaleString()}</p>
    </div>
  );
};

export default CounterDisplay;