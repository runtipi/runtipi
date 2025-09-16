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
import { MultiServiceForm } from '../components/multi-service-form';

const tabs = [
  { id: 'essentials', label: 'Essentials', icon: IconSettings },
  { id: 'environment', label: 'Environment', icon: IconVariable },
  { id: 'volumes', label: 'Volumes', icon: IconServer },
  { id: 'ports', label: 'Ports', icon: IconArrowsDownUp },
  { id: 'advanced', label: 'Advanced', icon: IconCloudDataConnection },
];

export default function PlaygroundPage() {
  return <MultiServiceForm />;
}
