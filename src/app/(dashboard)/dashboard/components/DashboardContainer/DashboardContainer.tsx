"use client";

import { type SystemLoad, systemLoadSchema } from "@runtipi/shared";
import {
  IconCircuitResistor,
  IconCpu,
  IconDatabase,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type React from "react";
import { SystemStat } from "../SystemStat";

type IProps = {
  initialData: SystemLoad;
  token: string;
};

type SystemStatusAPI = {
  data: {
    diskUsed: Number;
    diskSize: Number;
    percentUsed: Number;
    cpuLoad: Number;
    memoryTotal: Number;
    percentUsedMemory: Number;
  };
  ok: boolean;
};

async function fetchSystemStatus(token: string) {
  const response = await fetch("/worker-api/system/status", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error("Problem fetching data");
  }

  const systemLoad = await response.json();
  return systemLoadSchema.parse((systemLoad as SystemStatusAPI).data);
}

export const DashboardContainer: React.FC<IProps> = ({
  initialData,
  token,
}) => {
  const { data } = useQuery({
    queryKey: ["systemLoad", token],
    queryFn: ({ queryKey }) => fetchSystemStatus(queryKey[1]!),
    initialData,
    refetchInterval: 3000,
  });

  const t = useTranslations();

  if (!data) {
    return null;
  }

  return (
    <div className="row row-deck row-cards">
      <SystemStat
        title={t("DASHBOARD_DISK_SPACE_TITLE")}
        metric={`${data.diskUsed} GB`}
        subtitle={t("DASHBOARD_DISK_SPACE_SUBTITLE", { total: data.diskSize })}
        icon={IconDatabase}
        progress={data.percentUsed || 0}
      />
      <SystemStat
        title={t("DASHBOARD_CPU_TITLE")}
        metric={`${data.cpuLoad?.toFixed(2)}%`}
        subtitle={t("DASHBOARD_CPU_SUBTITLE")}
        icon={IconCpu}
        progress={data.cpuLoad || 0}
      />
      <SystemStat
        title={t("DASHBOARD_MEMORY_TITLE")}
        metric={`${data.percentUsedMemory || 0}%`}
        subtitle={`${data.memoryTotal} GB`}
        icon={IconCircuitResistor}
        progress={data.percentUsedMemory || 0}
      />
    </div>
  );
};
