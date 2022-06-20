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
  createdAt: Scalars['DateTime'];
  id: Scalars['String'];
  lastOpened: Scalars['DateTime'];
  numOpened: Scalars['Float'];
  status: Scalars['String'];
  updatedAt: Scalars['DateTime'];
};

export type AppConfig = {
  __typename?: 'AppConfig';
  author: Scalars['String'];
  available: Scalars['Boolean'];
  categories: Array<Scalars['String']>;
  description: Scalars['String'];
  form_fields: Array<FormField>;
  id: Scalars['String'];
  image: Scalars['String'];
  installed: Scalars['Boolean'];
  name: Scalars['String'];
  port: Scalars['Float'];
  short_desc: Scalars['String'];
  source: Scalars['String'];
  status: Scalars['String'];
  url_suffix?: Maybe<Scalars['String']>;
  version?: Maybe<Scalars['String']>;
};

export type AppInputType = {
  form: Scalars['JSONObject'];
  id: Scalars['String'];
};

export type FormField = {
  __typename?: 'FormField';
  env_variable: Scalars['String'];
  hint?: Maybe<Scalars['String']>;
  label: Scalars['String'];
  max?: Maybe<Scalars['Float']>;
  min?: Maybe<Scalars['Float']>;
  required?: Maybe<Scalars['Boolean']>;
  type: Scalars['String'];
};

export type ListAppsResonse = {
  __typename?: 'ListAppsResonse';
  apps: Array<AppConfig>;
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
  getAppInfo: AppConfig;
  installedApps: Array<App>;
  isConfigured: Scalars['Boolean'];
  listAppsInfo: ListAppsResonse;
  me?: Maybe<User>;
};

export type QueryGetAppInfoArgs = {
  id: Scalars['String'];
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

export type LoginMutation = { __typename?: 'Mutation'; login: { __typename?: 'UserResponse'; user?: { __typename?: 'User'; id: string } | null } };

export type ConfiguredQueryVariables = Exact<{ [key: string]: never }>;

export type ConfiguredQuery = { __typename?: 'Query'; isConfigured: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = { __typename?: 'Query'; me?: { __typename?: 'User'; id: string } | null };

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
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
}
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
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
