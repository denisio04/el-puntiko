import * as React from "react";
import { formatPrice } from "@/lib/utils";

interface StatsCardProps {
  title: string | React.ReactNode;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  isCurrency?: boolean;
}

export function StatsCard({ title, value, subtitle, icon, trend, isCurrency = true }: StatsCardProps) {
  const displayValue = typeof value === "number" 
    ? (isCurrency ? formatPrice(value) : value.toLocaleString())
    : value;

  return (
    <div className="bg-white rounded-lg border p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-600 truncate">{typeof title === "string" ? title : title}</p>
          <p className="text-lg sm:text-2xl font-bold mt-1 truncate">
            {displayValue}
          </p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-xs sm:text-sm mt-2 ${
                trend.positive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.positive ? "+" : ""}
              {trend.value}% vs mes anterior
            </p>
          )}
        </div>
        {icon && (
          <div className="text-gray-400 flex-shrink-0">{icon}</div>
        )}
      </div>
    </div>
  );
}