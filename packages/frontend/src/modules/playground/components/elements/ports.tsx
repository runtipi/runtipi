import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { serviceSchema } from '@runtipi/common/schemas';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type PortMapping = {
  id: string;
  containerPort: string;
  hostPort: string;
  udp?: boolean;
  tcp?: boolean;
  interface?: string;
};

type Props = {
  setValue: UseFormSetValue<z.infer<typeof serviceSchema>>;
  watch: UseFormWatch<z.infer<typeof serviceSchema>>;
};

type PortObject = {
  containerPort: number | string;
  hostPort: number | string;
  udp?: boolean;
  tcp?: boolean;
  interface?: string;
};

export const PortsConfig = ({ setValue, watch }: Props) => {
  const [portMappings, setPortMappings] = useState<PortMapping[]>([]);
  const [initialized, setInitialized] = useState(false);

  const existingPorts = watch('addPorts') || [];

  useEffect(() => {
    if (!initialized && existingPorts.length > 0) {
      const mappings: PortMapping[] = existingPorts.map((port) => ({
        id: `port-${Date.now()}-${Math.random()}`,
        containerPort: String(port.containerPort),
        hostPort: String(port.hostPort),
        udp: port.udp || false,
        tcp: port.tcp || false,
        interface: port.interface || '',
      }));
      setPortMappings(mappings);
      setInitialized(true);
    }
  }, [existingPorts, initialized]);

  const addPortMapping = () => {
    const newMapping: PortMapping = {
      id: `port-${Date.now()}-${Math.random()}`,
      containerPort: '',
      hostPort: '',
      udp: false,
      tcp: true,
      interface: '',
    };
    setPortMappings([...portMappings, newMapping]);
  };

  const removePortMapping = (index: number) => {
    const newMappings = portMappings.filter((_, i) => i !== index);
    setPortMappings(newMappings);
    updateFormValue(newMappings);
  };

  const updateMapping = (index: number, field: keyof PortMapping, value: string | boolean) => {
    const newMappings = [...portMappings];

    if (newMappings[index]) {
      newMappings[index][field] = value as never;
      setPortMappings(newMappings);
      updateFormValue(newMappings);
    }
  };

  const updateFormValue = (mappings: PortMapping[]) => {
    const portsArray = mappings
      .filter(({ containerPort, hostPort }) => containerPort.trim() && hostPort.trim())
      .map(({ containerPort, hostPort, udp, tcp, interface: rinterface }) => {
        const portObj: PortObject = {
          containerPort: Number.isNaN(Number(containerPort)) ? containerPort.trim() : Number(containerPort),
          hostPort: Number.isNaN(Number(hostPort)) ? hostPort.trim() : Number(hostPort),
        };

        if (udp) portObj.udp = udp;
        if (tcp) portObj.tcp = tcp;
        if (rinterface?.trim()) portObj.interface = rinterface.trim();
        return portObj;
      });

    setValue('addPorts', portsArray);
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <Tooltip className="tooltip" anchorSelect=".my-ports">
              Port mappings between host and container
            </Tooltip>
            {'Port Mappings'} <span className="ms-1 form-help my-ports">?</span>
          </div>
          <Button type="button" onClick={addPortMapping} size="sm">
            Add Port
          </Button>
        </div>
        {portMappings.map((mapping, index) => (
          <div key={mapping.id} className="row g-2 mb-3 align-items-end border-bottom pb-3">
            <div className="col-md-3">
              <Input
                value={mapping.hostPort}
                onChange={(e) => updateMapping(index, 'hostPort', e.target.value)}
                placeholder="8080"
                label={index === 0 ? 'Host Port' : undefined}
                type="number"
                min={1}
                max={65535}
              />
            </div>
            <div className="col-md-3">
              <Input
                value={mapping.containerPort}
                onChange={(e) => updateMapping(index, 'containerPort', e.target.value)}
                placeholder="8080"
                label={index === 0 ? 'Container Port' : undefined}
                type="number"
                min={1}
                max={65535}
              />
            </div>
            <div className="col-md-2">
              <Switch checked={mapping.tcp || false} onCheckedChange={(checked) => updateMapping(index, 'tcp', checked)} label="TCP" />
            </div>
            <div className="col-md-2">
              <Switch checked={mapping.udp || false} onCheckedChange={(checked) => updateMapping(index, 'udp', checked)} label="UDP" />
            </div>
            <div className="col-md-2">
              <Button type="button" onClick={() => removePortMapping(index)} variant="outline" size="sm" className="w-100">
                Remove
              </Button>
            </div>
            <div className="col-md-6">
              <Input
                value={mapping.interface || ''}
                onChange={(e) => updateMapping(index, 'interface', e.target.value)}
                placeholder="eth0"
                label="Interface (optional)"
              />
            </div>
          </div>
        ))}
        {portMappings.length === 0 && <div className="text-muted small">No port mappings added yet. Click "Add Port" to add one.</div>}
      </div>
    </div>
  );
};
