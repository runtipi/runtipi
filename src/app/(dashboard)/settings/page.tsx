import { Tabs, TabsContent } from "@/components/ui/tabs";
import { getTranslator } from "@/lib/get-translator";
import { getUserFromCookie } from "@/server/common/session.helpers";
import { TipiConfig } from "@/server/core/TipiConfig";
import { SystemServiceClass } from "@/server/services/system";
import type { Metadata } from "next";
import React from "react";
import { getCurrentLocale } from "src/utils/getCurrentLocale";
import { GeneralActions } from "./components/GeneralActions";
import { LogsContainer } from "./components/LogsContainer";
import { SecurityContainer } from "./components/SecurityContainer";
import { SettingsContainer } from "./components/SettingsContainer";
import { SettingsTabTriggers } from "./components/SettingsTabTriggers";
import * as jwt from "jsonwebtoken";

export async function generateMetadata(): Promise<Metadata> {
  const translator = await getTranslator();

  return {
    title: `${translator("SETTINGS_TITLE")} - Tipi`,
  };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { tab: string };
}) {
  const { tab } = searchParams;
  const systemService = new SystemServiceClass();
  const version = await systemService.getVersion();
  const settings = TipiConfig.getSettings();
  const config = TipiConfig.getConfig();
  const locale = getCurrentLocale();
  const user = await getUserFromCookie();
  const jwtToken = jwt.sign({ skill: "issue" }, config.jwtSecret);

  return (
    <div className="card d-flex">
      <Tabs defaultValue={tab || "actions"}>
        <SettingsTabTriggers />
        <TabsContent value="actions">
          <GeneralActions version={version} jwtToken={jwtToken} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsContainer initialValues={settings} currentLocale={locale} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityContainer
            totpEnabled={Boolean(user?.totpEnabled)}
            username={user?.username}
          />
        </TabsContent>
        <TabsContent value="logs">
          <LogsContainer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
