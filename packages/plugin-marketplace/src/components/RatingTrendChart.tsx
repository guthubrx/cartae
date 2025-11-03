/**
 * RatingTrendChart - Graphique de l'évolution des ratings sur 30 jours
 * Line chart montrant average rating + volume
 */

import React from 'react';

export interface RatingTrendChartProps {
  data: Array<{ date: string; average: number; count: number }>;
}

export function RatingTrendChart({ data }: RatingTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <span className="text-6xl mb-4 block">⭐</span>
        <p className="text-gray-600">No rating data available</p>
      </div>
    );
  }

  const chartWidth = 800;
  const chartHeight = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  // Rating scale: 1-5
  const minRating = 1;
  const maxRating = 5;
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Calculate points for line chart
  const points = data.map((item, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y =
      padding.top + chartHeight * (1 - (item.average - minRating) / (maxRating - minRating));
    return { x, y, ...item };
  });

  // Create SVG path for line
  const linePath = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    })
    .join(' ');

  // Format date for labels
  const formatDate = (dateStr: string, index: number) => {
    if (index % 5 !== 0 && index !== data.length - 1) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Rating Trend</h3>
        <p className="text-sm text-gray-600">
          Average rating evolution over the last 30 days
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={chartWidth + padding.left + padding.right}
          height={chartHeight + padding.top + padding.bottom}
          className="mx-auto"
        >
          {/* Y-axis (ratings 1-5) */}
          {[1, 2, 3, 4, 5].map(rating => {
            const y =
              padding.top + chartHeight * (1 - (rating - minRating) / (maxRating - minRating));

            return (
              <g key={rating}>
                {/* Grid line */}
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray={rating === 3 ? '4' : '0'}
                />
                {/* Label */}
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {rating}★
                </text>
              </g>
            );
          })}

          {/* Area under line (gradient fill) */}
          <defs>
            <linearGradient id="ratingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`}
            fill="url(#ratingGradient)"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point, index) => (
            <g key={point.date}>
              {/* Circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth="2"
                className="hover:r-6 transition-all cursor-pointer"
              >
                <title>
                  {point.date}: {point.average.toFixed(2)} ★ ({point.count} ratings)
                </title>
              </circle>

              {/* Volume bar (small, at bottom) */}
              {point.count > 0 && (
                <rect
                  x={point.x - 2}
                  y={
                    padding.top +
                    chartHeight -
                    (point.count / maxCount) * (chartHeight * 0.15)
                  }
                  width="4"
                  height={(point.count / maxCount) * (chartHeight * 0.15)}
                  fill="#d1d5db"
                  opacity="0.6"
                >
                  <title>{point.count} new ratings</title>
                </rect>
              )}

              {/* X-axis label */}
              {formatDate(point.date, index) && (
                <text
                  x={point.x}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {formatDate(point.date, index)}
                </text>
              )}
            </g>
          ))}

          {/* Y-axis label */}
          <text
            x={padding.left - 50}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            transform={`rotate(-90, ${padding.left - 50}, ${padding.top + chartHeight / 2})`}
          >
            Average Rating
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
            {(data.reduce((sum, d) => sum + d.average, 0) / data.length).toFixed(2)}★
          </p>
          <p className="text-xs text-gray-600">Avg (30d)</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.max(...data.map(d => d.average)).toFixed(2)}★
          </p>
          <p className="text-xs text-gray-600">Peak Rating</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </p>
          <p className="text-xs text-gray-600">New Ratings</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-yellow-500" />
          <span className="text-gray-600">Average Rating</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300" />
          <span className="text-gray-600">Rating Volume</span>
        </div>
      </div>
    </div>
  );
}
