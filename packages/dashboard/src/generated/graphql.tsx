import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** The javascript `Date` as string. Type represents date and time as the ISO Date string. */
  DateTime: any;
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: any;
};

export type App = {
  __typename?: 'App';
  config: Scalars['JSONObject'];
  createdAt: Scalars['DateTime'];
  domain?: Maybe<Scalars['String']>;
  exposed: Scalars['Boolean'];
  id: Scalars['String'];
  info?: Maybe<AppInfo>;
  lastOpened: Scalars['DateTime'];
  numOpened: Scalars['Float'];
  status: AppStatusEnum;
  updateInfo?: Maybe<UpdateInfo>;
  updatedAt: Scalars['DateTime'];
  version?: Maybe<Scalars['Float']>;
};

export enum AppCategoriesEnum {
  Automation = 'AUTOMATION',
  Books = 'BOOKS',
  Data = 'DATA',
  Development = 'DEVELOPMENT',
  Featured = 'FEATURED',
  Finance = 'FINANCE',
  Gaming = 'GAMING',
  Media = 'MEDIA',
  Music = 'MUSIC',
  Network = 'NETWORK',
  Photography = 'PHOTOGRAPHY',
  Security = 'SECURITY',
  Social = 'SOCIAL',
  Utilities = 'UTILITIES',
}

export type AppInfo = {
  __typename?: 'AppInfo';
  author: Scalars['String'];
  available: Scalars['Boolean'];
  categories: Array<AppCategoriesEnum>;
  description: Scalars['String'];
  exposable?: Maybe<Scalars['Boolean']>;
  form_fields: Array<FormField>;
  https?: Maybe<Scalars['Boolean']>;
  id: Scalars['String'];
  name: Scalars['String'];
  no_gui?: Maybe<Scalars['Boolean']>;
  port: Scalars['Float'];
  requirements?: Maybe<Scalars['JSONObject']>;
  short_desc: Scalars['String'];
  source: Scalars['String'];
  supported_architectures?: Maybe<Array<AppSupportedArchitecturesEnum>>;
  tipi_version: Scalars['Float'];
  url_suffix?: Maybe<Scalars['String']>;
  version?: Maybe<Scalars['String']>;
};

export type AppInputType = {
  domain: Scalars['String'];
  exposed: Scalars['Boolean'];
  form: Scalars['JSONObject'];
  id: Scalars['String'];
};

export enum AppStatusEnum {
  Installing = 'INSTALLING',
  Missing = 'MISSING',
  Running = 'RUNNING',
  Starting = 'STARTING',
  Stopped = 'STOPPED',
  Stopping = 'STOPPING',
  Uninstalling = 'UNINSTALLING',
  Updating = 'UPDATING',
}

export enum AppSupportedArchitecturesEnum {
  Amd64 = 'AMD64',
  Arm = 'ARM',
  Arm64 = 'ARM64',
}

export type Cpu = {
  __typename?: 'Cpu';
  load: Scalars['Float'];
};

export type DiskMemory = {
  __typename?: 'DiskMemory';
  available: Scalars['Float'];
  total: Scalars['Float'];
  used: Scalars['Float'];
};

export enum FieldTypesEnum {
  Email = 'email',
  Fqdn = 'fqdn',
  Fqdnip = 'fqdnip',
  Ip = 'ip',
  Number = 'number',
  Password = 'password',
  Random = 'random',
  Text = 'text',
  Url = 'url',
}

export type FormField = {
  __typename?: 'FormField';
  env_variable: Scalars['String'];
  hint?: Maybe<Scalars['String']>;
  label: Scalars['String'];
  max?: Maybe<Scalars['Float']>;
  min?: Maybe<Scalars['Float']>;
  placeholder?: Maybe<Scalars['String']>;
  required?: Maybe<Scalars['Boolean']>;
  type: FieldTypesEnum;
};

export type ListAppsResonse = {
  __typename?: 'ListAppsResonse';
  apps: Array<AppInfo>;
  total: Scalars['Float'];
};

