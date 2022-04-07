import validator from "validator";

interface IFormField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  placeholder?: string;
  validate?: (value: string) => boolean;
}

interface IAppConfig {
  id: string;
  name: string;
  description: string;
  logo: string;
  url: string;
  color: string;
  install_form: { fields: IFormField[] };
}

const APP_ANONADDY: IAppConfig = {
  id: "anonaddy",
  name: "Anonaddy",
  description: "Create Unlimited Email Aliases For Free",
  url: "https://anonaddy.com/",
  color: "#00a8ff",
  logo: "https://anonaddy.com/favicon.ico",
  install_form: {
    fields: [
      {
        name: "API Key",
        type: "text",
        placeholder: "API Key",
        required: true,
        validate: (value: string) => validator.isBase64(value),
      },
      {
        name: "Return Path",
        type: "text",
        description: "The email address that bounces will be sent to",
        placeholder: "Return Path",
        required: false,
        validate: (value: string) => validator.isEmail(value),
      },
      {
        name: "Admin Username",
        type: "text",
        description: "The username of the admin user",
        placeholder: "Admin Username",
        required: true,
      },
      {
        name: "Enable Registration",
        type: "boolean",
        description: "Allow users to register",
        placeholder: "Enable Registration",
        required: false,
      },
      {
        name: "Domain",
        type: "text",
        description: "The domain that will be used for the email address",
        placeholder: "Domain",
        required: true,
        validate: (value: string) => validator.isFQDN(value),
      },
      {
        name: "Hostname",
        type: "text",
        description: "The hostname that will be used for the email address",
        placeholder: "Hostname",
        required: true,
        validate: (value: string) => validator.isFQDN(value),
      },
      {
        name: "Secret",
        type: "text",
        description: "The secret that will be used for the email address",
        placeholder: "Secret",
        required: true,
      },
      {
        name: "From Name",
        type: "text",
        description: "The name that will be used for the email address",
        placeholder: "From Name",
        required: true,
        validate: (value: string) =>
          validator.isLength(value, { min: 1, max: 64 }),
      },
      {
        name: "From Address",
        type: "text",
        description:
          "The email address that will be used for the email address",
        placeholder: "From Address",
        required: true,
        validate: (value: string) => validator.isEmail(value),
      },
    ],
  },
};

const APPS_CONFIG = {
  available: [APP_ANONADDY],
};

export default APPS_CONFIG;
