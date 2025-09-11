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

  // Actions
  setActiveTab: (tab: string) => void;
  addService: () => void;
  removeService: (index: number) => void;
  updateService: (index: number, serviceData: ServiceFormData) => void;
  updateFromJson: (services: MultiServiceFormData['services']) => void;
  validateServices: () => void;
  resetToDefaults: () => void;
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

const defaultServices: ServiceWithId[] = [
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
        hostPath: '${APP_DATA_DIR}/html',
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
      POSTGRES_PASSWORD: '${DB_PASSWORD}',
    },
    volumes: [
      {
        hostPath: '${APP_DATA_DIR}/postgres',
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
];

function generateId(): string {
  return `service-${window.crypto.randomUUID()}`;
}

export const useMultiServiceStore = create<MultiServiceState>()((set, get) => ({
  // Initial state
  services: defaultServices,
  activeTab: '0',
  isValid: true,

  // Actions
  setActiveTab: (tab: string) => set({ activeTab: tab }),

  addService: () => {
    const { services } = get();
    const newService: ServiceWithId = {
      ...defaultService,
      _id: generateId(),
      name: `service-${services.length + 1}`,
    };
    const newServices = [...services, newService];

    set({
      services: newServices,
      activeTab: String(services.length),
    });

    get().validateServices();
  },

  removeService: (index: number) => {
    const { services, activeTab } = get();
    if (services.length === 1) return;

    const newServices = services.filter((_, i) => i !== index);
    let newActiveTab = activeTab;

    if (Number(activeTab) === index) {
      newActiveTab = '0';
    } else if (Number(activeTab) > index) {
      newActiveTab = String(Number(activeTab) - 1);
    }

    set({
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
    }),
}));
