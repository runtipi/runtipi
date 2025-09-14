import './elements.css';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import type { dynamicComposeSchema } from '@runtipi/common/schemas';
import { IconX } from '@tabler/icons-react';
import clsx from 'clsx';
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
        <Table className={clsx('border p-1', { 'd-none': fields.length === 0 })}>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell scope="row" className="w-50">
                  <Input
                    {...register(`services.${serviceIndex}.environment.${index}.key`, { setValueAs: (v) => v.trim() || undefined })}
                    error={errors?.services?.[serviceIndex]?.environment?.[index]?.key?.message}
                    placeholder="KEY"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="w-50">
                  <Input
                    {...register(`services.${serviceIndex}.environment.${index}.value`, { setValueAs: (v) => v.trim() || undefined })}
                    error={errors?.services?.[serviceIndex]?.environment?.[index]?.value?.message}
                    placeholder="value"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="align-middle w-1">
                  <Button type="button" size="sm" onClick={() => remove(index)} className="btn-action">
                    <IconX className="" size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {fields.length === 0 && <div className="text-muted small">No environment variables added yet. Click "Add Variable" to add one.</div>}
      </div>
    </div>
  );
};