export type Mutation = {
  __typename?: 'Mutation';
  installApp: App;
  login: TokenResponse;
  logout: Scalars['Boolean'];
  register: TokenResponse;
  restart: Scalars['Boolean'];
  startApp: App;
  stopApp: App;
  uninstallApp: App;
  update: Scalars['Boolean'];
  updateApp: App;
  updateAppConfig: App;
};

export type MutationInstallAppArgs = {
  input: AppInputType;
};

export type MutationLoginArgs = {
  input: UsernamePasswordInput;
};

export type MutationRegisterArgs = {
  input: UsernamePasswordInput;
};

export type MutationStartAppArgs = {
  id: Scalars['String'];
};

export type MutationStopAppArgs = {
  id: Scalars['String'];
};

export type MutationUninstallAppArgs = {
  id: Scalars['String'];
};

export type MutationUpdateAppArgs = {
  id: Scalars['String'];
};

export type MutationUpdateAppConfigArgs = {
  input: AppInputType;
};

export type Query = {
  __typename?: 'Query';
  getApp: App;
  installedApps: Array<App>;
  isConfigured: Scalars['Boolean'];
  listAppsInfo: ListAppsResonse;
  me?: Maybe<User>;
  refreshToken?: Maybe<TokenResponse>;
  systemInfo?: Maybe<SystemInfoResponse>;
  version: VersionResponse;
};

export type QueryGetAppArgs = {
  id: Scalars['String'];
};

export type SystemInfoResponse = {
  __typename?: 'SystemInfoResponse';
  cpu: Cpu;
  disk: DiskMemory;
  memory: DiskMemory;
};

export type TokenResponse = {
  __typename?: 'TokenResponse';
  token: Scalars['String'];
};

export type UpdateInfo = {
  __typename?: 'UpdateInfo';
  current: Scalars['Float'];
  dockerVersion?: Maybe<Scalars['String']>;
  latest: Scalars['Float'];
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  updatedAt: Scalars['DateTime'];
  username: Scalars['String'];
};

export type UsernamePasswordInput = {
  password: Scalars['String'];
  username: Scalars['String'];
};

export type VersionResponse = {
  __typename?: 'VersionResponse';
  current: Scalars['String'];
  latest?: Maybe<Scalars['String']>;
};

export type InstallAppMutationVariables = Exact<{
  input: AppInputType;
}>;

export type InstallAppMutation = { __typename?: 'Mutation'; installApp: { __typename: 'App'; id: string; status: AppStatusEnum } };

export type LoginMutationVariables = Exact<{
  input: UsernamePasswordInput;
}>;

export type LoginMutation = { __typename?: 'Mutation'; login: { __typename?: 'TokenResponse'; token: string } };

export type LogoutMutationVariables = Exact<{ [key: string]: never }>;

export type LogoutMutation = { __typename?: 'Mutation'; logout: boolean };

export type RegisterMutationVariables = Exact<{
  input: UsernamePasswordInput;
}>;

export type RegisterMutation = { __typename?: 'Mutation'; register: { __typename?: 'TokenResponse'; token: string } };

export type RestartMutationVariables = Exact<{ [key: string]: never }>;

export type RestartMutation = { __typename?: 'Mutation'; restart: boolean };

export type StartAppMutationVariables = Exact<{
  id: Scalars['String'];
}>;

export type StartAppMutation = { __typename?: 'Mutation'; startApp: { __typename: 'App'; id: string; status: AppStatusEnum } };

export type StopAppMutationVariables = Exact<{
  id: Scalars['String'];
}>;

export type StopAppMutation = { __typename?: 'Mutation'; stopApp: { __typename: 'App'; id: string; status: AppStatusEnum } };

export type UninstallAppMutationVariables = Exact<{
  id: Scalars['String'];
}>;

export type UninstallAppMutation = { __typename?: 'Mutation'; uninstallApp: { __typename: 'App'; id: string; status: AppStatusEnum } };

export type UpdateMutationVariables = Exact<{ [key: string]: never }>;

export type UpdateMutation = { __typename?: 'Mutation'; update: boolean };

export type UpdateAppMutationVariables = Exact<{
  id: Scalars['String'];
}>;

export type UpdateAppMutation = { __typename?: 'Mutation'; updateApp: { __typename: 'App'; id: string; status: AppStatusEnum } };

