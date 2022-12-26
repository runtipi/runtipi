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
  startApp: App;
  stopApp: App;
  uninstallApp: App;
  updateApp: App;
  updateAppConfig: App;
};

export type MutationInstallAppArgs = {
  input: AppInputType;
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
  listAppsInfo: ListAppsResonse;
};

export type QueryGetAppArgs = {
  id: Scalars['String'];
};

export type UpdateInfo = {
  __typename?: 'UpdateInfo';
  current: Scalars['Float'];
  dockerVersion?: Maybe<Scalars['String']>;
  latest: Scalars['Float'];
};

export type InstallAppMutationVariables = Exact<{
  input: AppInputType;
}>;

export type InstallAppMutation = { __typename?: 'Mutation'; installApp: { __typename: 'App'; id: string; status: AppStatusEnum } };

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
