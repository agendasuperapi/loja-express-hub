import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeePermissions } from '@/hooks/useStoreEmployees';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { Shield, AlertCircle, XCircle, CheckCheck } from 'lucide-react';
import { PermissionModule } from '@/config/permissions';

interface DynamicPermissionsFormProps {
  permissions: EmployeePermissions;
  onPermissionChange: (module: string, action: string, value: boolean) => void;
  storeId?: string;
}

export const DynamicPermissionsForm = ({
  permissions,
  onPermissionChange,
  storeId,
}: DynamicPermissionsFormProps) => {
  const { modules } = useDynamicPermissions(storeId);

  const getPermissionValue = (module: string, action: string): boolean => {
    return ((permissions as any)[module]?.[action]) ?? false;
  };

  const handleModuleToggle = (module: PermissionModule, enabled: boolean) => {
    // Primeiro, atualiza o estado 'enabled'
    onPermissionChange(module.key, 'enabled', enabled);
    
    // Se desativando, desabilita todas as outras permissões
    if (!enabled) {
      module.permissions.forEach(perm => {
        if (perm.key !== 'enabled') {
          onPermissionChange(module.key, perm.key, false);
        }
      });
      module.subgroups?.forEach(subgroup => {
        subgroup.permissions.forEach(perm => {
          onPermissionChange(module.key, perm.key, false);
        });
      });
    }
  };

  const handleAllowAll = (module: PermissionModule) => {
    // Ativa a permissão 'enabled' do módulo
    onPermissionChange(module.key, 'enabled', true);
    
    // Ativa todas as permissões diretas do módulo
    module.permissions.forEach(perm => {
      onPermissionChange(module.key, perm.key, true);
    });
    
    // Ativa todas as permissões dos subgrupos
    module.subgroups?.forEach(subgroup => {
      subgroup.permissions.forEach(perm => {
        onPermissionChange(module.key, perm.key, true);
      });
    });
  };

  const areAllPermissionsEnabled = (module: PermissionModule): boolean => {
    // Verifica permissões diretas
    const directPermsEnabled = module.permissions.every(
      perm => getPermissionValue(module.key, perm.key)
    );
    
    // Verifica permissões dos subgrupos
    const subgroupPermsEnabled = module.subgroups?.every(subgroup =>
      subgroup.permissions.every(perm => getPermissionValue(module.key, perm.key))
    ) ?? true;
    
    return directPermsEnabled && subgroupPermsEnabled;
  };

  const renderPermissionSwitch = (
    moduleKey: string,
    permKey: string,
    label: string,
    description?: string,
    disabled?: boolean
  ) => (
    <div className="flex items-center space-x-2">
      <Switch
        checked={getPermissionValue(moduleKey, permKey)}
        onCheckedChange={(checked) => onPermissionChange(moduleKey, permKey, checked)}
        disabled={disabled}
      />
      <div className="flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );

  const renderModule = (module: PermissionModule) => {
    const hasSubgroups = module.subgroups && module.subgroups.length > 0;
    const isModuleEnabled = getPermissionValue(module.key, 'enabled');
    
    // Filtra permissões excluindo 'enabled' (que será renderizado separadamente)
    const otherPermissions = module.permissions.filter(p => p.key !== 'enabled');

    return (
      <div key={module.key} className="space-y-3">
        {/* Header com Toggle Principal do Módulo */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h4 className="font-medium">{module.label}</h4>
            <Badge variant="outline" className="text-xs">
              {module.description || 'Gerenciamento'}
            </Badge>
          </div>
          
          {/* Toggle Principal do Módulo */}
          <div className="flex items-center gap-2">
            {/* Botão Permitir Tudo - só aparece quando módulo está ativo */}
            {isModuleEnabled && !areAllPermissionsEnabled(module) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAllowAll(module)}
                className="h-7 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Permitir tudo
              </Button>
            )}
            
            <Label className={`text-sm ${isModuleEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
              {isModuleEnabled ? 'Ativo' : 'Inativo'}
            </Label>
            <Switch
              checked={isModuleEnabled}
              onCheckedChange={(checked) => handleModuleToggle(module, checked)}
            />
          </div>
        </div>

        {/* Conteúdo do Módulo - só aparece se estiver ativo */}
        {isModuleEnabled ? (
          <>
            {/* Permissões diretas do módulo (exceto 'enabled') */}
            {otherPermissions.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
                {otherPermissions.map((perm) =>
                  renderPermissionSwitch(
                    module.key,
                    perm.key,
                    perm.label,
                    perm.description
                  )
                )}
              </div>
            )}

            {/* Subgrupos de permissões */}
            {hasSubgroups && (
              <div className="space-y-4 mt-4">
                {module.subgroups!.map((subgroup) => (
                  <div key={subgroup.key} className="space-y-3">
                    <div className="flex items-start gap-2 ml-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground">
                          {subgroup.label}
                        </h5>
                        {subgroup.description && (
                          <p className="text-xs text-muted-foreground">
                            {subgroup.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/20 rounded-lg ml-4">
                      {subgroup.permissions.map((perm) => {
                        // Verifica se esta permissão depende de outra
                        const isDisabled =
                          perm.dependsOn?.some(
                            (dep) => !getPermissionValue(module.key, dep)
                          ) ?? false;

                        return renderPermissionSwitch(
                          module.key,
                          perm.key,
                          perm.label,
                          perm.description,
                          isDisabled
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Mensagem quando módulo está inativo */
          <div className="p-4 bg-muted/20 rounded-lg text-center border border-dashed">
            <XCircle className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Este menu está desativado para o funcionário
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-sm">Sistema de Permissões Dinâmico</h3>
          <p className="text-xs text-muted-foreground">
            Ative ou desative menus inteiros usando o toggle principal de cada módulo
          </p>
        </div>
      </div>

      {modules.map((module, index) => (
        <div key={module.key}>
          {renderModule(module)}
          {index < modules.length - 1 && <Separator className="my-6" />}
        </div>
      ))}
    </div>
  );
};
