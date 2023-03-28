import { IconExternalLink } from '@tabler/icons-react';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataGrid, DataGridItem } from '../../../components/ui/DataGrid';
import Markdown from '../../../components/Markdown/Markdown';
import { AppInfo } from '../../../core/types';

interface IProps {
  info: AppInfo;
}

export const AppDetailsTabs: React.FC<IProps> = ({ info }) => (
  <Tabs defaultValue="description" orientation="vertical" style={{ marginTop: -1 }}>
    <TabsList>
      <TabsTrigger value="description">Description</TabsTrigger>
      <TabsTrigger value="info">Base Info</TabsTrigger>
    </TabsList>
    <TabsContent value="description">
      <Markdown className="markdown">{info.description}</Markdown>
    </TabsContent>
    <TabsContent value="info">
      <DataGrid>
        <DataGridItem title="Source code">
          <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={info.source}>
            Link
            <IconExternalLink size={15} className="ms-1 mb-1" />
          </a>
        </DataGridItem>
        <DataGridItem title="Author">{info.author}</DataGridItem>
        <DataGridItem title="Port">
          <b>{info.port}</b>
        </DataGridItem>
        <DataGridItem title="Categories">
          {info.categories.map((c) => (
            <div key={c} className="badge bg-green me-1">
              {c.toLowerCase()}
            </div>
          ))}
        </DataGridItem>
        <DataGridItem title="Version">{info.version}</DataGridItem>
        {info.supported_architectures && (
          <DataGridItem title="Supported architectures">
            {info.supported_architectures.map((a) => (
              <div key={a} className="badge bg-red me-1">
                {a.toLowerCase()}
              </div>
            ))}
          </DataGridItem>
        )}
      </DataGrid>
    </TabsContent>
  </Tabs>
);
