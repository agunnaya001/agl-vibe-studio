import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";

/**
 * Base Builder Code Attribution (ERC-8021)
 * Builder Code: bc_btb1rzza
 */
export const BUILDER_CODE = "bc_btb1rzza";

export const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
});

/**
 * Wagmi configuration with Base Builder Code attribution data suffix
 */
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Agunnaya Labs Studio" }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
  dataSuffix: DATA_SUFFIX,
});

export { DATA_SUFFIX as ERC8021_DATA_SUFFIX };
