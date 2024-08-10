import { IconExternalLink } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import React from 'react';

export const LanguageSelectorLabel = () => {
  const t = useTranslations();

  return (
    <span>
      {t('SETTINGS_GENERAL_LANGUAGE')}&nbsp;
      <a href="https://crowdin.com/project/runtipi/invite?h=ae594e86cd807bc075310cab20a4aa921693663" target="_blank" rel="noreferrer">
        {t('SETTINGS_GENERAL_LANGUAGE_HELP_TRANSLATE')}
        <IconExternalLink className="ms-1 mb-1" size={16} />
      </a>
    </span>
  );
};
