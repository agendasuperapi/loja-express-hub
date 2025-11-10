import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { AnimatedButton } from "@/components/ui/animated-button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/4 -right-20 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-secondary opacity-10 rounded-full blur-3xl"
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* 404 Number */}
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <h1 className="text-9xl font-bold gradient-text">404</h1>
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Página Não Encontrada
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Ops! A página que você está procurando não existe ou foi movida.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/">
              <AnimatedButton size="lg" className="bg-gradient-primary">
                <Home className="w-5 h-5 mr-2" />
                Voltar ao Início
              </AnimatedButton>
            </Link>
            <motion.button
              onClick={() => window.history.back()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <AnimatedButton size="lg" variant="outline">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar
              </AnimatedButton>
            </motion.button>
          </motion.div>

          {/* Decorative Element */}
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mt-12 text-6xl opacity-50"
          >
            🚀
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
