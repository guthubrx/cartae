/**
 * DownloadChart - Graphique des téléchargements sur 30 jours
 * Simple SVG bar chart (sans dépendance externe)
 */

import React from 'react';

export interface DownloadChartProps {
  data: Array<{ date: string; count: number }>;
}

export function DownloadChart({ data }: DownloadChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <span className="text-6xl mb-4 block">📊</span>
        <p className="text-gray-600">No download data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const chartWidth = 800;
  const chartHeight = 300;
  const barWidth = chartWidth / data.length - 4;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  // Format date for labels (show every 5 days)
  const formatDate = (dateStr: string, index: number) => {
    if (index % 5 !== 0 && index !== data.length - 1) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Download Trend</h3>
        <p className="text-sm text-gray-600">Daily downloads over the last 30 days</p>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={chartWidth + padding.left + padding.right}
          height={chartHeight + padding.top + padding.bottom}
          className="mx-auto"
        >
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = padding.top + chartHeight * (1 - ratio);
            const value = Math.round(maxCount * ratio);

            return (
              <g key={ratio}>
                {/* Grid line */}
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                {/* Label */}
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.count / maxCount) * chartHeight;
            const x = padding.left + index * (barWidth + 4);
            const y = padding.top + chartHeight - barHeight;

            return (
              <g key={item.date}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#3b82f6"
                  rx="2"
                  className="hover:fill-blue-700 transition-colors cursor-pointer"
                >
                  <title>
                    {item.date}: {item.count} downloads
                  </title>
                </rect>

                {/* X-axis label */}
                {formatDate(item.date, index) && (
                  <text
                    x={x + barWidth / 2}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {formatDate(item.date, index)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={padding.left - 50}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            transform={`rotate(-90, ${padding.left - 50}, ${padding.top + chartHeight / 2})`}
          >
            Downloads
          </text>

          {/* X-axis label */}
          <text
            x={padding.left + chartWidth / 2}
            y={padding.top + chartHeight + 35}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
          >
            Date
          </text>
        </svg>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </p>
          <p className="text-xs text-gray-600">Total (30d)</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(data.reduce((sum, d) => sum + d.count, 0) / data.length)}
          </p>
          <p className="text-xs text-gray-600">Avg/Day</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{maxCount}</p>
          <p className="text-xs text-gray-600">Peak Day</p>
        </div>
      </div>
    </div>
  );
}
