import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { dynamicComposeSchema } from '@runtipi/common/schemas';
import { IconPlus, IconX, IconCode } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { DockerServiceForm } from './docker-service-form';
import { JsonComposeEditor } from './json-compose-editor';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import { useEffect } from 'react';

export const MultiServiceForm = () => {
  const { services, activeTab, setActiveTab, addService, removeService, updateService, isValid, error } = useMultiServiceStore();

  const form = useForm<z.infer<typeof dynamicComposeSchema>>({
    resolver: zodResolver(dynamicComposeSchema),
    defaultValues: {
      services,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    getValues,
    setValue,
  } = form;

  useEffect(() => {
    setValue('services', services);
  }, [services, setValue]);

  // biome-ignore lint/suspicious/noExplicitAny: We need any type here
  function saveBeforeAction<T extends (...args: any[]) => any>(action: T) {
    return (...args: Parameters<T>): ReturnType<T> => {
      const values = getValues();
      values.services.forEach((service, index) => {
        updateService(index, service);
      });

      return action(...args);
    };
  }

  const onSubmit = async (data: z.infer<typeof dynamicComposeSchema>) => {
    try {
      const res = dynamicComposeSchema.parse(data); // This will throw if validation fails
      console.error(res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Form submission failed: ${errorMessage}`);
    }
  };

  return (
    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
      <Tabs value={activeTab} onValueChange={saveBeforeAction(setActiveTab)} className="w-full" defaultValue="0">
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
                    saveBeforeAction(removeService)(index);
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
              saveBeforeAction(addService)();
              return false;
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
            <DockerServiceForm form={form} serviceData={service} serviceIndex={index} isMainService={service.isMain} />
          </TabsContent>
        ))}

        <TabsContent value="add-new">
          <div />
        </TabsContent>

        <TabsContent value="json">
          <JsonComposeEditor />
        </TabsContent>
      </Tabs>

      <div className="d-flex justify-content-between align-items-center mt-4 p-3 bg-light rounded">
        <Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'loading' : ''}>
          {isSubmitting ? 'Validating...' : 'Validate All Services'}
        </Button>
      </div>
    </form>
  );
};
