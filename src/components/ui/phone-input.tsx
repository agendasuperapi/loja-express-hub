import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [isValid, setIsValid] = React.useState(true);

    const formatPhoneNumber = (input: string): string => {
      // Remove tudo que não é número
      const numbers = input.replace(/\D/g, '');
      
      // Limita a 11 dígitos
      const limited = numbers.slice(0, 11);
      
      // Sem dígitos
      if (limited.length === 0) {
        return '';
      }
      
      // Apenas DDD
      if (limited.length <= 2) {
        return `(${limited}`;
      }
      
      // DDD completo + início do número
      if (limited.length <= 6) {
        return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
      }
      
      // Telefone fixo (10 dígitos) ou celular (11 dígitos)
      if (limited.length <= 10) {
        // Formato fixo: (DD) DDDD-DDDD
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
      }
      
      // Celular com 11 dígitos: (DD) 9DDDD-DDDD
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      onChange(formatted);
      
      // Validação: aceita 10 dígitos (fixo) ou 11 dígitos (celular)
      const numbers = formatted.replace(/\D/g, '');
      setIsValid(numbers.length === 0 || numbers.length === 10 || numbers.length === 11);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        <motion.div
          initial={false}
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <Input
            ref={ref}
            type="tel"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="(00) 00000-0000"
            className={cn(
              "transition-all duration-300",
              isFocused && "ring-2 ring-primary/20 border-primary",
              !isValid && value && "border-red-500 ring-2 ring-red-500/20",
              className
            )}
            {...props}
          />
        </motion.div>
        
        {/* Indicador visual de formatação */}
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-6 left-0 text-xs text-muted-foreground"
          >
            {value.replace(/\D/g, '').length} dígitos (10-11)
          </motion.div>
        )}
        
        {/* Indicador de validação */}
        {value && !isValid && !isFocused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </motion.div>
        )}
        
        {value && isValid && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </motion.div>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
