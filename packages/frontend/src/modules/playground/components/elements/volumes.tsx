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

export const VolumesConfig = ({ errors, serviceIndex, control, register }: Props) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `services.${serviceIndex}.volumes`,
  });

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
          <Button type="button" onClick={() => append({ containerPath: '/', hostPath: '/' })} size="sm">
            Add Volume
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="row g-2 mb-3 align-items-end border-bottom pb-3">
            <div className="col-md-5">
              <Input
                {...register(`services.${serviceIndex}.volumes.${index}.hostPath`, { setValueAs: (v) => v.trim() || undefined })}
                error={errors?.services?.[serviceIndex]?.volumes?.[index]?.hostPath?.message}
                placeholder="/host/path"
                label={index === 0 ? 'Host Path' : undefined}
              />
            </div>
            <div className="col-md-5">
              <Input
                {...register(`services.${serviceIndex}.volumes.${index}.containerPath`, { setValueAs: (v) => v.trim() || undefined })}
                error={errors?.services?.[serviceIndex]?.volumes?.[index]?.containerPath?.message}
                placeholder="/container/path"
                label={index === 0 ? 'Container Path' : undefined}
              />
            </div>
            <div className="col-md-2">
              <Button type="button" onClick={() => remove(index)} variant="outline" size="sm" className="w-100">
                Remove
              </Button>
            </div>
            <div className="col-md-4">
              <Controller
                control={control}
                name={`services.${serviceIndex}.volumes.${index}.readOnly`}
                defaultValue={false}
                render={({ field: { value, onChange } }) => <Switch checked={value || false} onCheckedChange={onChange} label="Read Only" />}
              />
            </div>
            <div className="col-md-4">
              <Controller
                control={control}
                name={`services.${serviceIndex}.volumes.${index}.shared`}
                defaultValue={false}
                render={({ field: { value, onChange } }) => <Switch checked={value || false} onCheckedChange={onChange} label="Shared" />}
              />
            </div>
            <div className="col-md-4">
              <Controller
                control={control}
                name={`services.${serviceIndex}.volumes.${index}.private`}
                defaultValue={false}
                render={({ field: { value, onChange } }) => <Switch checked={value || false} onCheckedChange={onChange} label="Private" />}
              />
            </div>
          </div>
        ))}
        {fields.length === 0 && <div className="text-muted small">No volume mappings added yet. Click "Add Volume" to add one.</div>}
      </div>
    </div>
  );
};
