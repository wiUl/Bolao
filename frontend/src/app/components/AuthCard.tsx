import React from "react";

type AuthCardProps = {
  title?: string;
  children: React.ReactNode;
};

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
        }}
      >
        {title && (
          <h1 style={{ marginTop: 0, textAlign: "center", fontSize: "32px" }}>
            {title}
          </h1>
        )}

        {children}
      </div>
    </main>
  );
}