export type UpdateAppConfigMutationVariables = Exact<{
  input: AppInputType;
}>;

export type UpdateAppConfigMutation = { __typename?: 'Mutation'; updateAppConfig: { __typename: 'App'; id: string; status: AppStatusEnum } };

export type GetAppQueryVariables = Exact<{
  appId: Scalars['String'];
}>;

export type GetAppQuery = {
  __typename?: 'Query';
  getApp: {
    __typename?: 'App';
    id: string;
    status: AppStatusEnum;
    config: any;
    version?: number | null;
    exposed: boolean;
    domain?: string | null;
    updateInfo?: { __typename?: 'UpdateInfo'; current: number; latest: number; dockerVersion?: string | null } | null;
    info?: {
      __typename?: 'AppInfo';
      id: string;
      port: number;
      name: string;
      description: string;
      available: boolean;
      version?: string | null;
      tipi_version: number;
      short_desc: string;
      author: string;
      source: string;
      categories: Array<AppCategoriesEnum>;
      url_suffix?: string | null;
      https?: boolean | null;
      exposable?: boolean | null;
      no_gui?: boolean | null;
      form_fields: Array<{
        __typename?: 'FormField';
        type: FieldTypesEnum;
        label: string;
        max?: number | null;
        min?: number | null;
        hint?: string | null;
        placeholder?: string | null;
        required?: boolean | null;
        env_variable: string;
      }>;
    } | null;
  };
};

export type InstalledAppsQueryVariables = Exact<{ [key: string]: never }>;

export type InstalledAppsQuery = {
  __typename?: 'Query';
  installedApps: Array<{
    __typename?: 'App';
    id: string;
    status: AppStatusEnum;
    config: any;
    version?: number | null;
    updateInfo?: { __typename?: 'UpdateInfo'; current: number; latest: number; dockerVersion?: string | null } | null;
    info?: { __typename?: 'AppInfo'; id: string; name: string; description: string; tipi_version: number; short_desc: string; https?: boolean | null } | null;
  }>;
};

export type ConfiguredQueryVariables = Exact<{ [key: string]: never }>;

export type ConfiguredQuery = { __typename?: 'Query'; isConfigured: boolean };

export type ListAppsQueryVariables = Exact<{ [key: string]: never }>;

