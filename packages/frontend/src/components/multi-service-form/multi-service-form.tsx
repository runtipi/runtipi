import './services-form.css';
import { Button } from '@/components/ui/Button';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import { IconArrowsDownUp, IconCloudDataConnection, IconPlus, IconServer, IconSettings, IconVariable, IconX } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { JsonComposeEditor } from './json-compose-editor';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AdvancedConfig } from './elements/advanced';
import { PortsConfig } from './elements/ports';
import { VolumesConfig } from './elements/volumes';
import { EnvironmentConfig } from './elements/environment';
import { EssentialConfig } from './elements/essential';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { deepClean } from '@/utils/objects';
import { type } from 'arktype';

type Props = {
  onSubmit?: (data: typeof dynamicComposeSchemaArk.infer) => void;
};

const cleanSchema = type.pipe((d) => dynamicComposeSchemaArk.omit('schemaVersion')(deepClean(d)));

export const MultiServiceForm = ({ onSubmit }: Props) => {
  const { t } = useTranslation();
  const {
    services,
    updateFromJson,
    activeService,
    setActiveService,
    addService,
    removeService,
    updateService,
    error,
    validate,
    isDirty,
    setIsDirty,
  } = useMultiServiceStore();
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [json, setJson] = useState<{ value: string; error?: string }>({
    value: '',
    error: undefined,
  });
  const [activeTab, setActiveTab] = useState('essentials');

  const tabs = [
    {
      id: 'essentials',
      label: t('MULTI_SERVICE_TAB_ESSENTIALS'),
      icon: IconSettings,
    },
    {
      id: 'environment',
      label: t('MULTI_SERVICE_TAB_ENVIRONMENT'),
      icon: IconVariable,
    },
    { id: 'volumes', label: t('MULTI_SERVICE_TAB_VOLUMES'), icon: IconServer },
    {
      id: 'ports',
      label: t('MULTI_SERVICE_TAB_PORTS'),
      icon: IconArrowsDownUp,
    },
    {
      id: 'advanced',
      label: t('MULTI_SERVICE_TAB_ADVANCED'),
      icon: IconCloudDataConnection,
    },
  ];

  const form = useForm<typeof dynamicComposeSchemaArk.infer>({
    resolver: arktypeResolver(cleanSchema as unknown as typeof dynamicComposeSchemaArk),
    defaultValues: {
      services,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // biome-ignore lint/suspicious/noExplicitAny: We need any type here
  function saveBeforeAction<T extends (...args: any[]) => any>(action: T) {
    return (...args: Parameters<T>): ReturnType<T> => {
      if (isDirty && jsonEditorOpen) {
        const confirmLeave = window.confirm(t('MULTI_SERVICE_UNSAVED_CHANGES_CONFIRM'));
        if (!confirmLeave) {
          return undefined as ReturnType<T>;
        }

        setIsDirty(false);
      }

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
      <li className="nav-item nav-item-c" key={tabId}>
        <button type="button" className={tabClass} aria-current="page" onClick={() => setActiveTab(tabId)}>
          <span className="nav-link-icon nav-link-icon-c">
            <IconComponent size={24} />
          </span>
          <span className="nav-link-title nav-link-title-c">{label}</span>
          {hasSectionErrors(tabId, index) && <span className="ms-1 text-danger">*</span>}
        </button>
      </li>
    );
  };

  const handleSubmit = async (data: typeof dynamicComposeSchemaArk.infer) => {
    const valid = validate(data);

    if (valid) {
      onSubmit?.(data);
    } else {
      toast.error(t(error));
    }
  };

  return (
    <form className="flex flex-col" onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="main-container bg-card border rounded-3 mt-4 m-0">
        {jsonEditorOpen && <JsonComposeEditor onChange={(json, jsonError) => setJson({ value: json, error: jsonError })} />}
        {!jsonEditorOpen && (
          <div className="row ms-0 me-0">
            <div className="col-12 col-md-2 border-end p-0">
              <div className="d-flex justify-content-between align-items-center p-3">
                <div className="fw-bold">{t('MULTI_SERVICE_SERVICES')}</div>
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
                          <span>
                            {service.name ||
                              t('MULTI_SERVICE_SERVICE_NAME', {
                                index: index + 1,
                              })}
                          </span>
                          {serviceHasError(index) && <span className="ms-1 text-danger">*</span>}
                        </div>
                        {!service.isMain && (
                          <button
                            type="button"
                            className="btn-close btn-close-white ms-2"
                            aria-label={t('MULTI_SERVICE_REMOVE_SERVICE')}
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
            <div className="col col-12 col-md-10">
              <div className="col">
                <ul className="nav nav-underline pt-2 gap-4 flex-nowrap overflow-auto">
                  {activeService !== 'json' && services[activeService] && tabs.map((tab) => renderTab(tab.id, tab.label, tab.icon, activeService))}
                </ul>
              </div>
              <div className="col pt-4 px-3 pb-5">
                {services.map((service, index) => {
                  return (
                    <div key={service._id} className={clsx({ 'd-none': index !== activeService })}>
                      <div
                        className={clsx({
                          'd-none': activeTab !== 'essentials',
                        })}
                      >
                        <EssentialConfig register={form.register} serviceIndex={index} errors={form.formState.errors} />
                      </div>
                      <div
                        className={clsx({
                          'd-none': activeTab !== 'environment',
                        })}
                      >
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
        )}
        <div className="d-flex justify-content-between align-items-center p-3 rounded-bottom border-top">
          <Button disabled={jsonEditorOpen} type="submit" className={clsx({ 'd-none': jsonEditorOpen })}>
            {t('MULTI_SERVICE_VALIDATE_ALL_SERVICES')}
          </Button>
          <Button
            className={clsx({ 'd-none': !jsonEditorOpen })}
            type="button"
            disabled={Boolean(json.error)}
            onClick={() => {
              form.clearErrors();
              updateFromJson(JSON.parse(json.value).services);
            }}
          >
            {t('MULTI_SERVICE_JSON_SAVE')}
          </Button>
          <div
            className={clsx('text-muted small text-center', {
              'd-none': !jsonEditorOpen,
            })}
          >
            <a
              href="https://runtipi.io/docs/reference/dynamic-compose"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted small underline-offset-2 hover:underline"
            >
              {t('MULTI_SERVICE_JSON_REFERENCE')}
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveBeforeAction(setJsonEditorOpen)((v) => !v);
            }}
          >
            <span className="d-flex align-items-center">{jsonEditorOpen ? t('MULTI_SERVICE_BACK_TO_FORM') : t('MULTI_SERVICE_JSON_EDITOR')}</span>
          </Button>
        </div>
      </div>
    </form>
  );
};
