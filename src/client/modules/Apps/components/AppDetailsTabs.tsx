import { IconExternalLink } from '@tabler/icons';
import React from 'react';
import { DataGrid, DataGridItem } from '../../../components/ui/DataGrid';
import Markdown from '../../../components/Markdown/Markdown';
import { AppInfo } from '../../../core/types';

interface IProps {
  info: AppInfo;
}

export const AppDetailsTabs: React.FC<IProps> = ({ info }) => (
  <div className="card">
    <div style={{ marginTop: -1, marginBottom: -3 }} className="card-header">
      <ul className="nav nav-tabs card-header-tabs" data-bs-toggle="tabs" role="tablist">
        <li className="nav-item">
          <a className="nav-link active" href="#tabs-description" data-bs-toggle="tab" role="tab" aria-selected="true">
            Description
          </a>
        </li>
        <li className="nav-item">
          <a className="nav-link" href="#tabs-links" data-bs-toggle="tab" role="tab" aria-selected="true">
            Base Info
          </a>
        </li>
      </ul>
    </div>
    <div className="card-body">
      <div className="tab-content">
        <div className="tab-pane active" id="tabs-description" role="tabpanel">
          <Markdown className="markdown">{info.description}</Markdown>
        </div>
        <div className="tab-pane" id="tabs-links" role="tabpanel">
          <DataGrid>
            <DataGridItem title="Source code">
              <a target="_blank" rel="noreferrer" className="text-blue-500 text-xs" href={info.source}>
                Link
                <IconExternalLink size={15} className="ms-1 mb-1" />
              </a>
            </DataGridItem>
            <DataGridItem title="Author">{info.author}</DataGridItem>
            <DataGridItem title="Port"><b>{info.port}</b></DataGridItem>
            <DataGridItem title="Categories">
              {info.categories.map((c) => (
                <div key={c} className="badge bg-green me-1">
                  {c.toLowerCase()}
                </div>
              ))}
            </DataGridItem>
            <DataGridItem title="Version">{info.version}</DataGridItem>
            {info.supported_architectures && <DataGridItem title="Supported architectures">{info.supported_architectures.map(
              (a) => (
                <div key={a} className="badge bg-red me-1">
                  {a.toLowerCase()}
                </div>
              ),
            )}</DataGridItem>}
          </DataGrid>
        </div>
      </div>
    </div>
  </div>
);
