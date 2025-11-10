import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Mail, CheckCircle, XCircle } from "lucide-react";

export interface EmailInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [isValid, setIsValid] = React.useState<boolean | null>(null);
    const [showValidation, setShowValidation] = React.useState(false);

    const validateEmail = (email: string): boolean => {
      if (!email) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      
      if (newValue.length > 0) {
        setShowValidation(true);
        setIsValid(validateEmail(newValue));
      } else {
        setShowValidation(false);
        setIsValid(null);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (value) {
        setShowValidation(true);
        setIsValid(validateEmail(value));
      }
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
          className="relative"
        >
          <Mail className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300",
            isFocused ? "text-primary" : "text-muted-foreground",
            isValid && "text-green-500",
            isValid === false && showValidation && "text-red-500"
          )} />
          
          <Input
            ref={ref}
            type="email"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="seu@email.com"
            className={cn(
              "pl-10 pr-10 transition-all duration-300",
              isFocused && "ring-2 ring-primary/20 border-primary",
              isValid && "border-green-500 ring-2 ring-green-500/20",
              isValid === false && showValidation && "border-red-500 ring-2 ring-red-500/20",
              className
            )}
            {...props}
          />

          {/* Validation Icons */}
          {showValidation && value && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {isValid ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 animate-pulse" />
              )}
            </motion.div>
          )}
        </motion.div>
        
        {/* Validation Message */}
        {isFocused && value && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-6 left-0 text-xs"
          >
            {isValid ? (
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Email válido
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                Digite um email válido
              </span>
            )}
          </motion.div>
        )}

        {/* Format hint on focus */}
        {isFocused && !value && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-6 left-0 text-xs text-muted-foreground"
          >
            exemplo@dominio.com
          </motion.div>
        )}
      </div>
    );
  }
);

EmailInput.displayName = "EmailInput";

export { EmailInput };
