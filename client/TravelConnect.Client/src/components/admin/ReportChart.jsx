import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

export default function ReportChart({ type = "bar", data, options, title, subtitle, height = 280 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#FFFFFF" } },
          tooltip: {
            titleColor: "#FFFFFF",
            bodyColor: "#FFFFFF",
            backgroundColor: "#1C2541",
            borderColor: "#253453",
            borderWidth: 1,
          },
        },
        ...options,
      },
    });
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, data, options]);

  return (
    <div className="card">
      {title && <h2 className="font-bold">{title}</h2>}
      {subtitle && <p className="text-sm text-text-secondary mb-4">{subtitle}</p>}
      <div style={{ position: "relative", height }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}