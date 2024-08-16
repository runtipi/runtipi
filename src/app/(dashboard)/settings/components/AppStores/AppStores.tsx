import { AppStoresContainer } from "./components/AppStoresContainer";
import { AddAppStoreModal } from "./components/AddAppStoreModal";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { RepoSchema } from "packages/shared/src";
import type React from "react";

type IProps = {
  repositories: RepoSchema;
};

export const AppStores: React.FC<IProps> = async ({ repositories }) => {
  return (
    <div className="card-body">
      <h2 className="mb-4">App Stores</h2>
      <div className="d-flex">
        <div className="flex-grow-1">
          <h3 className="card-titile">Manage App Stores</h3>
          <p className="card-subtitle">Manage your Runtipi App Stores</p>
        </div>
        <div className="mt-3">
          <AddAppStoreModal />
        </div>
      </div>
      <AppStoresContainer repositories={repositories} />
      <div className="alert alert-warning mt-4" role="alert">
        <div className="d-flex">
          <div className="me-3">
            <IconAlertTriangle stroke={2} />
          </div>
          <div>
            <h4 className="alert-title">Warning!</h4>
            <div className="text-secondary">
              Make sure you trust the appstores you add!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
