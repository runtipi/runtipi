import { Checkbox } from '@/components/ui/Checkbox/Checkbox';
import './elements.css';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import type { dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import { IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';

type Props = {
  control: Control<typeof dynamicComposeSchemaArk.infer>;
  register: UseFormRegister<typeof dynamicComposeSchemaArk.infer>;
  serviceIndex: number;
  errors?: FieldErrors<typeof dynamicComposeSchemaArk.infer>;
};

export const VolumesConfig = ({ errors, serviceIndex, control, register }: Props) => {
  const { t } = useTranslation();
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
              {t('MULTI_SERVICE_VOLUMES_TITLE_TOOLTIP')}
            </Tooltip>
            {t('MULTI_SERVICE_VOLUMES_TITLE')} <span className="ms-1 form-help my-volumes">?</span>
          </div>
          <Button type="button" onClick={() => append({ containerPath: '/', hostPath: '/' })} size="sm">
            {t('MULTI_SERVICE_VOLUMES_ADD_VOLUME')}
          </Button>
        </div>
        <Table className={clsx('border p-1', { 'd-none': fields.length === 0 })}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('MULTI_SERVICE_VOLUMES_HOST_PATH')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_VOLUMES_CONTAINER_PATH')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_VOLUMES_READ_ONLY')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_VOLUMES_SHARED')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_VOLUMES_PRIVATE')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell scope="row" className="w-30">
                  <Input
                    {...register(`services.${serviceIndex}.volumes.${index}.hostPath`, { setValueAs: (v) => v.trim() || undefined })}
                    error={t(errors?.services?.[serviceIndex]?.volumes?.[index]?.hostPath?.message as string)}
                    placeholder="/host/path"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="w-30">
                  <Input
                    {...register(`services.${serviceIndex}.volumes.${index}.containerPath`, { setValueAs: (v) => v.trim() || undefined })}
                    error={t(errors?.services?.[serviceIndex]?.volumes?.[index]?.containerPath?.message as string)}
                    placeholder="/container/path"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.volumes.${index}.readOnly`}
                    defaultValue={false}
                    render={({ field: { value, onChange } }) => <Checkbox className="mb-0" checked={value || false} onCheckedChange={onChange} />}
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.volumes.${index}.shared`}
                    defaultValue={false}
                    render={({ field: { value, onChange } }) => <Checkbox className="mb-0" checked={value || false} onCheckedChange={onChange} />}
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.volumes.${index}.private`}
                    defaultValue={false}
                    render={({ field: { value, onChange } }) => <Checkbox className="mb-0" checked={value || false} onCheckedChange={onChange} />}
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
        {fields.length === 0 && <div className="text-muted small">{t('MULTI_SERVICE_VOLUMES_NO_VOLUMES')}</div>}
      </div>
    </div>
  );
};
