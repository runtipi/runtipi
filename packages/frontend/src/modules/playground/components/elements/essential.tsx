import { Input } from '@/components/ui/Input';
import type { serviceSchema } from '@runtipi/common/schemas';
import type { UseFormRegister } from 'react-hook-form';
import { Tooltip } from 'react-tooltip';
import type z from 'zod';

type Props = {
  register: UseFormRegister<z.infer<typeof serviceSchema>>;
};

export const EssentialConfig = ({ register }: Props) => {
  return (
    <div className="row g-4">
      <div className="col-md-6">
        <Input
          {...register('name')}
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
          label={
            <>
              <Tooltip className="tooltip" anchorSelect=".my-image">
                Docker image to use for the service
              </Tooltip>
              {'Image'} <span className="ms-1 form-help my-image">?</span>
            </>
          }
          placeholder="nginx:latest"
          {...register('image')}
        />
      </div>
      <div className="col-md-6">
        <Input
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
          {...register('internalPort')}
          min={1}
          max={65535}
        />
      </div>
    </div>
  );
};
