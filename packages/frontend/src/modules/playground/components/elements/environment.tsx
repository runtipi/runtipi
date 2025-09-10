import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { serviceSchema } from '@runtipi/common/schemas';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type EnvironmentVariable = {
  id: string;
  key: string;
  value: string;
};

type Props = {
  setValue: UseFormSetValue<z.infer<typeof serviceSchema>>;
  watch: UseFormWatch<z.infer<typeof serviceSchema>>;
};

export const EnvironmentConfig = ({ setValue, watch }: Props) => {
  const environment = watch('environment') || {};
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && Object.keys(environment).length > 0) {
      const vars: EnvironmentVariable[] = Object.entries(environment).map(([key, value]) => ({
        id: `env-${Date.now()}-${Math.random()}`,
        key,
        value: String(value),
      }));
      setEnvVars(vars);
      setInitialized(true);
    }
  }, [environment, initialized]);

  const addEnvironmentVariable = () => {
    const newVar: EnvironmentVariable = {
      id: `env-${Date.now()}-${Math.random()}`,
      key: '',
      value: '',
    };
    setEnvVars([...envVars, newVar]);
  };

  const removeEnvironmentVariable = (index: number) => {
    const newVars = envVars.filter((_, i) => i !== index);
    setEnvVars(newVars);
    updateFormValue(newVars);
  };

  const updateVariable = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    if (newVars[index]) {
      newVars[index][field] = value;
      setEnvVars(newVars);
      updateFormValue(newVars);
    }
  };

  const updateFormValue = (vars: EnvironmentVariable[]) => {
    const envRecord: Record<string, string | number> = {};
    vars.forEach(({ key, value }) => {
      if (key.trim()) {
        const numValue = Number(value);
        envRecord[key.trim()] = Number.isNaN(numValue) ? value : numValue;
      }
    });
    setValue('environment', envRecord);
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <Tooltip className="tooltip" anchorSelect=".my-env-vars">
              Environment variables for the container
            </Tooltip>
            {'Environment Variables'} <span className="ms-1 form-help my-env-vars">?</span>
          </div>
          <Button type="button" onClick={addEnvironmentVariable} size="sm">
            Add Variable
          </Button>
        </div>
        {envVars.map((envVar, index) => (
          <div key={envVar.id} className="row g-2 mb-2 align-items-end">
            <div className="col-md-5">
              <Input
                value={envVar.key}
                onChange={(e) => updateVariable(index, 'key', e.target.value)}
                placeholder="KEY"
                label={index === 0 ? 'Key' : undefined}
              />
            </div>
            <div className="col-md-5">
              <Input
                value={envVar.value}
                onChange={(e) => updateVariable(index, 'value', e.target.value)}
                placeholder="value"
                label={index === 0 ? 'Value' : undefined}
              />
            </div>
            <div className="col-md-2">
              <Button type="button" onClick={() => removeEnvironmentVariable(index)} variant="outline" size="sm" className="w-100">
                Remove
              </Button>
            </div>
          </div>
        ))}
        {envVars.length === 0 && <div className="text-muted small">No environment variables added yet. Click "Add Variable" to add one.</div>}
      </div>
    </div>
  );
};
