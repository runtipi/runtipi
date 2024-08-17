"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/Table";
import type { RepoSchema } from "packages/shared/src";
import type React from "react";
import { DeleteAppStoreModal } from "../DeleteAppStoreModal";
import { EditAppStoreModal } from "../EditAppStoreModal";

type IPros = {
  repositories: RepoSchema;
};

export const AppStoresContainer: React.FC<IPros> = ({ repositories }) => {
  if (Object.keys(repositories).length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No repositories found :(</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="d-flex justify-content-center text-center">
            <TableCell className="text-muted mt-2">
              No repositories found :(
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.keys(repositories).map((repoName: string) => (
          <TableRow key={repoName}>
            <TableCell>{repoName}</TableCell>
            <TableCell>
              <a href={repositories[repoName]}>{repositories[repoName]}</a>
            </TableCell>
            <TableCell className="d-flex flex-row">
              <DeleteAppStoreModal
                name={repoName}
                length={Object.keys(repositories).length}
              />
              <EditAppStoreModal
                name={repoName}
                url={repositories[repoName] || ""}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
