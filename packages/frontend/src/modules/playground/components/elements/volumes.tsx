import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { serviceSchema } from '@runtipi/common/schemas';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type Volume = {
  id: string;
  hostPath: string;
  containerPath: string;
  readOnly?: boolean;
  shared?: boolean;
  private?: boolean;
};

type Props = {
  setValue: UseFormSetValue<z.infer<typeof serviceSchema>>;
  watch: UseFormWatch<z.infer<typeof serviceSchema>>;
};

export const VolumesConfig = ({ setValue, watch }: Props) => {
  const volumes = watch('volumes') || [];
  const [volumeMappings, setVolumeMappings] = useState<Volume[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && volumes.length > 0) {
      const mappings: Volume[] = volumes.map((vol, index) => ({
        id: `vol-${Date.now()}-${Math.random()}-${index}`,
        hostPath: vol.hostPath || '',
        containerPath: vol.containerPath || '',
        readOnly: vol.readOnly,
        shared: vol.shared,
        private: vol.private,
      }));
      setVolumeMappings(mappings);
      setInitialized(true);
    }
  }, [volumes, initialized]);

  const addVolumeMapping = () => {
    const newMapping: Volume = {
      id: `vol-${Date.now()}-${Math.random()}`,
      hostPath: '',
      containerPath: '',
      readOnly: false,
      shared: false,
      private: false,
    };
    setVolumeMappings([...volumeMappings, newMapping]);
  };

  const removeVolumeMapping = (index: number) => {
    const newMappings = volumeMappings.filter((_, i) => i !== index);
    setVolumeMappings(newMappings);
    updateFormValue(newMappings);
  };

  const updateMapping = (index: number, field: keyof Volume, value: string | boolean) => {
    const newMappings = [...volumeMappings];

    if (newMappings[index]) {
      newMappings[index][field] = value as never;

      setVolumeMappings(newMappings);
      updateFormValue(newMappings);
    }
  };

  const updateFormValue = (mappings: Volume[]) => {
    const volArray = mappings
      .filter(({ hostPath, containerPath }) => hostPath.trim() && containerPath.trim())
      .map(({ hostPath, containerPath, readOnly, shared, private: rprivate }) => ({
        hostPath: hostPath.trim(),
        containerPath: containerPath.trim(),
        ...(readOnly && { readOnly }),
        ...(shared && { shared }),
        ...(rprivate && { private: rprivate }),
      }));

    setValue('volumes', volArray);
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <Tooltip className="tooltip" anchorSelect=".my-volumes">
              Volume mappings for persistent storage
            </Tooltip>
            {'Volume Mappings'} <span className="ms-1 form-help my-volumes">?</span>
          </div>
          <Button type="button" onClick={addVolumeMapping} size="sm">
            Add Volume
          </Button>
        </div>
        {volumeMappings.map((mapping, index) => (
          <div key={mapping.id} className="row g-2 mb-3 align-items-end border-bottom pb-3">
            <div className="col-md-5">
              <Input
                value={mapping.hostPath}
                onChange={(e) => updateMapping(index, 'hostPath', e.target.value)}
                placeholder="/host/path"
                label={index === 0 ? 'Host Path' : undefined}
              />
            </div>
            <div className="col-md-5">
              <Input
                value={mapping.containerPath}
                onChange={(e) => updateMapping(index, 'containerPath', e.target.value)}
                placeholder="/container/path"
                label={index === 0 ? 'Container Path' : undefined}
              />
            </div>
            <div className="col-md-2">
              <Button type="button" onClick={() => removeVolumeMapping(index)} variant="outline" size="sm" className="w-100">
                Remove
              </Button>
            </div>
            <div className="col-md-4">
              <Switch
                checked={mapping.readOnly || false}
                onCheckedChange={(checked) => updateMapping(index, 'readOnly', checked)}
                label="Read Only"
              />
            </div>
            <div className="col-md-4">
              <Switch checked={mapping.shared || false} onCheckedChange={(checked) => updateMapping(index, 'shared', checked)} label="Shared" />
            </div>
            <div className="col-md-4">
              <Switch checked={mapping.private || false} onCheckedChange={(checked) => updateMapping(index, 'private', checked)} label="Private" />
            </div>
          </div>
        ))}
        {volumeMappings.length === 0 && <div className="text-muted small">No volume mappings added yet. Click "Add Volume" to add one.</div>}
      </div>
    </div>
  );
};
