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

export const PortsConfig = ({ errors, serviceIndex, control, register }: Props) => {
  const { t } = useTranslation();
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
              {t('MULTI_SERVICE_PORTS_TITLE_TOOLTIP')}
            </Tooltip>
            {t('MULTI_SERVICE_PORTS_TITLE')} <span className="ms-1 form-help my-ports">?</span>
          </div>
          <Button type="button" onClick={() => append({ containerPort: 8080, hostPort: 8080 })} size="sm">
            {t('MULTI_SERVICE_PORTS_ADD_PORT')}
          </Button>
        </div>
        <Table className={clsx('border p-1', { 'd-none': fields.length === 0 })}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('MULTI_SERVICE_PORTS_HOST_PORT')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_PORTS_CONTAINER_PORT')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_PORTS_TCP')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_PORTS_UDP')}</TableHead>
              <TableHead>{t('MULTI_SERVICE_PORTS_INTERFACE')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell scope="row" className="w-30">
                  <Input
                    {...register(`services.${serviceIndex}.addPorts.${index}.hostPort`, { valueAsNumber: true })}
                    error={t(errors?.services?.[serviceIndex]?.addPorts?.[index]?.hostPort?.message as string)}
                    placeholder="8080"
                    type="number"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="w-30">
                  <Input
                    {...register(`services.${serviceIndex}.addPorts.${index}.containerPort`, { valueAsNumber: true })}
                    error={t(errors?.services?.[serviceIndex]?.addPorts?.[index]?.containerPort?.message as string)}
                    placeholder="8080"
                    type="number"
                    className="table-row-input"
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.addPorts.${index}.tcp`}
                    defaultValue={true}
                    render={({ field: { onChange, value, ref, ...rest } }) => (
                      <Checkbox ref={ref} checked={value} onCheckedChange={onChange} {...rest} className="mb-0" />
                    )}
                  />
                </TableCell>
                <TableCell className="w-10">
                  <Controller
                    control={control}
                    name={`services.${serviceIndex}.addPorts.${index}.udp`}
                    defaultValue={true}
                    render={({ field: { onChange, value, ref, ...rest } }) => (
                      <Checkbox ref={ref} checked={value} onCheckedChange={onChange} {...rest} className="mb-0" />
                    )}
                  />
                </TableCell>
                <TableCell className="w-30">
                  <Input
                    {...register(`services.${serviceIndex}.addPorts.${index}.interface`, { setValueAs: (v) => v.trim() || undefined })}
                    error={errors?.services?.[serviceIndex]?.addPorts?.[index]?.interface?.message}
                    placeholder="eth0"
                  />
                </TableCell>
                <TableCell className="w-1">
                  <Button type="button" size="sm" onClick={() => remove(index)} className="btn-action">
                    <IconX size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {fields.length === 0 && <div className="text-muted small">{t('MULTI_SERVICE_PORTS_NO_PORTS')}</div>}
      </div>
    </div>
  );
};
