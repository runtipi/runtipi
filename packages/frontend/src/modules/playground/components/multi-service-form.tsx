import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { dynamicComposeSchema, type serviceSchema } from '@runtipi/common/schemas';
import { IconPlus, IconX, IconCheck } from '@tabler/icons-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { DockerServiceForm } from './docker-service-form';

type MultiServiceFormData = z.infer<typeof dynamicComposeSchema>;
type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceWithId extends ServiceFormData {
  _id: string;
}

const defaultService: ServiceFormData = {
  name: '',
  image: '',
  isMain: false,
  internalPort: 80,
  environment: {},
  volumes: [],
  addPorts: [],
};

const generateId = () => `service-${window.crypto.randomUUID()}`;

export const MultiServiceForm = () => {
  const [activeTab, setActiveTab] = React.useState('0');
  const [services, setServices] = React.useState<ServiceWithId[]>([
    {
      _id: generateId(),
      name: 'web',
      image: 'nginx:alpine',
      isMain: true,
      internalPort: 80,
      environment: {
        NGINX_PORT: '80',
      },
      volumes: [
        {
          hostPath: '$' + '{APP_DATA_DIR}/html',
          containerPath: '/usr/share/nginx/html',
        },
      ],
      addPorts: [
        {
          hostPort: 8080,
          containerPort: 80,
        },
      ],
    },
    {
      _id: generateId(),
      name: 'db',
      image: 'postgres:15',
      isMain: false,
      internalPort: 5432,
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        // Docker Compose variable placeholder
        POSTGRES_PASSWORD: '$' + '{DB_PASSWORD}',
      },
      volumes: [
        {
          // Docker Compose variable placeholder
          hostPath: '$' + '{APP_DATA_DIR}/postgres',
          containerPath: '/var/lib/postgresql/data',
        },
      ],
      healthCheck: {
        test: 'pg_isready -U myuser -d myapp',
        interval: '30s',
        timeout: '10s',
        retries: 3,
      },
    },
  ]);

  const form = useForm<MultiServiceFormData>({
    resolver: zodResolver(dynamicComposeSchema),
    defaultValues: {
      services: services.map(({ _id, ...service }) => service),
    },
    mode: 'onSubmit',
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
  } = form;

  const addService = () => {
    const newService: ServiceWithId = {
      ...defaultService,
      _id: generateId(),
      name: `service-${services.length + 1}`,
    };
    const newServices = [...services, newService];

    setServices(newServices);
    setValue(
      'services',
      newServices.map(({ _id, ...service }) => service),
    );

    setActiveTab(String(services.length));
  };

  const removeService = (index: number) => {
    if (services.length === 1) return;

    const newServices = services.filter((_, i) => i !== index);
    setServices(newServices);
    setValue(
      'services',
      newServices.map(({ _id, ...service }) => service),
    );

    const currentIndex = Number.parseInt(activeTab, 10);

    if (currentIndex === index) {
      setActiveTab('0');
    } else if (currentIndex > index) {
      setActiveTab(String(currentIndex - 1));
    }
  };

  const updateService = (index: number, serviceData: ServiceFormData) => {
    const newServices = [...services];
    const existingService = services[index];

    if (existingService) {
      newServices[index] = { ...serviceData, _id: existingService._id };
      setServices(newServices);
      setValue(
        'services',
        newServices.map(({ _id, ...service }) => service),
      );
    }
  };

  const onSubmit = async (data: MultiServiceFormData) => {
    try {
      const res = dynamicComposeSchema.parse(data); // This will throw if validation fails
      console.info(`✅ Successfully validated ${res.services.length} services!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Form submission failed: ${errorMessage}`);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <h2 className="h2">Docker Compose Services Configuration</h2>
        <p className="text-muted">
          Configure multiple Docker services for your application. Each service will be part of the same Docker Compose file.
        </p>
        {hasErrors && (
          <div className="alert alert-danger mt-3">
            <strong>Form has errors:</strong>
            <ul className="mb-0 mt-2">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>
                  {field}: {typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Invalid value'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {services.map((service, index) => {
            return (
              <TabsTrigger key={service._id} value={String(index)} className="position-relative">
                <span className="me-2">
                  {service.name || `Service ${index + 1}`}
                  {service.isMain && <span className="badge bg-primary ms-1 text-xs text-white">Main</span>}
                  {/* {hasServiceErrors && <span className="text-danger ms-1">●</span>} */}
                </span>
                {services.length > 1 && (
                  <button
                    type="button"
                    className="btn-close-white ms-2"
                    aria-label="Remove service"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeService(index);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'currentColor',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    <IconX size={14} />
                  </button>
                )}
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="add-new" onClick={addService} className="text-muted">
            <IconPlus size={16} className="me-1" />
            Add Service
          </TabsTrigger>
        </TabsList>

        {services.map((service, index) => (
          <TabsContent key={service._id} value={String(index)}>
            <DockerServiceForm
              serviceData={service}
              serviceIndex={index}
              onServiceChange={(serviceData: ServiceFormData) => updateService(index, serviceData)}
              isMainService={service.isMain}
            />
          </TabsContent>
        ))}
        <TabsContent value="add-new" />
      </Tabs>

      <div className="d-flex justify-content-between align-items-center mt-4 p-3 bg-light rounded">
        <div className="d-flex align-items-center gap-3">
          <div className="text-muted">
            {isValid ? (
              <span className="text-success">
                <IconCheck size={16} className="me-1" />
                All {services.length} service{services.length !== 1 ? 's' : ''} valid
              </span>
            ) : (
              <span className="text-danger">❌ Please fix errors in the services above</span>
            )}
          </div>
          <div className="text-muted">
            Total services: <strong>{services.length}</strong>
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'loading' : ''}>
          {isSubmitting ? 'Validating...' : 'Validate All Services'}
        </Button>
      </div>
    </form>
  );
};
