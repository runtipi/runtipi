import type { Metadata } from "next";
import { TestErrorPage } from "./components/TestErrorPage";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Test Page - Tipi",
  };
}

export default function TestPage() {
  return <TestErrorPage />;
}
