import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { EmployeePermissions } from '@/hooks/useStoreEmployees';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { Shield, AlertCircle } from 'lucide-react';
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

    return (
      <div key={module.key} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h4 className="font-medium">{module.label}</h4>
          </div>
          <Badge variant="outline">
            {module.description || 'Gerenciamento'}
          </Badge>
        </div>

        {/* Permissões diretas do módulo */}
        {module.permissions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
            {module.permissions.map((perm) =>
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
            Novos módulos e filtros aparecem automaticamente aqui
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
