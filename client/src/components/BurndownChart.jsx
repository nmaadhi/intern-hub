import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function BurndownChart({ snapshots = [], idealLine = [], totalPoints = 0, phase }) {
  const data = idealLine.map((ideal) => {
    const actual = snapshots.find((s) => s.date === ideal.date);
    return {
      date: new Date(ideal.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      ideal: ideal.ideal,
      actual: actual ? actual.remainingPoints : undefined,
    };
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-50 rounded-xl text-sm text-gray-400">
        Burndown data will appear once the sprint starts
      </div>
    );
  }

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: 'Points', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value, name) => [value !== undefined ? `${value} pts` : '—', name === 'ideal' ? 'Ideal' : 'Actual']}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="ideal" stroke="#d1d5db" strokeWidth={2} strokeDasharray="5 5" dot={false} name="ideal" />
          <Line type="monotone" dataKey="actual" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed' }} connectNulls={false} name="actual" />
          {phase === 'COMPLETED' && (
            <ReferenceLine y={0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Done', fontSize: 11 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}