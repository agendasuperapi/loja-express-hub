import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MiniChartProps {
  title: string;
  subtitle: string;
  data: number[];
  color: string;
}

export const MiniChart = ({ title, subtitle, data, color }: MiniChartProps) => {
  const chartData = data.map((val, idx) => ({ value: val, index: idx }));
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-lg shadow-sm p-4"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-sm font-semibold text-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
