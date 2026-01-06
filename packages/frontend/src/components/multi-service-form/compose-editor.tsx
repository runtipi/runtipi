import { dynamicComposeSchemaYaml, convertLegacyToYaml, convertYamlToLegacy, dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import { useEffect, useState, useCallback } from 'react';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import CodeMirror from '@uiw/react-codemirror';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { json as jsonLang } from '@codemirror/lang-json';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { useTranslation } from 'react-i18next';
import { stringify, parse } from 'yaml';
import { type } from 'arktype';
import { deepClean } from '@/utils/objects';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/tabs';
import betterAjvErrors from 'better-ajv-errors';
import Ajv from 'ajv/dist/2020';

type Props = {
  onChange: (value: string, format: 'yaml' | 'json', error?: string) => void;
  initialFormat?: 'yaml' | 'json';
};

const jsonSchema = dynamicComposeSchemaArk.omit('schemaVersion').toJsonSchema({ fallback: { default: (ctx) => ctx.base } });
const ajv = new Ajv({ allErrors: true });
ajv.addKeyword('message');
const validateJson = ajv.compile(jsonSchema);

export const ComposeEditor = ({ onChange, initialFormat = 'yaml' }: Props) => {
  const { t } = useTranslation();
  const { services, setIsDirty, isDirty: isDirtyStore } = useMultiServiceStore();
  const [error, setError] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<'yaml' | 'json'>(initialFormat);

  const getCanonicalStoreObject = useCallback(() => {
    const servicesWithoutIds = services.map(({ _id, ...rest }) => rest);
    return deepClean({ services: servicesWithoutIds, schemaVersion: 2 });
  }, [services]);

  const [yamlValue, setYamlValue] = useState<string>(() => {
    try {
      const legacy = getCanonicalStoreObject();
      return stringify(convertLegacyToYaml(legacy));
    } catch (e) {
      console.error('Failed to init yaml', e);
      return '';
    }
  });

  const [jsonValue, setJsonValue] = useState<string>(() => {
    try {
      const legacy = getCanonicalStoreObject();
      const { schemaVersion: _, ...rest } = legacy;
      return JSON.stringify(rest, null, 2);
    } catch (e) {
      console.error('Failed to init json', e);
      return '';
    }
  });

  const checkDirty = useCallback(
    (currentVal: string, currentFormat: 'yaml' | 'json') => {
      try {
        const storeObj = getCanonicalStoreObject();
        if (!currentVal.trim()) {
          setIsDirty(storeObj.services.length > 0);
          return;
        }

        let editorObj: unknown;

        if (currentFormat === 'yaml') {
          const parsed = parse(currentVal);
          editorObj = convertYamlToLegacy(parsed);
        } else {
          const parsed = JSON.parse(currentVal);
          editorObj = { ...parsed, schemaVersion: 2 };
        }

        const isDirty = JSON.stringify(deepClean(editorObj)) !== JSON.stringify(deepClean(storeObj));

        setIsDirty(isDirty);
      } catch (_e) {
        setIsDirty(true);
      }
    },
    [getCanonicalStoreObject, setIsDirty],
  );

  const validateInput = useCallback(
    (newValue: string, currentFormat: 'yaml' | 'json') => {
      let currentError: string | undefined;

      if (newValue) {
        try {
          if (currentFormat === 'yaml') {
            const parsedValue = parse(newValue);
            const res = dynamicComposeSchemaYaml(parsedValue);

            if (res instanceof type.errors) {
              currentError = res.summary;
            } else {
              currentError = undefined;
            }
          } else {
            const parsedValue = JSON.parse(newValue);
            const valid = validateJson(parsedValue);

            if (valid) {
              currentError = undefined;
            } else {
              const formattedErrors = betterAjvErrors(jsonSchema, parsedValue, validateJson.errors, { format: 'cli', indent: 2 });
              currentError = formattedErrors;
            }
          }
        } catch (err) {
          console.error(err);
          currentError = currentFormat === 'yaml' ? t('MULTI_SERVICE_YAML_INVALID_FORMAT') : t('MULTI_SERVICE_JSON_INVALID_FORMAT');
        }
      } else {
        currentError = undefined;
      }

      if (currentError) {
        setIsDirty(true);
      } else {
        checkDirty(newValue, currentFormat);
      }

      setError(currentError);
      onChange(newValue, currentFormat, currentError);
    },
    [checkDirty, onChange, setIsDirty, t],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: only want to run on mount
  useEffect(() => {
    if (format === 'yaml') {
      validateInput(yamlValue, 'yaml');
    } else {
      validateInput(jsonValue, 'json');
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyStore) {
        e.preventDefault();
        return t('MULTI_SERVICE_UNSAVED_CHANGES_CONFIRM');
      }
    };

    if (isDirtyStore) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirtyStore, t]);

  const handleFormatChange = (newFormat: string) => {
    if (newFormat === format) return;

    if (error) return;

    try {
      if (newFormat === 'json') {
        const parsedYaml = parse(yamlValue);
        const legacy = convertYamlToLegacy(parsedYaml);
        const { schemaVersion: _, ...rest } = legacy;
        const newJson = JSON.stringify(rest, null, 2);

        setJsonValue(newJson);
        setFormat('json');
        validateInput(newJson, 'json');
      } else {
        const parsedJson = JSON.parse(jsonValue);
        const legacyInput = { ...parsedJson, schemaVersion: 2 };
        const yamlObj = convertLegacyToYaml(legacyInput);
        const newYaml = stringify(yamlObj);

        setYamlValue(newYaml);
        setFormat('yaml');
        validateInput(newYaml, 'yaml');
      }
    } catch (e) {
      console.error('Failed to convert format', e);
    }
  };

  const handleYamlChange = (val: string) => {
    setYamlValue(val);
    validateInput(val, 'yaml');
  };

  const handleJsonChange = (val: string) => {
    setJsonValue(val);
    validateInput(val, 'json');
  };

  return (
    <div className="flex flex-col gap-2">
      <Tabs value={format} onValueChange={handleFormatChange} className="w-full">
        <TabsList>
          <TabsTrigger value="yaml" disabled={Boolean(error) && format !== 'yaml'}>
            YAML
          </TabsTrigger>
          <TabsTrigger value="json" disabled={Boolean(error) && format !== 'json'}>
            JSON
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="w-full space-y-2 overflow-hidden">
        <div style={{ display: format === 'yaml' ? 'block' : 'none' }}>
          <CodeMirror
            placeholder={t('MULTI_SERVICE_YAML_EDIT_PLACEHOLDER')}
            value={yamlValue}
            height="400px"
            extensions={[yamlLang()]}
            onChange={handleYamlChange}
            theme={copilot}
          />
        </div>

        <div style={{ display: format === 'json' ? 'block' : 'none' }}>
          <CodeMirror
            placeholder={t('MULTI_SERVICE_JSON_EDIT_PLACEHOLDER')}
            value={jsonValue}
            height="400px"
            extensions={[jsonLang()]}
            onChange={handleJsonChange}
            theme={copilot}
          />
        </div>

        {error && <pre className="whitespace-pre-wrap m-2 text-danger">{error}</pre>}
      </div>
    </div>
  );
};
