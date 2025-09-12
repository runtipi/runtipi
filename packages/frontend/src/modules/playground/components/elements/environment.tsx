import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { dynamicComposeSchema } from '@runtipi/common/schemas';
import { IconTrash } from '@tabler/icons-react';
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type Props = {
  control: Control<z.infer<typeof dynamicComposeSchema>>;
  register: UseFormRegister<z.infer<typeof dynamicComposeSchema>>;
  serviceIndex: number;
  errors?: FieldErrors<z.infer<typeof dynamicComposeSchema>>;
};

export const EnvironmentConfig = ({ errors, serviceIndex, control, register }: Props) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `services.${serviceIndex}.environment`,
  });

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
          <Button type="button" onClick={() => append({ key: '', value: '' })} size="sm">
            Add Variable
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="row g-2 mb-2 align-items-end">
            <div className="col-md-5">
              <Input
                {...register(`services.${serviceIndex}.environment.${index}.key`, { setValueAs: (v) => v.trim() || undefined })}
                error={errors?.services?.[serviceIndex]?.environment?.[index]?.key?.message}
                placeholder="KEY"
                label={index === 0 ? 'Key' : undefined}
              />
            </div>
            <div className="col-md-6">
              <Input
                {...register(`services.${serviceIndex}.environment.${index}.value`, { setValueAs: (v) => v.trim() || undefined })}
                error={errors?.services?.[serviceIndex]?.environment?.[index]?.value?.message}
                placeholder="value"
                label={index === 0 ? 'Value' : undefined}
              />
            </div>
            <div className="col-md-1">
              <Button type="button" onClick={() => remove(index)} variant="outline" intent="danger" className="w-full">
                <IconTrash size={20} />
              </Button>
            </div>
          </div>
        ))}
        {fields.length === 0 && <div className="text-muted small">No environment variables added yet. Click "Add Variable" to add one.</div>}
      </div>
    </div>
  );
};
