import { dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import betterAjvErrors from 'better-ajv-errors';
import Ajv from 'ajv/dist/2020';
import { useEffect, useState } from 'react';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { useTranslation } from 'react-i18next';

const schema = dynamicComposeSchemaArk.omit('schemaVersion').toJsonSchema({ fallback: { default: (ctx) => ctx.base } });

type Props = {
  onChange: (json: string, error?: string) => void;
};

export const JsonComposeEditor = ({ onChange }: Props) => {
  const { t } = useTranslation();
  const { services, isDirty, setIsDirty } = useMultiServiceStore();
  const [error, setError] = useState<string | undefined>(undefined);

  const servicesWithoutIds = services.map(({ _id, ...rest }) => rest);

  const [value, setValue] = useState<string>(JSON.stringify({ services: servicesWithoutIds }, null, 2));

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        return 'You have made changes to the JSON. Do you want to confirm losing it?';
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
  useEffect(() => {
    validateInput(value);
  }, []);

  const validateInput = (newValue: string) => {
    if (newValue !== value) {
      setValue(newValue);
      setIsDirty(true);
    }

    if (!newValue) {
      setError(undefined);
      return;
    }

    try {
      const parsedValue = JSON.parse(newValue);
      const ajv = new Ajv({ allErrors: true });
      ajv.addKeyword('message');

      const validate = ajv.compile(schema);
      const valid = validate(parsedValue);

      if (valid) {
        setError(undefined);
      } else {
        const formattedErrors = betterAjvErrors(schema, parsedValue, validate.errors, { format: 'cli', indent: 2 });
        setError(formattedErrors);
      }
    } catch (err) {
      console.error(err);
      setError(t('MULTI_SERVICE_JSON_INVALID_FORMAT'));
    }

    onChange(newValue, error);
  };

  return (
    <div>
      <div className="w-full space-y-2">
        <CodeMirror
          placeholder={t('MULTI_SERVICE_JSON_EDIT_PLACEHOLDER')}
          value={value}
          height="400px"
          extensions={[json()]}
          onChange={(e) => validateInput(e)}
          theme={copilot}
        />
        {error && <pre className="whitespace-pre-wrap mt-2">{error}</pre>}
      </div>
    </div>
  );
};
