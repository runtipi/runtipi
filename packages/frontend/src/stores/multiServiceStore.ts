import { create } from 'zustand';
import { type } from 'arktype';
import { dynamicComposeSchemaArk, type serviceSchemaArk } from '@runtipi/common/schemas';
import toast from 'react-hot-toast';
import { t } from 'i18next';

type MultiServiceFormData = typeof dynamicComposeSchemaArk.infer;
type ServiceFormData = typeof serviceSchemaArk.infer;

interface ServiceWithId extends ServiceFormData {
  _id: string;
}

interface MultiServiceState {
  // State
  services: ServiceWithId[];
  activeService: number | 'json';
  isDirty: boolean;
  error: string;
  validate: (values: typeof dynamicComposeSchemaArk.infer) => boolean;

  // Actions
  setActiveService: (tab: number) => void;
  addService: () => void;
  removeService: (index: number) => void;
  updateService: (index: number, serviceData: ServiceFormData) => void;
  updateFromJson: (services: MultiServiceFormData['services']) => void;
  resetToDefaults: () => void;
  setIsDirty: (dirty: boolean) => void;
  setServices: (services: ServiceWithId[]) => void;
}

const defaultService: ServiceFormData = {
  name: '',
  image: '',
  isMain: false,
  internalPort: 80,
  environment: [],
  volumes: [],
  addPorts: [],
};

const defaultServices: ServiceWithId[] = [
  {
    _id: generateId(),
    name: 'web',
    image: 'nginx:alpine',
    isMain: true,
    internalPort: 80,
  },
];

function generateId(): string {
  return `service-${window.crypto.randomUUID()}`;
}

export const useMultiServiceStore = create<MultiServiceState>()((set, get) => ({
  services: defaultServices,
  activeService: 0,
  isDirty: false,
  error: '',
  setServices: (services: ServiceWithId[]) => set({ services }),
  validate: (values: typeof dynamicComposeSchemaArk.infer) => {
    const res = dynamicComposeSchemaArk.omit('schemaVersion')(values);

    if (res instanceof type.errors) {
      set({ error: 'Invalid configuration.' });
      return false;
    }

    // Ensure only one main service
    const mainServices = values.services.filter((service) => service.isMain);
    if (mainServices.length !== 1) {
      set({ error: 'There must be exactly one main service.' });
      return false;
    }

    // Ensure unique service names
    const names = values.services.map((service) => service.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      set({ error: 'Service names must be unique.' });
      return false;
    }

    set({ error: '' });
    return true;
  },
  setActiveService: (tab: number | 'json') => {
    const { activeService, isDirty } = get();

    if (activeService === 'json' && isDirty && tab !== 'json') {
      if (!window.confirm('You have made changes to the JSON. Do you want to confirm losing them?')) {
        return;
      }
    }

    set({ activeService: tab, isDirty: false });
  },

  addService: () => {
    const { services, activeService, isDirty } = get();
    if (activeService === 'json' && isDirty) {
      if (!window.confirm('You have made changes to the JSON. Do you want to confirm losing them?')) {
        return;
      }
    }

    const newService: ServiceWithId = {
      ...defaultService,
      _id: generateId(),
      name: `service-${services.length + 1}`,
    };
    const newServices = [...services, newService];

    set({
      isDirty: false,
      services: newServices,
      activeService: services.length,
    });

    get().validate({ schemaVersion: 2, services: newServices });
  },

  removeService: (index: number) => {
    const { activeService, isDirty, services } = get();
    if (activeService === 'json' && isDirty) {
      if (!window.confirm('You have made changes to the JSON. Do you want to confirm losing them?')) {
        return;
      }
    }

    if (services.length === 1) return;

    const newServices = services.filter((_, i) => i !== index);
    let newActiveTab = activeService;

    if (activeService === index || activeService === 'json') {
      newActiveTab = 0;
    } else if (activeService > index) {
      newActiveTab = activeService - 1;
    }

    set({
      isDirty: false,
      services: newServices,
      activeService: newActiveTab,
    });
    get().validate({ schemaVersion: 2, services: newServices });
  },

  updateService: (index: number, serviceData: ServiceFormData) => {
    const { services } = get();
    const existingService = services[index];

    if (existingService) {
      const newServices = [...services];
      newServices[index] = { ...serviceData, _id: existingService._id };
      set({ services: newServices });
      get().validate({ schemaVersion: 2, services: newServices });
    }
  },

  updateFromJson: (newServices: MultiServiceFormData['services']) => {
    const servicesWithIds = newServices.map((service, index) => ({
      ...service,
      _id: get().services[index]?._id || generateId(),
    }));

    get().validate({ schemaVersion: 2, services: servicesWithIds });

    const error = get().error;
    if (error) {
      toast.error(error);
      return;
    }

    set({ services: servicesWithIds, isDirty: false });
    toast.success(t('MULTI_SERVICE_JSON_UPDATE_SUCCESS'));
  },
  resetToDefaults: () =>
    set({
      services: defaultServices.map((service) => ({ ...service, _id: generateId() })),
      activeService: 0,
      error: '',
      isDirty: false,
    }),

  setIsDirty: (dirty: boolean) => set({ isDirty: dirty }),
}));
