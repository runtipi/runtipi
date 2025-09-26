import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import type { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';

type Props = {
  register: UseFormRegister<typeof dynamicComposeSchemaArk.infer>;
  control: Control<typeof dynamicComposeSchemaArk.infer>;
  serviceIndex: number;
  errors?: FieldErrors<typeof dynamicComposeSchemaArk.infer>;
};

export const AdvancedConfig = ({ register, errors, control, serviceIndex }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="row g-4">
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.networkMode`, { setValueAs: (v) => v.trim() || undefined })}
          error={errors?.services?.[serviceIndex]?.networkMode?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-network-mode">
                {t('MULTI_SERVICE_ADVANCED_NETWORK_MODE_TOOLTIP')}
              </Tooltip>
              {t('MULTI_SERVICE_ADVANCED_NETWORK_MODE')} <span className="ms-1 form-help my-network-mode">?</span>
            </>
          }
          placeholder="bridge"
        />
      </div>
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.workingDir`, { setValueAs: (v) => v || undefined })}
          error={errors?.services?.[serviceIndex]?.workingDir?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-working-dir">
                {t('MULTI_SERVICE_ADVANCED_WORKING_DIR_TOOLTIP')}
              </Tooltip>
              {t('MULTI_SERVICE_ADVANCED_WORKING_DIR')} <span className="ms-1 form-help my-working-dir">?</span>
            </>
          }
          placeholder="/app"
        />
      </div>
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.user`, { setValueAs: (v) => v.trim() || undefined })}
          error={errors?.services?.[serviceIndex]?.user?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-user">
                {t('MULTI_SERVICE_ADVANCED_USER_TOOLTIP')}
              </Tooltip>
              {t('MULTI_SERVICE_ADVANCED_USER')} <span className="ms-1 form-help my-user">?</span>
            </>
          }
          placeholder="1000"
        />
      </div>
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.hostname`, { setValueAs: (v) => v.trim() || undefined })}
          error={errors?.services?.[serviceIndex]?.hostname?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-hostname">
                {t('MULTI_SERVICE_ADVANCED_HOSTNAME_TOOLTIP')}
              </Tooltip>
              {t('MULTI_SERVICE_ADVANCED_HOSTNAME')} <span className="ms-1 form-help my-hostname">?</span>
            </>
          }
          placeholder="my-container"
        />
      </div>
      <div className="col-md-6">
        <Controller
          control={control}
          name={`services.${serviceIndex}.privileged`}
          defaultValue={false}
          render={({ field: { onChange, value, ref, ...rest } }) => (
            <Switch
              ref={ref}
              checked={value}
              onCheckedChange={onChange}
              {...rest}
              label={
                <>
                  <Tooltip className="tooltip" anchorSelect=".my-privileged">
                    {t('MULTI_SERVICE_ADVANCED_PRIVILEGED_MODE_TOOLTIP')}
                  </Tooltip>
                  {t('MULTI_SERVICE_ADVANCED_PRIVILEGED_MODE')} <span className="ms-1 form-help my-privileged">?</span>
                </>
              }
            />
          )}
        />
      </div>
    </div>
  );
};
