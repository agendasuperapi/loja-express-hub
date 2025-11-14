import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, X, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

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

interface OperatingHoursManagerProps {
  initialHours: OperatingHours;
  onSave: (hours: OperatingHours) => Promise<void>;
}

const DAYS_PT = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

export const OperatingHoursManager = ({ initialHours, onSave }: OperatingHoursManagerProps) => {
  const [hours, setHours] = useState<OperatingHours>(initialHours);
  const [saving, setSaving] = useState(false);

  const handleTimeChange = (day: keyof OperatingHours, field: 'open' | 'close' | 'lunch_break_start' | 'lunch_break_end', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleToggleClosed = (day: keyof OperatingHours) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_closed: !prev[day].is_closed
      }
    }));
  };

  const handleToggleLunchBreak = (day: keyof OperatingHours) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        has_lunch_break: !prev[day].has_lunch_break
      }
    }));
  };

  const validateHours = (): boolean => {
    for (const [day, schedule] of Object.entries(hours)) {
      if (!schedule.is_closed) {
        if (!schedule.open || !schedule.close) {
          toast({
            title: 'Horário inválido',
            description: `Por favor, preencha os horários de ${DAYS_PT[day as keyof typeof DAYS_PT]}`,
            variant: 'destructive'
          });
          return false;
        }
        
        if (schedule.open >= schedule.close) {
          toast({
            title: 'Horário inválido',
            description: `O horário de abertura deve ser anterior ao de fechamento em ${DAYS_PT[day as keyof typeof DAYS_PT]}`,
            variant: 'destructive'
          });
          return false;
        }

        if (schedule.has_lunch_break) {
          if (!schedule.lunch_break_start || !schedule.lunch_break_end) {
            toast({
              title: 'Horário inválido',
              description: `Por favor, preencha os horários do intervalo de almoço em ${DAYS_PT[day as keyof typeof DAYS_PT]}`,
              variant: 'destructive'
            });
            return false;
          }

          if (schedule.lunch_break_start >= schedule.lunch_break_end) {
            toast({
              title: 'Horário inválido',
              description: `O início do intervalo deve ser anterior ao fim em ${DAYS_PT[day as keyof typeof DAYS_PT]}`,
              variant: 'destructive'
            });
            return false;
          }

          if (schedule.lunch_break_start < schedule.open || schedule.lunch_break_end > schedule.close) {
            toast({
              title: 'Horário inválido',
              description: `O intervalo de almoço deve estar dentro do horário de funcionamento em ${DAYS_PT[day as keyof typeof DAYS_PT]}`,
              variant: 'destructive'
            });
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateHours()) return;

    setSaving(true);
    try {
      await onSave(hours);
      toast({
        title: 'Horários atualizados!',
        description: 'Os horários de funcionamento foram salvos com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar os horários.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToAll = (sourceDay: keyof OperatingHours) => {
    const sourceSchedule = hours[sourceDay];
    const newHours = { ...hours };
    
    Object.keys(newHours).forEach(day => {
      newHours[day as keyof OperatingHours] = { ...sourceSchedule };
    });
    
    setHours(newHours);
    toast({
      title: 'Horários copiados',
      description: `Os horários de ${DAYS_PT[sourceDay]} foram aplicados a todos os dias.`
    });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Horários de Funcionamento</CardTitle>
        </div>
        <CardDescription>
          Configure os horários de abertura e fechamento da sua loja
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {(Object.keys(hours) as Array<keyof OperatingHours>).map((day, index) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="space-y-3 p-4 rounded-lg border border-border/50 bg-background/50"
          >
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium flex items-center gap-2">
                {DAYS_PT[day]}
                {hours[day].is_closed ? (
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Fechado
                  </span>
                ) : (
                  <span className="text-xs text-success flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Aberto
                  </span>
                )}
              </Label>
              
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToAll(day)}
                  className="text-xs"
                >
                  Copiar para todos
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`closed-${day}`} className="text-sm text-muted-foreground">
                    Fechado
                  </Label>
                  <Switch
                    id={`closed-${day}`}
                    checked={hours[day].is_closed}
                    onCheckedChange={() => handleToggleClosed(day)}
                  />
                </div>
              </div>
            </div>
            
            {!hours[day].is_closed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${day}-open`} className="text-sm">
                      Abertura
                    </Label>
                    <Input
                      id={`${day}-open`}
                      type="time"
                      value={hours[day].open}
                      onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${day}-close`} className="text-sm">
                      Fechamento
                    </Label>
                    <Input
                      id={`${day}-close`}
                      type="time"
                      value={hours[day].close}
                      onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`lunch-break-${day}`}
                      checked={hours[day].has_lunch_break || false}
                      onCheckedChange={() => handleToggleLunchBreak(day)}
                    />
                    <Label htmlFor={`lunch-break-${day}`} className="text-sm text-muted-foreground">
                      Intervalo de almoço
                    </Label>
                  </div>

                  {hours[day].has_lunch_break && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-4 pl-8"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`${day}-lunch-start`} className="text-xs text-muted-foreground">
                          Início do intervalo
                        </Label>
                        <Input
                          id={`${day}-lunch-start`}
                          type="time"
                          value={hours[day].lunch_break_start || ''}
                          onChange={(e) => handleTimeChange(day, 'lunch_break_start', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`${day}-lunch-end`} className="text-xs text-muted-foreground">
                          Fim do intervalo
                        </Label>
                        <Input
                          id={`${day}-lunch-end`}
                          type="time"
                          value={hours[day].lunch_break_end || ''}
                          onChange={(e) => handleTimeChange(day, 'lunch_break_end', e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
        
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? 'Salvando...' : 'Salvar Horários'}
        </Button>
      </CardContent>
    </Card>
  );
};
