import type { Metadata } from "next";
import { TestErrorPage } from "./components/TestErrorPage";
import type React from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Test Page - Tipi",
  };
}

export default function TestPage() {
  return <TestErrorPage />;
}
