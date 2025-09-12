import { create } from 'zustand';
import { dynamicComposeSchema, type serviceSchema } from '@runtipi/common/schemas';
import type { z } from 'zod';

type MultiServiceFormData = z.infer<typeof dynamicComposeSchema>;
type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceWithId extends ServiceFormData {
  _id: string;
}

interface MultiServiceState {
  // State
  services: ServiceWithId[];
  activeTab: string;
  isValid: boolean;
  isDirty: boolean;
  error: string;

  // Actions
  setActiveTab: (tab: string) => void;
  addService: () => void;
  removeService: (index: number) => void;
  updateService: (index: number, serviceData: ServiceFormData) => void;
  updateFromJson: (services: MultiServiceFormData['services']) => void;
  validateServices: () => void;
  resetToDefaults: () => void;
  setIsDirty: (dirty: boolean) => void;
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
  activeTab: '0',
  isValid: true,
  isDirty: false,
  error: '',
  setActiveTab: (tab: string) => {
    const { activeTab, isDirty } = get();

    if (activeTab === 'json' && isDirty && tab !== 'json') {
      if (!window.confirm('You have made changes to the JSON. Do you want to confirm losing them?')) {
        return;
      }
    }

    set({ activeTab: tab, isDirty: false });
  },

  addService: () => {
    const { services, activeTab, isDirty } = get();
    if (activeTab === 'json' && isDirty) {
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
      activeTab: String(services.length),
    });

    get().validateServices();
  },

  removeService: (index: number) => {
    const { activeTab, isDirty, services } = get();
    if (activeTab === 'json' && isDirty) {
      if (!window.confirm('You have made changes to the JSON. Do you want to confirm losing them?')) {
        return;
      }
    }

    if (services.length === 1) return;

    const newServices = services.filter((_, i) => i !== index);
    let newActiveTab = activeTab;

    if (Number(activeTab) === index || activeTab === 'json') {
      newActiveTab = '0';
    } else if (Number(activeTab) > index) {
      newActiveTab = String(Number(activeTab) - 1);
    }

    set({
      isDirty: false,
      services: newServices,
      activeTab: newActiveTab,
    });
    get().validateServices();
  },

  updateService: (index: number, serviceData: ServiceFormData) => {
    const { services } = get();
    const existingService = services[index];

    if (existingService) {
      const newServices = [...services];
      newServices[index] = { ...serviceData, _id: existingService._id };
      set({ services: newServices });
      get().validateServices();
    }
  },

  updateFromJson: (newServices: MultiServiceFormData['services']) => {
    const servicesWithIds = newServices.map((service, index) => ({
      ...service,
      _id: get().services[index]?._id || generateId(),
    }));

    set({ services: servicesWithIds });
    get().validateServices();
  },

  validateServices: () => {
    const { services } = get();

    try {
      const servicesWithoutIds = services.map(({ _id, ...service }) => service);
      dynamicComposeSchema.parse({ services: servicesWithoutIds });

      // Ensure only one main service
      const mainServices = servicesWithoutIds.filter((service) => service.isMain);
      if (mainServices.length !== 1) {
        set({ isValid: false, error: 'There must be exactly one main service.' });
        return;
      }

      // Ensure unique service names
      const names = servicesWithoutIds.map((service) => service.name);
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        set({ isValid: false, error: 'Service names must be unique.' });
        return;
      }

      set({ isValid: true });
    } catch (_) {
      set({ isValid: false });
    }
  },

  resetToDefaults: () =>
    set({
      services: defaultServices.map((service) => ({ ...service, _id: generateId() })),
      activeTab: '0',
      isValid: true,
      isDirty: false,
    }),

  setIsDirty: (dirty: boolean) => set({ isDirty: dirty }),
}));
