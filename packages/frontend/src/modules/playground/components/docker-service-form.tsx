import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion/Accordion';
import type { dynamicComposeSchema, serviceSchema } from '@runtipi/common/schemas';
import { IconArrowsDownUp, IconCloudDataConnection, IconServer, IconSettings, IconVariable } from '@tabler/icons-react';
import type { UseFormReturn } from 'react-hook-form';
import { AdvancedConfig } from './elements/advanced';
import { EnvironmentConfig } from './elements/environment';
import { EssentialConfig } from './elements/essential';
import { PortsConfig } from './elements/ports';
import { VolumesConfig } from './elements/volumes';
import type { z } from 'zod';

type ServiceFormData = z.infer<typeof serviceSchema>;

interface Props {
  serviceData: ServiceFormData;
  serviceIndex: number;
  isMainService?: boolean;
  form: UseFormReturn<z.infer<typeof dynamicComposeSchema>>;
}

export const DockerServiceForm = ({ form, serviceData, serviceIndex, isMainService }: Props) => {
  const { formState, register, control } = form;
  const { errors } = formState;

  return (
    <div className="service-form">
      <div className="mb-3">
        <h4 className="h4 mb-2">
          Service {serviceIndex + 1}: {serviceData.name || 'Unnamed Service'}
          {isMainService && <span className="badge bg-primary ms-2 text-white">Main Service</span>}
        </h4>
        <p className="text-muted">
          Configure the Docker service settings below. The main service is typically the primary application container where web traffic is directed.
        </p>
      </div>
      <Accordion id={`accordion-service-${serviceIndex}`}>
        <AccordionItem value="essentials">
          <AccordionTrigger className="border-b">
            <IconSettings className="me-2" />
            Essential configuration
          </AccordionTrigger>
          <AccordionContent>
            <EssentialConfig errors={errors} serviceIndex={serviceIndex} register={register} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="environment">
          <AccordionTrigger className="border-b">
            <IconVariable className="me-2" />
            Environment variables
          </AccordionTrigger>
          <AccordionContent>
            <EnvironmentConfig errors={errors} serviceIndex={serviceIndex} register={register} control={control} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="volumes">
          <AccordionTrigger className="border-b">
            <IconServer className="me-2" />
            Volume mappings
          </AccordionTrigger>
          <AccordionContent>
            <VolumesConfig errors={errors} serviceIndex={serviceIndex} control={control} register={register} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="ports">
          <AccordionTrigger className="border-b">
            <IconArrowsDownUp className="me-2" />
            Port mappings
          </AccordionTrigger>
          <AccordionContent>
            <PortsConfig errors={errors} serviceIndex={serviceIndex} control={control} register={register} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="advanced">
          <AccordionTrigger className="border-b">
            <IconCloudDataConnection className="me-2" />
            Advanced configuration
          </AccordionTrigger>
          <AccordionContent>
            <AdvancedConfig errors={errors} serviceIndex={serviceIndex} control={control} register={register} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