export type ListAppsQuery = {
  __typename?: 'Query';
  listAppsInfo: {
    __typename?: 'ListAppsResonse';
    total: number;
    apps: Array<{
      __typename?: 'AppInfo';
      id: string;
      available: boolean;
      tipi_version: number;
      port: number;
      name: string;
      version?: string | null;
      short_desc: string;
      author: string;
      categories: Array<AppCategoriesEnum>;
      https?: boolean | null;
    }>;
  };
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = { __typename?: 'Query'; me?: { __typename?: 'User'; id: string } | null };

export type RefreshTokenQueryVariables = Exact<{ [key: string]: never }>;

export type RefreshTokenQuery = { __typename?: 'Query'; refreshToken?: { __typename?: 'TokenResponse'; token: string } | null };

export type SystemInfoQueryVariables = Exact<{ [key: string]: never }>;

export type SystemInfoQuery = {
  __typename?: 'Query';
  systemInfo?: {
    __typename?: 'SystemInfoResponse';
    cpu: { __typename?: 'Cpu'; load: number };
    disk: { __typename?: 'DiskMemory'; available: number; used: number; total: number };
    memory: { __typename?: 'DiskMemory'; available: number; used: number; total: number };
  } | null;
};

export type VersionQueryVariables = Exact<{ [key: string]: never }>;

export type VersionQuery = { __typename?: 'Query'; version: { __typename?: 'VersionResponse'; current: string; latest?: string | null } };

export const InstallAppDocument = gql`
  mutation InstallApp($input: AppInputType!) {
    installApp(input: $input) {
      id
      status
      __typename
    }
  }
`;
export type InstallAppMutationFn = Apollo.MutationFunction<InstallAppMutation, InstallAppMutationVariables>;

/**
 * __useInstallAppMutation__
 *
 * To run a mutation, you first call `useInstallAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInstallAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [installAppMutation, { data, loading, error }] = useInstallAppMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useInstallAppMutation(baseOptions?: Apollo.MutationHookOptions<InstallAppMutation, InstallAppMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<InstallAppMutation, InstallAppMutationVariables>(InstallAppDocument, options);
}
export type InstallAppMutationHookResult = ReturnType<typeof useInstallAppMutation>;
export type InstallAppMutationResult = Apollo.MutationResult<InstallAppMutation>;
export type InstallAppMutationOptions = Apollo.BaseMutationOptions<InstallAppMutation, InstallAppMutationVariables>;
export const LoginDocument = gql`
  mutation Login($input: UsernamePasswordInput!) {
    login(input: $input) {
      token
    }
  }
`;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
}
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const LogoutDocument = gql`
  mutation Logout {
    logout
  }
`;
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutation, LogoutMutationVariables>;

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutMutation(baseOptions?: Apollo.MutationHookOptions<LogoutMutation, LogoutMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options);
}
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>;
export const RegisterDocument = gql`
  mutation Register($input: UsernamePasswordInput!) {
    register(input: $input) {
      token
    }
  }
`;
export type RegisterMutationFn = Apollo.MutationFunction<RegisterMutation, RegisterMutationVariables>;

/**
 * __useRegisterMutation__
 *
 * To run a mutation, you first call `useRegisterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerMutation, { data, loading, error }] = useRegisterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterMutation(baseOptions?: Apollo.MutationHookOptions<RegisterMutation, RegisterMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<RegisterMutation, RegisterMutationVariables>(RegisterDocument, options);
}
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutation>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutation, RegisterMutationVariables>;
export const RestartDocument = gql`
  mutation Restart {
    restart
  }
`;
export type RestartMutationFn = Apollo.MutationFunction<RestartMutation, RestartMutationVariables>;

/**
 * __useRestartMutation__
 *
 * To run a mutation, you first call `useRestartMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestartMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restartMutation, { data, loading, error }] = useRestartMutation({
 *   variables: {
 *   },
 * });
 */
export function useRestartMutation(baseOptions?: Apollo.MutationHookOptions<RestartMutation, RestartMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<RestartMutation, RestartMutationVariables>(RestartDocument, options);
}
export type RestartMutationHookResult = ReturnType<typeof useRestartMutation>;
export type RestartMutationResult = Apollo.MutationResult<RestartMutation>;
export type RestartMutationOptions = Apollo.BaseMutationOptions<RestartMutation, RestartMutationVariables>;
export const StartAppDocument = gql`
  mutation StartApp($id: String!) {
    startApp(id: $id) {
      id
      status
      __typename
    }
  }
`;
export type StartAppMutationFn = Apollo.MutationFunction<StartAppMutation, StartAppMutationVariables>;

/**
 * __useStartAppMutation__
 *
 * To run a mutation, you first call `useStartAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startAppMutation, { data, loading, error }] = useStartAppMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useStartAppMutation(baseOptions?: Apollo.MutationHookOptions<StartAppMutation, StartAppMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<StartAppMutation, StartAppMutationVariables>(StartAppDocument, options);
}
export type StartAppMutationHookResult = ReturnType<typeof useStartAppMutation>;
export type StartAppMutationResult = Apollo.MutationResult<StartAppMutation>;
export type StartAppMutationOptions = Apollo.BaseMutationOptions<StartAppMutation, StartAppMutationVariables>;
export const StopAppDocument = gql`
  mutation StopApp($id: String!) {
    stopApp(id: $id) {
      id
      status
      __typename
    }
  }
`;
export type StopAppMutationFn = Apollo.MutationFunction<StopAppMutation, StopAppMutationVariables>;

/**
 * __useStopAppMutation__
 *
 * To run a mutation, you first call `useStopAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStopAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [stopAppMutation, { data, loading, error }] = useStopAppMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useStopAppMutation(baseOptions?: Apollo.MutationHookOptions<StopAppMutation, StopAppMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<StopAppMutation, StopAppMutationVariables>(StopAppDocument, options);
}
export type StopAppMutationHookResult = ReturnType<typeof useStopAppMutation>;
export type StopAppMutationResult = Apollo.MutationResult<StopAppMutation>;
export type StopAppMutationOptions = Apollo.BaseMutationOptions<StopAppMutation, StopAppMutationVariables>;
export const UninstallAppDocument = gql`
  mutation UninstallApp($id: String!) {
    uninstallApp(id: $id) {
      id
      status
      __typename
    }
  }
`;
export type UninstallAppMutationFn = Apollo.MutationFunction<UninstallAppMutation, UninstallAppMutationVariables>;

/**
 * __useUninstallAppMutation__
 *
 * To run a mutation, you first call `useUninstallAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUninstallAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [uninstallAppMutation, { data, loading, error }] = useUninstallAppMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUninstallAppMutation(baseOptions?: Apollo.MutationHookOptions<UninstallAppMutation, UninstallAppMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<UninstallAppMutation, UninstallAppMutationVariables>(UninstallAppDocument, options);
}
export type UninstallAppMutationHookResult = ReturnType<typeof useUninstallAppMutation>;
export type UninstallAppMutationResult = Apollo.MutationResult<UninstallAppMutation>;
export type UninstallAppMutationOptions = Apollo.BaseMutationOptions<UninstallAppMutation, UninstallAppMutationVariables>;
export const UpdateDocument = gql`
  mutation Update {
    update
  }
`;
export type UpdateMutationFn = Apollo.MutationFunction<UpdateMutation, UpdateMutationVariables>;

/**
 * __useUpdateMutation__
 *
 * To run a mutation, you first call `useUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMutation, { data, loading, error }] = useUpdateMutation({
 *   variables: {
 *   },
 * });
 */
export function useUpdateMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMutation, UpdateMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<UpdateMutation, UpdateMutationVariables>(UpdateDocument, options);
}
export type UpdateMutationHookResult = ReturnType<typeof useUpdateMutation>;
export type UpdateMutationResult = Apollo.MutationResult<UpdateMutation>;
export type UpdateMutationOptions = Apollo.BaseMutationOptions<UpdateMutation, UpdateMutationVariables>;
export const UpdateAppDocument = gql`
  mutation UpdateApp($id: String!) {
    updateApp(id: $id) {
      id
      status
      __typename
    }
  }
`;
export type UpdateAppMutationFn = Apollo.MutationFunction<UpdateAppMutation, UpdateAppMutationVariables>;

