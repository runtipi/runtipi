import { Input } from '@/components/ui/Input';
import type { dynamicComposeSchema } from '@runtipi/common/schemas';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type Props = {
  register: UseFormRegister<z.infer<typeof dynamicComposeSchema>>;
  serviceIndex: number;
  errors?: FieldErrors<z.infer<typeof dynamicComposeSchema>>;
};

export const EssentialConfig = ({ register, errors, serviceIndex }: Props) => {
  return (
    <div className="row g-4">
      <div className="col-md-6">
        <Input
          {...register(`services.${serviceIndex}.name`, { setValueAs: (v) => v.trim() || undefined })}
          error={errors?.services?.[serviceIndex]?.name?.message}
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-service">
                Unique identifier for your service
              </Tooltip>
              {'Service name'} <span className="ms-1 form-help my-service">?</span>
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
                Docker image to use for the service
              </Tooltip>
              {'Image'} <span className="ms-1 form-help my-image">?</span>
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
                Port on which the service listens inside the container
              </Tooltip>
              {'Internal Port'} <span className="ms-1 form-help my-internal-port">?</span>
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
