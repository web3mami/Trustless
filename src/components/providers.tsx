"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ThemeProvider } from "@/lib/theme";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  const tree = <ThemeProvider>{children}</ThemeProvider>;

  if (!APP_ID) return tree;

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#b8884a",
          logo: undefined,
        },
        loginMethods: ["google", "twitter", "email"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {tree}
    </PrivyProvider>
  );
}

export function hasPrivyApp() {
  return Boolean(APP_ID);
}
