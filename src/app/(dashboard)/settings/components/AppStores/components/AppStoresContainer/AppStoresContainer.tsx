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
  if (repositories.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No repositories found :(</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="d-flex justify-content-center text-center">
          <p className="text-muted mt-4">No repositories found :(</p>
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
        {repositories.map((repo) => (
          <TableRow key={Object.keys(repo)[0]}>
            <TableCell>{Object.keys(repo)[0]}</TableCell>
            <TableCell>
              <a href={Object.values(repo)[0]}>{Object.values(repo)[0]}</a>
            </TableCell>
            <TableCell className="d-flex flex-row">
              <DeleteAppStoreModal
                // biome-ignore lint/style/noNonNullAssertion: <explanation>
                name={Object.keys(repo)[0]!}
                // biome-ignore lint/style/noNonNullAssertion: <explanation>
                url={Object.values(repo)[0]!}
              />
              <EditAppStoreModal
                // biome-ignore lint/style/noNonNullAssertion: <explanation>
                name={Object.keys(repo)[0]!}
                // biome-ignore lint/style/noNonNullAssertion: <explanation>
                url={Object.values(repo)[0]!}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
