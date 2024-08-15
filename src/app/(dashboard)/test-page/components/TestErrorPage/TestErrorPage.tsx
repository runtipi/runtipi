"use client";

import { Button } from "@/components/ui/Button";
import React from "react";

export function TestErrorPage() {
  const fetchFaultyApi = async () => {
    const response = await fetch("/api/test-error");
    const json = await response.json();
    return json;
  };

  return (
    <div className="card d-flex p-3">
      <h2>Congratulations! You found the secret Tipi Test Page 🎉</h2>
      <p className="card-subtitle">Now make it fail!</p>
      <Button
        className="mb-2"
        type="button"
        onClick={() => {
          throw new Error("Sentry Frontend Error");
        }}
      >
        Throw error
      </Button>
      <Button
        type="button"
        onClick={async () => {
          await fetchFaultyApi();
        }}
      >
        Fetch faulty API
      </Button>
    </div>
  );
}
