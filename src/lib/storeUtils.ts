interface DaySchedule {
  open: string;
  close: string;
  is_closed: boolean;
  has_lunch_break?: boolean;
  lunch_break_start?: string;
  lunch_break_end?: string;
}

interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const DAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function isStoreOpen(operatingHours: OperatingHours | any): boolean {
  if (!operatingHours) return false;

  const now = new Date();
  const currentDay = DAYS_MAP[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const daySchedule = operatingHours[currentDay];
  
  if (!daySchedule || daySchedule.is_closed) {
    return false;
  }

  // Check if within lunch break
  if (daySchedule.has_lunch_break && daySchedule.lunch_break_start && daySchedule.lunch_break_end) {
    if (currentTime >= daySchedule.lunch_break_start && currentTime <= daySchedule.lunch_break_end) {
      return false;
    }
  }

  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
}

export function getStoreStatusText(operatingHours: OperatingHours | any): string {
  if (!operatingHours) return 'Horário não disponível';

  const now = new Date();
  const currentDay = DAYS_MAP[now.getDay()];
  const daySchedule = operatingHours[currentDay];

  if (!daySchedule) return 'Horário não disponível';
  
  if (daySchedule.is_closed) {
    return 'Loja fechada - Fechado hoje';
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  if (currentTime < daySchedule.open) {
    return `Loja fechada - Abre às ${daySchedule.open}`;
  }
  
  if (currentTime > daySchedule.close) {
    return 'Loja fechada';
  }

  // Check if in lunch break
  if (daySchedule.has_lunch_break && daySchedule.lunch_break_start && daySchedule.lunch_break_end) {
    if (currentTime >= daySchedule.lunch_break_start && currentTime <= daySchedule.lunch_break_end) {
      return `Intervalo de almoço - Reabre às ${daySchedule.lunch_break_end}`;
    }
  }
  
  return `Aberto até ${daySchedule.close}`;
}
