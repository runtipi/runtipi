import './elements.css';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import type { dynamicComposeSchema } from '@runtipi/common/schemas';
import { IconX } from '@tabler/icons-react';
import clsx from 'clsx';
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
        <Table className={clsx('border p-1', { 'd-none': fields.length === 0 })}>
          <TableHeader>
            <TableRow>
              <TableHead>Host Path</TableHead>
              <TableHead>Container Path</TableHead>
              <TableHead>Read-only</TableHead>
              <TableHead>Shared</TableHead>
              <TableHead>Private</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell scope="row" className="w-30">
                  <Input
                    {...register(`services.${serviceIndex}.volumes.${index}.hostPath`, { setValueAs: (v) => v.trim() || undefined })}
                    error={errors?.services?.[serviceIndex]?.volumes?.[index]?.hostPath?.message}
                    placeholder="/host/path"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="w-30">
                  <Input
                    {...register(`services.${serviceIndex}.volumes.${index}.containerPath`, { setValueAs: (v) => v.trim() || undefined })}
                    error={errors?.services?.[serviceIndex]?.volumes?.[index]?.containerPath?.message}
                    placeholder="/container/path"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.volumes.${index}.readOnly`}
                    defaultValue={false}
                    render={({ field: { value, onChange } }) => <Switch className="mb-0" checked={value || false} onCheckedChange={onChange} />}
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.volumes.${index}.shared`}
                    defaultValue={false}
                    render={({ field: { value, onChange } }) => <Switch className="mb-0" checked={value || false} onCheckedChange={onChange} />}
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.volumes.${index}.private`}
                    defaultValue={false}
                    render={({ field: { value, onChange } }) => <Switch className="mb-0" checked={value || false} onCheckedChange={onChange} />}
                  />
                </TableCell>
                <TableCell className="w-1">
                  <Button type="button" size="sm" onClick={() => remove(index)} className="btn-action">
                    <IconX className="" size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {fields.length === 0 && <div className="text-muted small">No volume mappings added yet. Click "Add Volume" to add one.</div>}
      </div>
    </div>
  );
};
