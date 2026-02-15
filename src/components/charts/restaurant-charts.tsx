"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ReasonPoint = {
  reason: string;
  count: number;
  percentage: number;
};

type TrendPoint = {
  date: string;
  rate: number;
  submissions: number;
};

const COLORS = ["var(--accent)", "var(--accent2)", "#22c55e", "#38bdf8", "#f59e0b", "#a855f7"];

export function ReasonDistributionChart({ data }: { data: ReasonPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted">No approved submissions yet.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="reason" outerRadius={100} label={(entry) => `${entry.percentage}%`}>
            {data.map((entry, index) => (
              <Cell key={entry.reason} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)"
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted">No trend data yet.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis dataKey="date" stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)"
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="rate" name="Negative rate %" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
          <Line
            type="monotone"
            dataKey="submissions"
            name="Submission volume"
            stroke="var(--accent2)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
