import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from "date-fns";

export const useDateRangeFilter = () => {
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (periodFilter) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: weekAgo, to: now };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "year":
        return { from: startOfYear(now), to: endOfYear(now) };
      case "custom":
        return customDateRange;
      default:
        return { from: undefined, to: undefined };
    }
  }, [periodFilter, customDateRange]);

  return {
    periodFilter,
    setPeriodFilter,
    customDateRange,
    setCustomDateRange,
    dateRange,
  };
};