/**
 * __useUpdateAppMutation__
 *
 * To run a mutation, you first call `useUpdateAppMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAppMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateAppMutation, { data, loading, error }] = useUpdateAppMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUpdateAppMutation(baseOptions?: Apollo.MutationHookOptions<UpdateAppMutation, UpdateAppMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<UpdateAppMutation, UpdateAppMutationVariables>(UpdateAppDocument, options);
}
export type UpdateAppMutationHookResult = ReturnType<typeof useUpdateAppMutation>;
export type UpdateAppMutationResult = Apollo.MutationResult<UpdateAppMutation>;
export type UpdateAppMutationOptions = Apollo.BaseMutationOptions<UpdateAppMutation, UpdateAppMutationVariables>;
export const UpdateAppConfigDocument = gql`
  mutation UpdateAppConfig($input: AppInputType!) {
    updateAppConfig(input: $input) {
      id
      status
      __typename
    }
  }
`;
export type UpdateAppConfigMutationFn = Apollo.MutationFunction<UpdateAppConfigMutation, UpdateAppConfigMutationVariables>;

/**
 * __useUpdateAppConfigMutation__
 *
 * To run a mutation, you first call `useUpdateAppConfigMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAppConfigMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateAppConfigMutation, { data, loading, error }] = useUpdateAppConfigMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAppConfigMutation(baseOptions?: Apollo.MutationHookOptions<UpdateAppConfigMutation, UpdateAppConfigMutationVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<UpdateAppConfigMutation, UpdateAppConfigMutationVariables>(UpdateAppConfigDocument, options);
}
export type UpdateAppConfigMutationHookResult = ReturnType<typeof useUpdateAppConfigMutation>;
export type UpdateAppConfigMutationResult = Apollo.MutationResult<UpdateAppConfigMutation>;
export type UpdateAppConfigMutationOptions = Apollo.BaseMutationOptions<UpdateAppConfigMutation, UpdateAppConfigMutationVariables>;
export const GetAppDocument = gql`
  query GetApp($appId: String!) {
    getApp(id: $appId) {
      id
      status
      config
      version
      exposed
      domain
      updateInfo {
        current
        latest
        dockerVersion
      }
      info {
        id
        port
        name
        description
        available
        version
        tipi_version
        short_desc
        author
        source
        categories
        url_suffix
        https
        exposable
        no_gui
        form_fields {
          type
          label
          max
          min
          hint
          placeholder
          required
          env_variable
        }
      }
    }
  }
`;

/**
 * __useGetAppQuery__
 *
 * To run a query within a React component, call `useGetAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAppQuery({
 *   variables: {
 *      appId: // value for 'appId'
 *   },
 * });
 */
