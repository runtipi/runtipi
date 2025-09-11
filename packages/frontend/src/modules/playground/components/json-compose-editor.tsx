import { dynamicComposeSchema, toJsonSchema } from '@runtipi/common/schemas';
import betterAjvErrors from 'better-ajv-errors';
import Ajv from 'ajv/dist/2020';
import { useState } from 'react';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { Button } from '@/components/ui/Button';

const schema = toJsonSchema(dynamicComposeSchema);

export const JsonComposeEditor = () => {
  const { services, updateFromJson } = useMultiServiceStore();
  const [error, setError] = useState<string | undefined>(undefined);
  const [isDirty, setIsDirty] = useState(false);

  const servicesWithoutIds = services.map(({ _id, ...rest }) => rest);

  const [value, setValue] = useState<string>(JSON.stringify({ services: servicesWithoutIds }, null, 2));

  const validateInput = (value: string) => {
    setValue(value);
    setIsDirty(true);

    if (!value) {
      setError(undefined);
      return;
    }

    try {
      const parsedValue = JSON.parse(value);
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(schema);
      const valid = validate(parsedValue);

      if (valid) {
        setError(undefined);
      } else {
        const formattedErrors = betterAjvErrors(schema, parsedValue, validate.errors, { format: 'cli', indent: 2 });
        setError(formattedErrors);
      }
    } catch (_) {
      setError('Invalid JSON format');
    }
  };

  return (
    <div>
      <div className="w-full space-y-2">
        <CodeMirror
          placeholder="Edit JSON here..."
          value={value}
          height="400px"
          extensions={[json()]}
          onChange={(e) => validateInput(e)}
          theme={copilot}
        />
        {error && <pre className="whitespace-pre-wrap mt-2">{error}</pre>}
        <Button type="button" disabled={!!error || !value} onClick={() => updateFromJson(JSON.parse(value || '{}').services)}>
          Save JSON
        </Button>
      </div>
    </div>
  );
};
