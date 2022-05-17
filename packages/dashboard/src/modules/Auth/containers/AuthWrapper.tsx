import axios from 'axios';
import React, { useEffect, useState } from 'react';
import useSWR, { BareFetcher } from 'swr';
import LoadingScreen from '../../../components/LoadingScreen';
import { useAuthStore } from '../../../state/authStore';
import { useSytemStore } from '../../../state/systemStore';
import Login from './Login';
import Onboarding from './Onboarding';

interface IProps {
  children: React.ReactNode;
}

const fetcher: BareFetcher<any> = (url: string) => {
  return axios.get(url).then((res) => res.data);
};

const AuthWrapper: React.FC<IProps> = ({ children }) => {
  const [initialLoad, setInitialLoad] = useState(true);
  const { configured, user, me, fetchConfigured } = useAuthStore();
  const { internalIp, setInternalIp } = useSytemStore();

  const { data } = useSWR('/api/ip', fetcher);

  useEffect(() => {
    const fetchUser = async () => {
      await me();
      await fetchConfigured();

      setInitialLoad(false);
    };
    if (!user && internalIp) fetchUser();
  }, [fetchConfigured, internalIp, me, user]);

  useEffect(() => {
    if (data?.ip && !internalIp) {
      setInternalIp(data.ip);
    }
  }, [data?.ip, internalIp, setInternalIp]);

  if (initialLoad && !user) {
    return <LoadingScreen />;
  }

  if (user) {
    return <>{children}</>;
  }

  if (!configured) {
    return <Onboarding />;
  }

  return <Login />;
};

export default AuthWrapper;
