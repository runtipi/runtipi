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
  id: Scalars['String'];
  lastOpened: Scalars['DateTime'];
  numOpened: Scalars['Float'];
  status: AppStatusEnum;
  updatedAt: Scalars['DateTime'];
};

export enum AppCategoriesEnum {
  Automation = 'AUTOMATION',
  Books = 'BOOKS',
  Data = 'DATA',
  Development = 'DEVELOPMENT',
  Featured = 'FEATURED',
  Media = 'MEDIA',
  Network = 'NETWORK',
  Photography = 'PHOTOGRAPHY',
  Security = 'SECURITY',
  Social = 'SOCIAL',
  Utilities = 'UTILITIES'
}

export type AppInfo = {
  __typename?: 'AppInfo';
  author: Scalars['String'];
  available: Scalars['Boolean'];
  categories: Array<AppCategoriesEnum>;
  description: Scalars['String'];
  form_fields: Array<FormField>;
  id: Scalars['String'];
  image: Scalars['String'];
  installed: Scalars['Boolean'];
  name: Scalars['String'];
  port: Scalars['Float'];
  short_desc: Scalars['String'];
  source: Scalars['String'];
  url_suffix?: Maybe<Scalars['String']>;
  version?: Maybe<Scalars['String']>;
};

export type AppInputType = {
  form: Scalars['JSONObject'];
  id: Scalars['String'];
};

export type AppResponse = {
  __typename?: 'AppResponse';
  app?: Maybe<App>;
  info: AppInfo;
};

export enum AppStatusEnum {
  Installing = 'INSTALLING',
  Running = 'RUNNING',
  Starting = 'STARTING',
  Stopped = 'STOPPED',
  Stopping = 'STOPPING',
  Uninstalling = 'UNINSTALLING'
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
  Text = 'text',
  Url = 'url'
}

export type FormField = {
  __typename?: 'FormField';
  env_variable: Scalars['String'];
  hint?: Maybe<Scalars['String']>;
  label: Scalars['String'];
  max?: Maybe<Scalars['Float']>;
  min?: Maybe<Scalars['Float']>;
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
  login: UserResponse;
  logout: Scalars['Boolean'];
  register: UserResponse;
  startApp: App;
  stopApp: App;
  uninstallApp: App;
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


export type MutationUpdateAppConfigArgs = {
  input: AppInputType;
};

export type Query = {
  __typename?: 'Query';
  getApp: AppResponse;
  installedApps: Array<App>;
  isConfigured: Scalars['Boolean'];
  listAppsInfo: ListAppsResonse;
  me?: Maybe<User>;
  systemInfo?: Maybe<SystemInfoResponse>;
  version: Scalars['String'];
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

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  updatedAt: Scalars['DateTime'];
  username: Scalars['String'];
};

export type UserResponse = {
  __typename?: 'UserResponse';
  user?: Maybe<User>;
};

export type UsernamePasswordInput = {
  password: Scalars['String'];
  username: Scalars['String'];
};

export type LoginMutationVariables = Exact<{
  input: UsernamePasswordInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'UserResponse', user?: { __typename?: 'User', id: string } | null } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type RegisterMutationVariables = Exact<{
  input: UsernamePasswordInput;
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'UserResponse', user?: { __typename?: 'User', id: string } | null } };

export type GetAppQueryVariables = Exact<{
  appId: Scalars['String'];
}>;


export type GetAppQuery = { __typename?: 'Query', getApp: { __typename?: 'AppResponse', app?: { __typename?: 'App', id: string, status: AppStatusEnum, config: any } | null, info: { __typename?: 'AppInfo', id: string, port: number, name: string, description: string, available: boolean, version?: string | null, image: string, short_desc: string, author: string, source: string, installed: boolean, categories: Array<AppCategoriesEnum>, url_suffix?: string | null, form_fields: Array<{ __typename?: 'FormField', type: FieldTypesEnum, label: string, max?: number | null, min?: number | null, hint?: string | null, required?: boolean | null, env_variable: string }> } } };

export type InstalledAppsQueryVariables = Exact<{ [key: string]: never; }>;


export type InstalledAppsQuery = { __typename?: 'Query', installedApps: Array<{ __typename?: 'App', id: string, status: AppStatusEnum, config: any }> };

export type ConfiguredQueryVariables = Exact<{ [key: string]: never; }>;


export type ConfiguredQuery = { __typename?: 'Query', isConfigured: boolean };

export type ListAppsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListAppsQuery = { __typename?: 'Query', listAppsInfo: { __typename?: 'ListAppsResonse', total: number, apps: Array<{ __typename?: 'AppInfo', id: string, available: boolean, installed: boolean, image: string, port: number, name: string, version?: string | null, short_desc: string, author: string, categories: Array<AppCategoriesEnum> }> } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string } | null };

export type SystemInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type SystemInfoQuery = { __typename?: 'Query', systemInfo?: { __typename?: 'SystemInfoResponse', cpu: { __typename?: 'Cpu', load: number }, disk: { __typename?: 'DiskMemory', available: number, used: number, total: number }, memory: { __typename?: 'DiskMemory', available: number, used: number, total: number } } | null };


export const LoginDocument = gql`
    mutation Login($input: UsernamePasswordInput!) {
  login(input: $input) {
    user {
      id
    }
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
        const options = {...defaultOptions, ...baseOptions}
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options);
      }
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>;
export const RegisterDocument = gql`
    mutation Register($input: UsernamePasswordInput!) {
  register(input: $input) {
    user {
      id
    }
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterMutation, RegisterMutationVariables>(RegisterDocument, options);
      }
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutation>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutation, RegisterMutationVariables>;
export const GetAppDocument = gql`
    query GetApp($appId: String!) {
  getApp(id: $appId) {
    app {
      id
      status
      config
    }
    info {
      id
      port
      name
      description
      available
      version
      image
      short_desc
      author
      source
      installed
      categories
      url_suffix
      form_fields {
        type
        label
        max
        min
        hint
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAppQuery, GetAppQueryVariables>(GetAppDocument, options);
      }
export function useGetAppLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAppQuery, GetAppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InstalledAppsQuery, InstalledAppsQueryVariables>(InstalledAppsDocument, options);
      }
export function useInstalledAppsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InstalledAppsQuery, InstalledAppsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConfiguredQuery, ConfiguredQueryVariables>(ConfiguredDocument, options);
      }
export function useConfiguredLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConfiguredQuery, ConfiguredQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
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
      installed
      image
      port
      name
      version
      short_desc
      author
      categories
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListAppsQuery, ListAppsQueryVariables>(ListAppsDocument, options);
      }
export function useListAppsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListAppsQuery, ListAppsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
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
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SystemInfoQuery, SystemInfoQueryVariables>(SystemInfoDocument, options);
      }
export function useSystemInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SystemInfoQuery, SystemInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SystemInfoQuery, SystemInfoQueryVariables>(SystemInfoDocument, options);
        }
export type SystemInfoQueryHookResult = ReturnType<typeof useSystemInfoQuery>;
export type SystemInfoLazyQueryHookResult = ReturnType<typeof useSystemInfoLazyQuery>;
export type SystemInfoQueryResult = Apollo.QueryResult<SystemInfoQuery, SystemInfoQueryVariables>;