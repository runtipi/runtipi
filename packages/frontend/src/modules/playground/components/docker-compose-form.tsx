import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion/Accordion';
import { Button } from '@/components/ui/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { serviceSchema } from '@runtipi/common/schemas';
import { IconArrowsDownUp, IconCloudDataConnection, IconServer, IconSettings, IconVariable } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { AdvancedConfig } from './elements/advanced';
import { EnvironmentConfig } from './elements/environment';
import { EssentialConfig } from './elements/essential';
import { PortsConfig } from './elements/ports';
import { VolumesConfig } from './elements/volumes';
import type { z } from 'zod';

type ServiceFormData = z.infer<typeof serviceSchema>;

const testDefault = {
  name: 'ctfd',
  image: 'ctfd/ctfd:3.7.7',
  isMain: true,
  internalPort: 8000,
  privileged: true,
  addPorts: [
    {
      hostPort: 1883,
      containerPort: 1883,
    },
    {
      hostPort: 8083,
      containerPort: 8083,
    },
    {
      hostPort: 8084,
      containerPort: 8084,
    },
    {
      hostPort: 8883,
      containerPort: 8883,
    },
  ],
  environment: {
    UPLOAD_FOLDER: '/var/uploads',
    DATABASE_URL: 'mysql+pymysql://tipi:${CTFD_MYSQL_DB_PASSWORD}@ctfd-db/ctfd',
    REDIS_URL: 'redis://ctfd-redis:6379',
    WORKERS: '1',
    LOG_FOLDER: '/var/log/CTFd',
    ACCESS_LOG: '-',
    ERROR_LOG: '-',
    REVERSE_PROXY: 'true',
    SECRET_KEY: '${CTFD_SECRET_KEY}',
  },
  dependsOn: ['ctfd-db'],
  volumes: [
    {
      hostPath: '${APP_DATA_DIR}/data/uploads',
      containerPath: '/var/log/CTFd',
    },
    {
      hostPath: '${APP_DATA_DIR}/data/uploads',
      containerPath: '/var/uploads',
    },
  ],
};

export const DockerComposeForm = () => {
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: testDefault,
    mode: 'onSubmit',
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = form;

  const onSubmit = async (data: ServiceFormData) => {
    try {
      const res = serviceSchema.parse(data); // This will throw if validation fails
      console.warn(res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Form submission failed: ${errorMessage}`);
    }
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h2>Docker Compose Service Configuration</h2>
        <p className="text-muted">Configure your Docker service with the options below.</p>
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-danger">
            <strong>Form has errors:</strong>
            <ul className="mb-0">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>
                  {field}: {typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Invalid value'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Accordion id="accordion">
        <AccordionItem value="essentials">
          <AccordionTrigger className="border-b">
            <IconSettings />
            Essential configuration
          </AccordionTrigger>
          <AccordionContent>
            <EssentialConfig register={form.register} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="environment">
          <AccordionTrigger className="border-b">
            <IconVariable />
            Environment variables
          </AccordionTrigger>
          <AccordionContent>
            <EnvironmentConfig setValue={form.setValue} watch={form.watch} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="volumes">
          <AccordionTrigger className="border-b">
            <IconServer />
            Volume mappings
          </AccordionTrigger>
          <AccordionContent>
            <VolumesConfig setValue={form.setValue} watch={form.watch} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="ports">
          <AccordionTrigger className="border-b">
            <IconArrowsDownUp />
            Port mappings
          </AccordionTrigger>
          <AccordionContent>
            <PortsConfig setValue={form.setValue} watch={form.watch} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="advanced">
          <AccordionTrigger className="border-b">
            <IconCloudDataConnection />
            Advanced configuration
          </AccordionTrigger>
          <AccordionContent>
            <AdvancedConfig register={form.register} control={form.control} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="d-flex justify-content-between align-items-center mt-4">
        <div className="text-muted">{isValid ? '✅ Form is valid' : '❌ Please fix errors above'}</div>
        <Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'loading' : ''}>
          {isSubmitting ? 'Validating...' : 'Validate'}
        </Button>
      </div>
    </form>
  );
};
