import { motion } from "framer-motion";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";
interface AnimatedButtonProps extends ButtonProps {
  children: React.ReactNode;
}
export const AnimatedButton = ({
  children,
  className,
  ...props
}: AnimatedButtonProps) => {
  return <motion.div whileHover={{
    scale: 1.05
  }} whileTap={{
    scale: 0.98
  }} transition={{
    type: "spring",
    stiffness: 400,
    damping: 17
  }}>
      <Button className={cn("relative overflow-hidden font-semibold", className)} {...props}>
        {children}
      </Button>
    </motion.div>;
};