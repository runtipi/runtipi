import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { dynamicComposeSchema } from '@runtipi/common/schemas';
import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type Props = {
  control: Control<z.infer<typeof dynamicComposeSchema>>;
  register: UseFormRegister<z.infer<typeof dynamicComposeSchema>>;
  serviceIndex: number;
  errors?: FieldErrors<z.infer<typeof dynamicComposeSchema>>;
};

export const PortsConfig = ({ errors, serviceIndex, control, register }: Props) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `services.${serviceIndex}.addPorts`,
  });

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
          <Button type="button" onClick={() => append({ containerPort: 0, hostPort: 0 })} size="sm">
            Add Port
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="row g-2 mb-3 align-items-end border-bottom pb-3">
            <div className="col-md-3">
              <Input
                {...register(`services.${serviceIndex}.addPorts.${index}.hostPort`, { valueAsNumber: true })}
                error={errors?.services?.[serviceIndex]?.addPorts?.[index]?.hostPort?.message}
                placeholder="8080"
                label={index === 0 ? 'Host Port' : undefined}
                type="number"
                min={1}
                max={65535}
              />
            </div>
            <div className="col-md-3">
              <Input
                {...register(`services.${serviceIndex}.addPorts.${index}.containerPort`, { valueAsNumber: true })}
                error={errors?.services?.[serviceIndex]?.addPorts?.[index]?.containerPort?.message}
                placeholder="8080"
                label={index === 0 ? 'Container Port' : undefined}
                type="number"
                min={1}
                max={65535}
              />
            </div>
            <div className="col-md-2">
              <Controller
                control={control}
                name={`services.${serviceIndex}.addPorts.${index}.tcp`}
                defaultValue={true}
                render={({ field: { onChange, value, ref, ...rest } }) => (
                  <Switch ref={ref} checked={value} onCheckedChange={onChange} {...rest} label="TCP" />
                )}
              />
            </div>
            <div className="col-md-2">
              <Controller
                control={control}
                name={`services.${serviceIndex}.addPorts.${index}.udp`}
                defaultValue={true}
                render={({ field: { onChange, value, ref, ...rest } }) => (
                  <Switch ref={ref} checked={value} onCheckedChange={onChange} {...rest} label="UDP" />
                )}
              />
            </div>
            <div className="col-md-2">
              <Button type="button" onClick={() => remove(index)} variant="outline" size="sm" className="w-100">
                Remove
              </Button>
            </div>
            <div className="col-md-6">
              <Input
                {...register(`services.${serviceIndex}.addPorts.${index}.interface`, { setValueAs: (v) => v.trim() || undefined })}
                error={errors?.services?.[serviceIndex]?.addPorts?.[index]?.interface?.message}
                placeholder="eth0"
                label="Interface (optional)"
              />
            </div>
          </div>
        ))}
        {fields.length === 0 && <div className="text-muted small">No port mappings added yet. Click "Add Port" to add one.</div>}
      </div>
    </div>
  );
};
