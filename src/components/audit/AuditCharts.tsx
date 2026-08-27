import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface AuditChartsProps {
  stats: {
    pending: number;
    compliant: number;
    issues: number;
    overdue: number;
    neverFilled: number;
    totalTemplates: number;
    filledTemplatesCount: number;
  };
  categoryBreakdown: { category: string; compliant: number; pending: number; issues: number }[];
}

const PIE_COLORS = [
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
];

export function AuditCharts({ stats, categoryBreakdown }: AuditChartsProps) {
  const pieData = [
    { name: "Pending", value: stats.pending },
    { name: "Approved", value: stats.compliant },
    { name: "Issues", value: stats.issues },
  ].filter(d => d.value > 0);

  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Pie Chart */}
      <div className="bg-card rounded-sm border border-border p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          File Review Distribution
        </h3>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No file data available</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 flex-1">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-xs font-medium text-foreground">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{d.value}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({Math.round((d.value / total) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart - Category Breakdown */}
      <div className="bg-card rounded-sm border border-border p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Compliance by Module
        </h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No module data</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={categoryBreakdown} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
              <Bar dataKey="compliant" name="Approved" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="issues" name="Issues" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
