import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Check, LayoutGrid, List, Grid2X2, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutSettingsProps {
  currentTemplate?: string;
  onUpdate: (template: string) => Promise<void>;
  isUpdating: boolean;
}

const templates = [
  {
    id: 'template-2',
    name: '2 Colunas',
    description: 'Ideal para produtos com muitos detalhes',
    icon: Grid2X2,
    gridPreview: 'grid-cols-2',
  },
  {
    id: 'template-3',
    name: '3 Colunas',
    description: 'Layout balanceado e elegante',
    icon: Grid3x3,
    gridPreview: 'grid-cols-3',
  },
  {
    id: 'template-4',
    name: '4 Colunas',
    description: 'Mostra mais produtos (padrão)',
    icon: LayoutGrid,
    gridPreview: 'grid-cols-4',
  },
  {
    id: 'template-6',
    name: '6 Colunas',
    description: 'Compacto, ideal para muitos produtos',
    icon: LayoutGrid,
    gridPreview: 'grid-cols-6',
  },
  {
    id: 'template-list',
    name: 'Lista Completa',
    description: 'Produtos em lista vertical com máximo de detalhes',
    icon: List,
    gridPreview: 'grid-cols-1',
  },
];

export const LayoutSettings = ({ currentTemplate = 'template-4', onUpdate, isUpdating }: LayoutSettingsProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState(currentTemplate);

  const handleSave = async () => {
    try {
      await onUpdate(selectedTemplate);
      toast({
        title: "Layout atualizado!",
        description: "O template foi aplicado com sucesso à sua loja.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar layout",
        description: "Não foi possível aplicar o template. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <LayoutGrid className="w-6 h-6" />
          Layout dos Produtos
        </CardTitle>
        <CardDescription>
          Escolha como seus produtos serão exibidos na vitrine da loja
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Selecione um Template</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;
              
              return (
                <motion.div
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      "cursor-pointer transition-all duration-200 relative overflow-hidden",
                      isSelected
                        ? "border-primary shadow-lg ring-2 ring-primary/20"
                        : "border-border/50 hover:border-primary/50 hover:shadow-md"
                    )}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isSelected ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{template.name}</h3>
                        </div>
                      </div>
                      
                      {/* Preview do Grid */}
                      <div className="bg-muted/30 rounded-lg p-3 min-h-[80px] flex items-center justify-center">
                        <div className={cn(
                          "grid gap-1 w-full",
                          template.gridPreview
                        )}>
                          {Array.from({ length: template.id === 'template-list' ? 3 : parseInt(template.id.split('-')[1]) }).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "bg-primary/20 rounded",
                                template.id === 'template-list' ? "h-8" : "aspect-square"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Template atual: <span className="font-medium text-foreground">
              {templates.find(t => t.id === currentTemplate)?.name}
            </span>
          </p>
          <Button
            onClick={handleSave}
            disabled={isUpdating || selectedTemplate === currentTemplate}
            className="min-w-[120px]"
          >
            {isUpdating ? "Salvando..." : "Salvar Layout"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
