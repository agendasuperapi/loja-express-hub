import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Check, LayoutGrid, List, Grid2X2, Grid3x3, Monitor, Smartphone, Rows, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { StorePreview } from "@/components/dashboard/StorePreview";

interface LayoutSettingsProps {
  currentTemplateDesktop?: string;
  currentTemplateMobile?: string;
  showAddress?: boolean;
  onUpdate: (desktopTemplate: string, mobileTemplate: string, showAddress: boolean) => Promise<void>;
  isUpdating: boolean;
  storeName?: string;
  storeDescription?: string;
  storeLogo?: string;
  storeBanner?: string;
  storeRating?: number;
  storeAddress?: string;
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
    description: 'Mostra mais produtos (padrão desktop)',
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
  {
    id: 'template-horizontal',
    name: 'Horizontal',
    description: 'Imagem redonda na lateral com detalhes ao lado',
    icon: Rows,
    gridPreview: 'flex flex-col gap-2',
  },
];

export const LayoutSettings = ({ 
  currentTemplateDesktop = 'template-4', 
  currentTemplateMobile = 'template-2',
  showAddress = true,
  onUpdate, 
  isUpdating,
  storeName,
  storeDescription,
  storeLogo,
  storeBanner,
  storeRating,
  storeAddress,
}: LayoutSettingsProps) => {
  const [selectedDesktop, setSelectedDesktop] = useState(currentTemplateDesktop);
  const [selectedMobile, setSelectedMobile] = useState(currentTemplateMobile);
  const [showAddressEnabled, setShowAddressEnabled] = useState(showAddress);

  // Sync state with props when they change
  useEffect(() => {
    setSelectedDesktop(currentTemplateDesktop);
  }, [currentTemplateDesktop]);

  useEffect(() => {
    setSelectedMobile(currentTemplateMobile);
  }, [currentTemplateMobile]);

  useEffect(() => {
    setShowAddressEnabled(showAddress);
  }, [showAddress]);

  const handleSave = async () => {
    try {
      await onUpdate(selectedDesktop, selectedMobile, showAddressEnabled);
      toast({
        title: "Configurações atualizadas!",
        description: "As configurações de exibição foram aplicadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar configurações",
        description: "Não foi possível aplicar as configurações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const TemplateSelector = ({ 
    selectedTemplate, 
    onSelectTemplate, 
    currentTemplate,
    isMobile = false,
    isDesktop = false
  }: { 
    selectedTemplate: string; 
    onSelectTemplate: (id: string) => void;
    currentTemplate: string;
    isMobile?: boolean;
    isDesktop?: boolean;
  }) => {
    let filteredTemplates = templates;
    
    if (isMobile) {
      filteredTemplates = templates.filter(t => !['template-3', 'template-4', 'template-6'].includes(t.id));
    } else if (isDesktop) {
      filteredTemplates = templates.filter(t => !['template-2', 'template-6', 'template-list'].includes(t.id));
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
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
              onClick={() => onSelectTemplate(template.id)}
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
                    template.id === 'template-horizontal' ? "flex flex-col gap-1 w-full" : "grid gap-1 w-full",
                    template.id === 'template-horizontal' ? '' : template.gridPreview
                  )}>
                    {Array.from({ 
                      length: template.id === 'template-list' ? 3 : template.id === 'template-horizontal' ? 3 : parseInt(template.id.split('-')[1]) 
                    }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "bg-primary/20 rounded",
                          template.id === 'template-list' || template.id === 'template-horizontal' ? "h-8" : "aspect-square"
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
    );
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Settings Panel */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" />
            Layout dos Produtos
          </CardTitle>
          <CardDescription>
            Escolha templates diferentes para desktop e mobile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="desktop" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="desktop" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Mobile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="desktop" className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-4 block">Template para Desktop</Label>
                <TemplateSelector
                  selectedTemplate={selectedDesktop}
                  onSelectTemplate={setSelectedDesktop}
                  currentTemplate={currentTemplateDesktop}
                  isDesktop={true}
                />
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-4 block">Template para Mobile</Label>
                <TemplateSelector
                  selectedTemplate={selectedMobile}
                  onSelectTemplate={setSelectedMobile}
                  currentTemplate={currentTemplateMobile}
                  isMobile={true}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 pt-4 border-t">
            {/* Address visibility setting */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="show-address" className="text-base font-semibold cursor-pointer">
                        Exibir Endereço na Página da Loja
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar o endereço completo no cabeçalho da sua loja
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="show-address"
                    checked={showAddressEnabled}
                    onCheckedChange={setShowAddressEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary and save button */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Desktop:</span>{' '}
                  {templates.find(t => t.id === selectedDesktop)?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Mobile:</span>{' '}
                  {templates.find(t => t.id === selectedMobile)?.name}
                </p>
              </div>
              <Button
                onClick={handleSave}
                disabled={isUpdating || (
                  selectedDesktop === currentTemplateDesktop && 
                  selectedMobile === currentTemplateMobile &&
                  showAddressEnabled === showAddress
                )}
                className="min-w-[120px]"
              >
                {isUpdating ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      <div className="space-y-4">
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Pré-visualização</CardTitle>
            <CardDescription>
              Veja como sua loja ficará com as configurações atuais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Desktop Preview */}
            <div className="hidden lg:block space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Visualização Desktop
              </div>
              <div className="border rounded-lg p-4 bg-muted/10">
                <StorePreview
                  storeName={storeName || "Minha Loja"}
                  storeDescription={storeDescription}
                  storeLogo={storeLogo}
                  storeBanner={storeBanner}
                  storeRating={storeRating}
                  storeAddress={storeAddress}
                  showAddress={showAddressEnabled}
                  layoutTemplateDesktop={selectedDesktop}
                  layoutTemplateMobile={selectedMobile}
                  isMobileView={false}
                />
              </div>
            </div>

            {/* Mobile Preview */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Visualização Mobile
              </div>
              <div className="border rounded-lg p-4 bg-muted/10 max-w-sm mx-auto lg:mx-0">
                <StorePreview
                  storeName={storeName || "Minha Loja"}
                  storeDescription={storeDescription}
                  storeLogo={storeLogo}
                  storeBanner={storeBanner}
                  storeRating={storeRating}
                  storeAddress={storeAddress}
                  showAddress={showAddressEnabled}
                  layoutTemplateDesktop={selectedDesktop}
                  layoutTemplateMobile={selectedMobile}
                  isMobileView={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
