import React from 'react';
import type { NextPage } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '../../../../components/Layout';
import { GeneralActions } from '../../containers/GeneralActions';
import { SettingsContainer } from '../../containers/SettingsContainer';
import { SecurityContainer } from '../../containers/SecurityContainer';

export const SettingsPage: NextPage = () => {
  return (
    <Layout title="Settings">
      <div className="card d-flex">
        <Tabs defaultValue="actions">
          <TabsList>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="actions">
            <GeneralActions />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsContainer />
          </TabsContent>
          <TabsContent value="security">
            <SecurityContainer />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
