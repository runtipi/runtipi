import { Input } from '@/components/ui/Input';
import type { dynamicComposeSchema } from '@runtipi/common/schemas';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';
import { useTranslation } from 'react-i18next';

type Props = {
  register: UseFormRegister<z.infer<typeof dynamicComposeSchema>>;
  serviceIndex: number;
  errors?: FieldErrors<z.infer<typeof dynamicComposeSchema>>;
};

export const EssentialConfig = ({ register, errors, serviceIndex }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="row g-4">
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.name`, { setValueAs: (v) => v.trim() || undefined })}
          error={errors?.services?.[serviceIndex]?.name?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-service">
                {t('MULTI_SERVICE_ESSENTIALS_SERVICE_NAME_TOOLTIP')}
              </Tooltip>
              {t('MULTI_SERVICE_ESSENTIALS_SERVICE_NAME')} <span className="ms-1 form-help my-service">?</span>
            </>
          }
          placeholder="my-service"
        />
      </div>
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.image`, { setValueAs: (v) => v.trim() || undefined })}
          error={errors?.services?.[serviceIndex]?.image?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-image">
                {t('MULTI_SERVICE_ESSENTIALS_IMAGE_TOOLTIP')}
              </Tooltip>
              {t('MULTI_SERVICE_ESSENTIALS_IMAGE')} <span className="ms-1 form-help my-image">?</span>
            </>
          }
          placeholder="nginx:latest"
        />
      </div>
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.internalPort`, { valueAsNumber: true })}
          error={errors?.services?.[serviceIndex]?.internalPort?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-internal-port">
                {t('MULTI_SERVICE_ESSENTIALS_INTERNAL_PORT_TOOLTIP')}
              </Tooltip>
              {t('MULTI_SERVICE_ESSENTIALS_INTERNAL_PORT')} <span className="ms-1 form-help my-internal-port">?</span>
            </>
          }
          type="number"
          placeholder="8080"
          min={1}
          max={65535}
        />
      </div>
    </div>
  );
};
