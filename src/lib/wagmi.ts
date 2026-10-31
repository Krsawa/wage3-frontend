import { base, baseSepolia } from "viem/chains";
import { createConfig, http } from "wagmi";
import { baseAccount, injected } from "wagmi/connectors";

import { chain, RPC_URL } from "./config";

export const wagmiConfig = createConfig({
  // Only the backend's chain is offered; the other transport just satisfies the type.
  chains: [chain],
  connectors: [baseAccount({ appName: "Wage3" }), injected({ shimDisconnect: true })],
  transports: {
    [base.id]: http(chain.id === base.id ? RPC_URL : undefined),
    [baseSepolia.id]: http(chain.id === baseSepolia.id ? RPC_URL : undefined),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
