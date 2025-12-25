import { dynamicComposeSchemaYaml, convertLegacyToYaml } from '@runtipi/common/schemas';
import { useEffect, useMemo, useState } from 'react';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import CodeMirror from '@uiw/react-codemirror';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { useTranslation } from 'react-i18next';
import { stringify, parse } from 'yaml';
import { type } from 'arktype';
import { deepClean } from '@/utils/objects';

type Props = {
  onChange: (yaml: string, error?: string) => void;
};

export const YamlComposeEditor = ({ onChange }: Props) => {
  const { t } = useTranslation();
  const { services, isDirty, setIsDirty } = useMultiServiceStore();
  const [error, setError] = useState<string | undefined>(undefined);

  const yamlObject = useMemo(() => {
    try {
      const servicesWithoutIds = services.map(({ _id, ...rest }) => rest);
      return convertLegacyToYaml(deepClean({ services: servicesWithoutIds, schemaVersion: 2 }));
    } catch (e) {
      console.error('Failed to convert services to YAML', e);
      return { services: {} };
    }
  }, [services]);

  const [value, setValue] = useState<string>(stringify(yamlObject));

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        return t('MULTI_SERVICE_UNSAVED_CHANGES_CONFIRM');
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
  useEffect(() => {
    validateInput(value);
  }, []);

  const validateInput = (newValue: string) => {
    if (newValue !== value) {
      setValue(newValue);
      setIsDirty(true);
    }

    let currentError: string | undefined;

    if (!newValue) {
      setError(undefined);
      onChange(newValue, undefined);
      return;
    }

    try {
      const parsedValue = parse(newValue);
      const res = dynamicComposeSchemaYaml(parsedValue);

      if (res instanceof type.errors) {
        currentError = res.summary;
      } else {
        currentError = undefined;
      }
    } catch (err) {
      console.error(err);
      currentError = t('MULTI_SERVICE_YAML_INVALID_FORMAT');
    }

    setError(currentError);
    onChange(newValue, currentError);
  };

  return (
    <div>
      <div className="w-full space-y-2 overflow-hidden">
        <CodeMirror
          placeholder={t('MULTI_SERVICE_YAML_EDIT_PLACEHOLDER')}
          value={value}
          height="400px"
          extensions={[yamlLang()]}
          onChange={(e) => validateInput(e)}
          theme={copilot}
        />
        {error && <pre className="whitespace-pre-wrap m-2 text-danger">{error}</pre>}
      </div>
    </div>
  );
};
