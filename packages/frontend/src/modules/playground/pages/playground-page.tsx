import './services-form.css';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { IconArrowsDownUp, IconCloudDataConnection, IconPlus, IconServer, IconSettings, IconVariable, IconX } from '@tabler/icons-react';
import { EssentialConfig } from '../components/elements/essential';
import { zodResolver } from '@hookform/resolvers/zod';
import { dynamicComposeSchema } from '@runtipi/common/schemas';
import { useForm } from 'react-hook-form';
import type z from 'zod';
import { EnvironmentConfig } from '../components/elements/environment';
import { VolumesConfig } from '../components/elements/volumes';
import { PortsConfig } from '../components/elements/ports';
import { AdvancedConfig } from '../components/elements/advanced';
import { Button } from '@/components/ui/Button';

const tabs = [
  { id: 'essentials', label: 'Essentials', icon: IconSettings },
  { id: 'environment', label: 'Environment', icon: IconVariable },
  { id: 'volumes', label: 'Volumes', icon: IconServer },
  { id: 'ports', label: 'Ports', icon: IconArrowsDownUp },
  { id: 'advanced', label: 'Advanced', icon: IconCloudDataConnection },
];

export default function PlaygroundPage() {
  const { services, activeService, setActiveService, addService, removeService, updateService, isValid, error } = useMultiServiceStore();
  const [activeTab, setActiveTab] = useState('essentials');

  const form = useForm<z.infer<typeof dynamicComposeSchema>>({
    resolver: zodResolver(dynamicComposeSchema),
    defaultValues: {
      services,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // biome-ignore lint/suspicious/noExplicitAny: We need any type here
  function saveBeforeAction<T extends (...args: any[]) => any>(action: T) {
    return (...args: Parameters<T>): ReturnType<T> => {
      const values = form.getValues();
      values.services.forEach((service, index) => {
        updateService(index, service);
      });

      return action(...args);
    };
  }

  useEffect(() => {
    form.setValue('services', services);
  }, [services, form.setValue]);

  const hasSectionErrors = (section: string, index: number): boolean => {
    const serviceErrors = form.formState.errors?.services?.[index];
    if (!serviceErrors) return false;

    switch (section) {
      case 'essentials':
        return Boolean(serviceErrors.name || serviceErrors.image || serviceErrors.internalPort);
      case 'environment':
        return Boolean(
          serviceErrors.environment && Array.isArray(serviceErrors.environment) && serviceErrors.environment.some((env) => env?.key || env?.value),
        );
      case 'volumes':
        return Boolean(
          serviceErrors.volumes && Array.isArray(serviceErrors.volumes) && serviceErrors.volumes.some((vol) => vol?.hostPath || vol?.containerPath),
        );
      case 'ports':
        return Boolean(
          serviceErrors.addPorts &&
            Array.isArray(serviceErrors.addPorts) &&
            serviceErrors.addPorts.some((port) => port?.hostPort || port?.containerPort || port?.interface),
        );
      case 'advanced':
        return Boolean(
          serviceErrors.networkMode || serviceErrors.workingDir || serviceErrors.user || serviceErrors.hostname || serviceErrors.privileged,
        );
      default:
        return false;
    }
  };

  const serviceHasError = (index: number): boolean => {
    return Boolean(form.formState.errors.services?.[index]);
  };

  const renderTab = (tabId: string, label: string, IconComponent: typeof IconSettings, index: number) => {
    const isActive = activeTab === tabId;
    const tabClass = clsx('nav-link', { active: isActive });

    return (
      <li className="nav-item" key={tabId}>
        <button type="button" className={tabClass} aria-current="page" onClick={() => setActiveTab(tabId)}>
          <span className="nav-link-icon">
            <IconComponent size={24} />
          </span>
          <span className="nav-link-title">{label}</span>
          {hasSectionErrors(tabId, index) && <span className="ms-1 text-danger">*</span>}
        </button>
      </li>
    );
  };

  const onSubmit = async (data: z.infer<typeof dynamicComposeSchema>) => {
    try {
      const res = dynamicComposeSchema.parse(data);
      console.error(res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Form submission failed: ${errorMessage}`);
    }
  };

  return (
    <form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="container main-container bg-white border rounded mt-4">
        <div className="row ms-0 me-0">
          <div className="col-12 col-md-2 border-end p-0">
            <div className="d-flex justify-content-between align-items-center p-3">
              <div className="fw-bold">Services</div>
              <IconPlus className="text-primary cursor-pointer" size={20} onClick={() => saveBeforeAction(addService)()} />
            </div>
            <div className="w-full border-top">
              <div className="list-group list-group-transparent m-0">
                {services.map((service, index) => (
                  <button
                    type="button"
                    key={service._id}
                    className={clsx('list-group-item list-group-item-action d-flex align-items-center', { active: index === activeService })}
                    onClick={() => saveBeforeAction(setActiveService)(index)}
                  >
                    <div className="d-flex justify-content-between align-items-center w-full">
                      <div>
                        <span>{service.name || `Service ${index + 1}`}</span>
                        {serviceHasError(index) && <span className="ms-1 text-danger">*</span>}
                      </div>
                      {!service.isMain && (
                        <button
                          type="button"
                          className="btn-close btn-close-white ms-2"
                          aria-label="Remove service"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveBeforeAction(removeService)(index);
                          }}
                        >
                          <IconX />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="col col-12 col-md-10 mb-5">
            <div className="col">
              <ul className="nav nav-underline mt-2 gap-4">
                {activeService !== 'json' && services[activeService] && tabs.map((tab) => renderTab(tab.id, tab.label, tab.icon, activeService))}
              </ul>
            </div>
            <div className="col pt-4 px-3">
              {services.map((service, index) => {
                return (
                  <div key={service._id} className={clsx({ 'd-none': index !== activeService })}>
                    <div className={clsx({ 'd-none': activeTab !== 'essentials' })}>
                      <EssentialConfig register={form.register} serviceIndex={index} errors={form.formState.errors} />
                    </div>
                    <div className={clsx({ 'd-none': activeTab !== 'environment' })}>
                      <EnvironmentConfig control={form.control} register={form.register} serviceIndex={index} errors={form.formState.errors} />
                    </div>
                    <div className={clsx({ 'd-none': activeTab !== 'volumes' })}>
                      <VolumesConfig control={form.control} register={form.register} serviceIndex={index} errors={form.formState.errors} />
                    </div>
                    <div className={clsx({ 'd-none': activeTab !== 'ports' })}>
                      <PortsConfig control={form.control} register={form.register} serviceIndex={index} errors={form.formState.errors} />
                    </div>
                    <div className={clsx({ 'd-none': activeTab !== 'advanced' })}>
                      <AdvancedConfig register={form.register} serviceIndex={index} errors={form.formState.errors} control={form.control} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-4 p-3 bg-light rounded-bottom">
          <Button type="submit">{'Validate All Services'}</Button>
        </div>
      </div>
    </form>
  );
}
