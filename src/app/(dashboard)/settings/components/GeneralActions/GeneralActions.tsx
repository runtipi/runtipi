"use client";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/Button";
import { IconCopy, IconStar } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import React from "react";
import semver from "semver";
import toast from "react-hot-toast";

type Props = {
  version: { current: string; latest: string; body?: string | null };
  jwtToken: string;
};

export const GeneralActions = (props: Props) => {
  const t = useTranslations();

  const { version, jwtToken } = props;

  const isLatest =
    semver.valid(version.current) &&
    semver.valid(version.latest) &&
    semver.gte(version.current, version.latest);

  const renderUpdate = () => {
    if (isLatest) {
      return <Button disabled>{t("SETTINGS_ACTIONS_ALREADY_LATEST")}</Button>;
    }

    return (
      <div>
        {version.body && (
          <div className="mt-3 card col-12 col-md-8">
            <div className="card-stamp">
              <div className="card-stamp-icon bg-yellow">
                <IconStar size={80} />
              </div>
            </div>
            <div className="card-body">
              <Markdown className="">{version.body}</Markdown>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card-body">
      <h2 className="mb-4">{t("SETTINGS_ACTIONS_TITLE")}</h2>
      <h3 className="card-title mt-4">
        {t("SETTINGS_ACTIONS_CURRENT_VERSION", { version: version.current })}
      </h3>
      <p className="card-subtitle">
        {isLatest
          ? t("SETTINGS_ACTIONS_STAY_UP_TO_DATE")
          : t("SETTINGS_ACTIONS_NEW_VERSION", { version: version.latest })}
      </p>
      {renderUpdate()}
      <h3 className="mt-4">{t("SETTINGS_ACTIONS_API_TOKEN")}</h3>
      <p className="card-subtitle">
        {t("SETTINGS_ACTIONS_API_TOKEN_DESCRIPTION")}
      </p>
      <div className="input-group">
        <div className="input-group">
          <input className="form-control" readOnly value={jwtToken} />
          <button
            className="btn btn-danger"
            onClick={() => {
              navigator.clipboard.writeText(jwtToken);
              toast.success("API token copied to clipboard!");
            }}
          >
            <IconCopy stroke={1.5} />
          </button>
        </div>
      </div>
      <div className="alert alert-warning mt-4" role="alert">
        <h4 className="alert-title">
          {t("SETTINGS_ACTIONS_API_TOKEN_WARNING_TITLE")}
        </h4>
        <div className="text-secondary">
          {t("SETTINGS_ACTIONS_API_TOKEN_WARNING_SUBTITILE")}
        </div>
      </div>
    </div>
  );
};