export function useGetAppQuery(baseOptions: Apollo.QueryHookOptions<GetAppQuery, GetAppQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetAppQuery, GetAppQueryVariables>(GetAppDocument, options);
}
export function useGetAppLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAppQuery, GetAppQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetAppQuery, GetAppQueryVariables>(GetAppDocument, options);
}
export type GetAppQueryHookResult = ReturnType<typeof useGetAppQuery>;
export type GetAppLazyQueryHookResult = ReturnType<typeof useGetAppLazyQuery>;
export type GetAppQueryResult = Apollo.QueryResult<GetAppQuery, GetAppQueryVariables>;
export const InstalledAppsDocument = gql`
  query InstalledApps {
    installedApps {
      id
      status
      config
      version
      updateInfo {
        current
        latest
        dockerVersion
      }
      info {
        id
        name
        description
        tipi_version
        short_desc
        https
      }
    }
  }
`;

/**
 * __useInstalledAppsQuery__
 *
 * To run a query within a React component, call `useInstalledAppsQuery` and pass it any options that fit your needs.
 * When your component renders, `useInstalledAppsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInstalledAppsQuery({
 *   variables: {
 *   },
 * });
 */
export function useInstalledAppsQuery(baseOptions?: Apollo.QueryHookOptions<InstalledAppsQuery, InstalledAppsQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<InstalledAppsQuery, InstalledAppsQueryVariables>(InstalledAppsDocument, options);
}
export function useInstalledAppsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstalledAppsQuery, InstalledAppsQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<InstalledAppsQuery, InstalledAppsQueryVariables>(InstalledAppsDocument, options);
}
export type InstalledAppsQueryHookResult = ReturnType<typeof useInstalledAppsQuery>;
export type InstalledAppsLazyQueryHookResult = ReturnType<typeof useInstalledAppsLazyQuery>;
export type InstalledAppsQueryResult = Apollo.QueryResult<InstalledAppsQuery, InstalledAppsQueryVariables>;
export const ConfiguredDocument = gql`
  query Configured {
    isConfigured
  }
`;

/**
 * __useConfiguredQuery__
 *
 * To run a query within a React component, call `useConfiguredQuery` and pass it any options that fit your needs.
 * When your component renders, `useConfiguredQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConfiguredQuery({
 *   variables: {
 *   },
 * });
 */
export function useConfiguredQuery(baseOptions?: Apollo.QueryHookOptions<ConfiguredQuery, ConfiguredQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<ConfiguredQuery, ConfiguredQueryVariables>(ConfiguredDocument, options);
}
export function useConfiguredLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConfiguredQuery, ConfiguredQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<ConfiguredQuery, ConfiguredQueryVariables>(ConfiguredDocument, options);
}
export type ConfiguredQueryHookResult = ReturnType<typeof useConfiguredQuery>;
export type ConfiguredLazyQueryHookResult = ReturnType<typeof useConfiguredLazyQuery>;
export type ConfiguredQueryResult = Apollo.QueryResult<ConfiguredQuery, ConfiguredQueryVariables>;
export const ListAppsDocument = gql`
  query ListApps {
    listAppsInfo {
      apps {
        id
        available
        tipi_version
        port
        name
        version
        short_desc
        author
        categories
        https
      }
      total
    }
  }
`;

