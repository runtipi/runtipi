import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { dynamicComposeSchema } from '@runtipi/common/schemas';
import type { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type Props = {
  register: UseFormRegister<z.infer<typeof dynamicComposeSchema>>;
  control: Control<z.infer<typeof dynamicComposeSchema>>;
  serviceIndex: number;
  errors?: FieldErrors<z.infer<typeof dynamicComposeSchema>>;
};

export const AdvancedConfig = ({ register, errors, control, serviceIndex }: Props) => {
  return (
    <div className="row g-4">
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.networkMode`, { setValueAs: (v) => v.trim() || undefined })}
          error={errors?.services?.[serviceIndex]?.networkMode?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-network-mode">
                Docker network mode for the container
              </Tooltip>
              {'Network mode'} <span className="ms-1 form-help my-network-mode">?</span>
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
                Working directory inside the container
              </Tooltip>
              {'Working directory'} <span className="ms-1 form-help my-working-dir">?</span>
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
                User to run the container as
              </Tooltip>
              {'User'} <span className="ms-1 form-help my-user">?</span>
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
                Hostname for the container
              </Tooltip>
              {'Hostname'} <span className="ms-1 form-help my-hostname">?</span>
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
                    Run container in privileged mode
                  </Tooltip>
                  {'Privileged Mode'} <span className="ms-1 form-help my-privileged">?</span>
                </>
              }
            />
          )}
        />
      </div>
    </div>
  );
};
