import React from 'react';
import { IconExternalLink } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

export const LanguageSelectorLabel = () => {
  const t = useTranslations('settings.settings');

  return (
    <span>
      {t('language')}&nbsp;
      <a href="https://crowdin.com/project/runtipi/invite?h=ae594e86cd807bc075310cab20a4aa921693663" target="_blank" rel="noreferrer">
        {t('help-translate')}
        <IconExternalLink className="ms-1 mb-1" size={16} />
      </a>
    </span>
  );
};
