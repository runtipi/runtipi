import { fetchSystemStatus } from "@/api/system-status/fetch-system-status";
import { getTranslator } from "@/lib/get-translator";
import type { Metadata } from "next";
import React from "react";
import { DashboardContainer } from "./components/DashboardContainer";
import { TipiConfig } from "@/server/core/TipiConfig";
import * as jwt from "jsonwebtoken";

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslator();

  return {
    title: `${translator("DASHBOARD_TITLE")} - Tipi`,
  };
}

export default async function DashboardPage() {
  const systemLoad = await fetchSystemStatus();
  const { jwtSecret } = TipiConfig.getConfig();
  const token = jwt.sign({ skill: "issue" }, jwtSecret);

  return <DashboardContainer initialData={systemLoad} token={token} />;
}
