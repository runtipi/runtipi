import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion/Accordion';
import { serviceSchema } from '@runtipi/common/schemas';
import { IconArrowsDownUp, IconCloudDataConnection, IconServer, IconSettings, IconVariable } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  onServiceChange: (serviceData: ServiceFormData) => void;
  isMainService?: boolean;
}

export const DockerServiceForm = ({ serviceData, serviceIndex, onServiceChange, isMainService }: Props) => {
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: serviceData,
    mode: 'onChange',
  });

  const {
    formState: { errors },
    watch,
    setValue,
    register,
    control,
  } = form;

  useEffect(() => {
    const subscription = watch((values) => {
      if (values) {
        onServiceChange(values as ServiceFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onServiceChange]);

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="service-form">
      <div className="mb-3">
        <h4 className="h4 mb-2">
          Service {serviceIndex + 1}: {serviceData.name || 'Unnamed Service'}
          {isMainService && <span className="badge bg-primary ms-2 text-white">Main Service</span>}
        </h4>
        <p className="text-muted">Configure the Docker service settings below. The main service is typically the primary application container.</p>
        {hasErrors && (
          <div className="alert alert-warning">
            <strong>This service has validation errors:</strong>
            <ul className="mb-0 mt-1">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>
                  {field}: {typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Invalid value'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Accordion id={`accordion-service-${serviceIndex}`}>
        <AccordionItem value="essentials">
          <AccordionTrigger className="border-b">
            <IconSettings className="me-2" />
            Essential configuration
          </AccordionTrigger>
          <AccordionContent>
            <EssentialConfig register={register} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="environment">
          <AccordionTrigger className="border-b">
            <IconVariable className="me-2" />
            Environment variables
          </AccordionTrigger>
          <AccordionContent>
            <EnvironmentConfig setValue={setValue} watch={watch} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="volumes">
          <AccordionTrigger className="border-b">
            <IconServer className="me-2" />
            Volume mappings
          </AccordionTrigger>
          <AccordionContent>
            <VolumesConfig setValue={setValue} watch={watch} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="ports">
          <AccordionTrigger className="border-b">
            <IconArrowsDownUp className="me-2" />
            Port mappings
          </AccordionTrigger>
          <AccordionContent>
            <PortsConfig setValue={setValue} watch={watch} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="advanced">
          <AccordionTrigger className="border-b">
            <IconCloudDataConnection className="me-2" />
            Advanced configuration
          </AccordionTrigger>
          <AccordionContent>
            <AdvancedConfig register={register} control={control} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
