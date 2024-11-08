'use client';

import { acknowledgeWelcomeAction } from '@/actions/acknowledge-welcome/acknowledge-welcome';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { getLogo } from '@/lib/themes';
import { IconBrandDiscord, IconBrandGithub } from '@tabler/icons-react';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  allowErrorMonitoring: boolean;
};

export const Welcome = ({ allowErrorMonitoring }: Props) => {
  const [errorMonitoring, setErrorMonitoring] = useState(allowErrorMonitoring);
  const router = useRouter();

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener noreferrer');
  };

  const acknowledgeMutation = useAction(acknowledgeWelcomeAction, {
    onSuccess: () => {
      router.refresh();
    },
  });

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <Image alt="Tipi logo" src={getLogo(true)} height={50} width={50} style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">Thanks for using Runtipi</h2>
            <p className="text-center mb-4">
              Tipi is a free and open source project that is developed and maintained by a small team. If it helps you in any way, please consider
              supporting the project by{' '}
              <a target="_blank" href="https://github.com/runtipi/runtipi?sponsor=1" rel="noreferrer">
                donating
              </a>{' '}
              or by{' '}
              <a target="_blank" rel="noreferrer" href="https://github.com/runtipi/runtipi">
                contributing to the codebase
              </a>
              .
              <br />
              <br />
              If you can&apos;t do either of those, please consider enabling the opt-in anonymous error reporting feature. This will help us identify
              and fix bugs faster.
            </p>
            <div className="d-flex flex-column align-items-center">
              <Switch checked={errorMonitoring} onCheckedChange={setErrorMonitoring} label="Enable error reporting" />
              <Button
                intent="primary"
                className="mt-3"
                onClick={() => acknowledgeMutation.execute({ allowErrorMonitoring: errorMonitoring })}
                loading={acknowledgeMutation.status === 'hasSucceeded' || acknowledgeMutation.status === 'executing'}
                disabled={acknowledgeMutation.status === 'hasSucceeded' || acknowledgeMutation.status === 'executing'}
              >
                Save and enter
              </Button>
            </div>
            <div className="hr-text">Join the community</div>
            <div className="row justify-content-center gap-2">
              <Button onClick={() => openLink('https://github.com/runtipi/runtipi/discussions')}>
                <IconBrandGithub /> Github
              </Button>
              <Button onClick={() => openLink('https://discord.gg/WGW7YP7E5j')}>
                <IconBrandDiscord />
                Discord
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
