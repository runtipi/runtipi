import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { dynamicComposeSchema, type serviceSchema } from '@runtipi/common/schemas';
import { IconPlus, IconX, IconCheck, IconCode } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { DockerServiceForm } from './docker-service-form';
import { JsonComposeEditor } from './json-compose-editor';
import { useMultiServiceStore } from '@/stores/multiServiceStore';

type MultiServiceFormData = z.infer<typeof dynamicComposeSchema>;
type ServiceFormData = z.infer<typeof serviceSchema>;

export const MultiServiceForm = () => {
  const { services, activeTab, setActiveTab, isValid, isDirty, setIsDirty, addService, removeService, updateService } = useMultiServiceStore();

  const form = useForm<MultiServiceFormData>({
    resolver: zodResolver(dynamicComposeSchema),
    defaultValues: {
      services,
    },
    mode: 'onSubmit',
  });

  const handleTabChange = (newTab: string) => {
    if (activeTab === 'json' && isDirty && newTab !== 'json') {
      if (!window.confirm('You have made changes to the JSON. Do you want to confirm losing them?')) {
        return;
      }
    }
    setActiveTab(newTab);
  };

  const canLeaveJsonTab = () => {
    if (activeTab === 'json' && isDirty) {
      return window.confirm('You have made changes to the JSON. Do you want to confirm losing them?');
    }
    return true;
  };

  const confirmActionIfDirty = (action: () => void) => {
    if (canLeaveJsonTab()) {
      action();
    }
  };

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = form;

  useEffect(() => {
    setValue(
      'services',
      services.map(({ _id, ...service }) => service),
    );
  }, [services, setValue]);

  const onSubmit = async (data: MultiServiceFormData) => {
    try {
      const res = dynamicComposeSchema.parse(data); // This will throw if validation fails
      alert(`✅ Successfully validated ${res.services.length} services!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Form submission failed: ${errorMessage}`);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
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

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {services.map((service, index) => (
            <TabsTrigger key={service._id} value={String(index)} className="position-relative">
              <span className="me-2">
                {service.name || `Service ${index + 1}`}
                {service.isMain && <span className="badge bg-primary ms-1 text-xs text-white">Main</span>}
              </span>
              {services.length > 1 && (
                <button
                  type="button"
                  className="btn-close-white ms-2"
                  aria-label="Remove service"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmActionIfDirty(() => removeService(index));
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
          ))}
          <TabsTrigger
            value="add-new"
            onClick={(e) => {
              e?.preventDefault();
              confirmActionIfDirty(addService);
              return false; // Prevent tab change
            }}
            className="text-muted"
          >
            <IconPlus size={16} className="me-1" />
            Add Service
          </TabsTrigger>

          <TabsTrigger value="json" className="text-muted ms-auto">
            <IconCode size={16} className="me-1" />
            JSON
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

        <TabsContent value="add-new">
          <div>{/* Empty content for add-new tab */}</div>
        </TabsContent>

        <TabsContent value="json">
          <JsonComposeEditor />
        </TabsContent>
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
