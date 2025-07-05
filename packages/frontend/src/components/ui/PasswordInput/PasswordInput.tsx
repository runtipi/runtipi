import { useState, type ComponentProps } from 'react';
import { InputGroup } from '../Input';
import { Tooltip } from 'react-tooltip';
import { Button } from '../Button';
import { IconEye, IconEyeClosed } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

type Props = ComponentProps<typeof InputGroup> & {};

export const PasswordInput = (props: Props) => {
  const { ref, key, ...rest } = props;
  const [passwordVisible, setPasswordVisible] = useState(false);

  const { t } = useTranslation();

  return (
    <InputGroup
      key={key}
      ref={ref}
      type={passwordVisible ? 'text' : 'password'}
      groupClassName="input-group-flat"
      {...rest}
      groupSuffix={
        <span className="input-group-text">
          <Tooltip className="tooltip" anchorSelect=".toggle-password-visibility">
            {passwordVisible ? t('APP_INSTALL_FORM_HIDE_PASSWORD') : t('APP_INSTALL_FORM_SHOW_PASSWORD')}
          </Tooltip>
          <Button
            size="sm"
            variant="ghost"
            color="gray"
            onClick={() => setPasswordVisible(!passwordVisible)}
            type="button"
            className="toggle-password-visibility"
          >
            {passwordVisible ? (
              <IconEyeClosed aria-label={t('APP_INSTALL_FORM_HIDE_PASSWORD')} size={16} />
            ) : (
              <IconEye aria-label={t('APP_INSTALL_FORM_SHOW_PASSWORD')} size={16} />
            )}
          </Button>
        </span>
      }
    />
  );
};
