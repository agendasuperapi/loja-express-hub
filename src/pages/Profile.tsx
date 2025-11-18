import { motion } from "framer-motion";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { User, Lock, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalDataSettings } from "@/components/settings/PersonalDataSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";

export default function Profile() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">Meu Perfil</h1>
            <Button
              variant="outline" 
              size="sm"
              onClick={signOut}
              className="md:hidden flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
          <p className="text-muted-foreground mb-8">
            Gerencie suas informações pessoais e endereço de entrega
          </p>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Segurança
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <PersonalDataSettings />
            </TabsContent>

            <TabsContent value="security">
              <SecuritySettings />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
