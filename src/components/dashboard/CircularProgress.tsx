import { motion } from "framer-motion";

interface CircularProgressProps {
  value: number;
  maxValue?: number;
  label: string;
  period: string;
  color?: string;
}

export const CircularProgress = ({ 
  value, 
  maxValue = 400, 
  label, 
  period,
  color = "text-primary"
}: CircularProgressProps) => {
  const percentage = (value / maxValue) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-xl shadow-md hover:shadow-xl transition-shadow">
      <div className="relative w-32 h-32">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted/30"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={color}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span 
            className="text-3xl font-bold text-foreground"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {value}
          </motion.span>
        </div>
      </div>
      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground">+79 ( +2.3) %</p>
        <p className="text-sm font-medium text-muted-foreground">{period}</p>
      </div>
    </div>
  );
};
