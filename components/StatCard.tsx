import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, trend }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        {trend && <p className="text-xs text-green-600 mt-2 font-medium">{trend}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={24} className="text-white opacity-90" />
      </div>
    </div>
  );
};