/**
 * __useListAppsQuery__
 *
 * To run a query within a React component, call `useListAppsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAppsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListAppsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListAppsQuery(baseOptions?: Apollo.QueryHookOptions<ListAppsQuery, ListAppsQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<ListAppsQuery, ListAppsQueryVariables>(ListAppsDocument, options);
}
export function useListAppsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListAppsQuery, ListAppsQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<ListAppsQuery, ListAppsQueryVariables>(ListAppsDocument, options);
}
export type ListAppsQueryHookResult = ReturnType<typeof useListAppsQuery>;
export type ListAppsLazyQueryHookResult = ReturnType<typeof useListAppsLazyQuery>;
export type ListAppsQueryResult = Apollo.QueryResult<ListAppsQuery, ListAppsQueryVariables>;
export const MeDocument = gql`
  query Me {
    me {
      id
    }
  }
`;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
}
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
}
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const RefreshTokenDocument = gql`
  query RefreshToken {
    refreshToken {
      token
    }
  }
`;

/**
 * __useRefreshTokenQuery__
 *
 * To run a query within a React component, call `useRefreshTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useRefreshTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRefreshTokenQuery({
 *   variables: {
 *   },
 * });
 */
export function useRefreshTokenQuery(baseOptions?: Apollo.QueryHookOptions<RefreshTokenQuery, RefreshTokenQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<RefreshTokenQuery, RefreshTokenQueryVariables>(RefreshTokenDocument, options);
}
export function useRefreshTokenLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RefreshTokenQuery, RefreshTokenQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<RefreshTokenQuery, RefreshTokenQueryVariables>(RefreshTokenDocument, options);
}
export type RefreshTokenQueryHookResult = ReturnType<typeof useRefreshTokenQuery>;
export type RefreshTokenLazyQueryHookResult = ReturnType<typeof useRefreshTokenLazyQuery>;
export type RefreshTokenQueryResult = Apollo.QueryResult<RefreshTokenQuery, RefreshTokenQueryVariables>;
export const SystemInfoDocument = gql`
  query SystemInfo {
    systemInfo {
      cpu {
        load
      }
      disk {
        available
        used
        total
      }
      memory {
        available
        used
        total
      }
    }
  }
`;

/**
 * __useSystemInfoQuery__
 *
 * To run a query within a React component, call `useSystemInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useSystemInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSystemInfoQuery({
 *   variables: {
 *   },
 * });
 */
export function useSystemInfoQuery(baseOptions?: Apollo.QueryHookOptions<SystemInfoQuery, SystemInfoQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<SystemInfoQuery, SystemInfoQueryVariables>(SystemInfoDocument, options);
}
export function useSystemInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SystemInfoQuery, SystemInfoQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<SystemInfoQuery, SystemInfoQueryVariables>(SystemInfoDocument, options);
}
export type SystemInfoQueryHookResult = ReturnType<typeof useSystemInfoQuery>;
export type SystemInfoLazyQueryHookResult = ReturnType<typeof useSystemInfoLazyQuery>;
export type SystemInfoQueryResult = Apollo.QueryResult<SystemInfoQuery, SystemInfoQueryVariables>;
export const VersionDocument = gql`
  query Version {
    version {
      current
      latest
    }
  }
`;

/**
 * __useVersionQuery__
 *
 * To run a query within a React component, call `useVersionQuery` and pass it any options that fit your needs.
 * When your component renders, `useVersionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useVersionQuery({
 *   variables: {
 *   },
 * });
 */
export function useVersionQuery(baseOptions?: Apollo.QueryHookOptions<VersionQuery, VersionQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<VersionQuery, VersionQueryVariables>(VersionDocument, options);
}
export function useVersionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<VersionQuery, VersionQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<VersionQuery, VersionQueryVariables>(VersionDocument, options);
}
export type VersionQueryHookResult = ReturnType<typeof useVersionQuery>;
export type VersionLazyQueryHookResult = ReturnType<typeof useVersionLazyQuery>;
export type VersionQueryResult = Apollo.QueryResult<VersionQuery, VersionQueryVariables>;
