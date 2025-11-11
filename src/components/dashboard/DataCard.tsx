import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface DataCardProps {
  letter: string;
  value: number;
  subtitle: string;
  trend: 'up' | 'down';
  data: number[];
  color: string;
}

export const DataCard = ({ letter, value, subtitle, trend, data, color }: DataCardProps) => {
  const chartData = data.map((val, idx) => ({ value: val, index: idx }));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 flex items-center gap-6"
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br ${color}`}>
        {letter}
      </div>
      <div className="flex-1">
        <h3 className="text-3xl font-bold text-foreground">{value.toLocaleString()}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="w-32 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
