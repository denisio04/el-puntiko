"use client";

interface SalesData {
  date: string;
  total: number;
}

interface SalesTrendChartProps {
  data: SalesData[];
  summary: {
    totalRevenue: number;
    avgDaily: number;
    totalOrders: number;
  };
}

export function SalesTrendChart({ data, summary }: SalesTrendChartProps) {
  const maxValue = Math.max(...data.map((d) => d.total), 1);
  const height = 200;
  const width = 100;
  const padding = 10;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (d.total / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const labelsToShow = data.filter((_, i) => i % Math.ceil(data.length / 7) === 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-gray-500">Ventas Totales</p>
          <p className="text-xl font-bold">${summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Promedio/Día</p>
          <p className="text-xl font-bold">${summary.avgDaily.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Pedidos</p>
          <p className="text-xl font-bold">{summary.totalOrders}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={areaPoints} fill="url(#areaGradient)" />

        <polyline
          points={points}
          fill="none"
          stroke="#000"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - padding * 2);
          const y = height - padding - (d.total / maxValue) * (height - padding * 2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1"
              fill="#000"
              className="opacity-0 hover:opacity-100 transition-opacity"
            />
          );
        })}
      </svg>

      <div className="flex justify-between mt-2 text-xs text-gray-400">
        {labelsToShow.map((d, i) => (
          <span key={i}>{formatDate(d.date)}</span>
        ))}
      </div>
    </div>
  );
}