import type { ExternalProvider } from "@ethersproject/providers";
import type { Actions } from "@web3-react/types";
import { Connector } from "@web3-react/types";

export class Portis extends Connector {
  private readonly options: any;
  public portis?: any;

  constructor(actions: Actions, options: any) {
    super(actions);
    this.options = options;
  }

  private async startListening(configuration: any): Promise<void> {
    const { dappId, network, ...options } = this.options;
    return import("@portis/web3").then(async (m) => {
      this.portis = new m.default(dappId, network, options.options);

      const [Web3Provider, Eip1193Bridge] = await Promise.all([
        import("@ethersproject/providers").then(
          ({ Web3Provider }) => Web3Provider
        ),
        import("@ethersproject/experimental").then(
          ({ Eip1193Bridge }) => Eip1193Bridge
        ),
      ]);

      const provider = new Web3Provider(
        this.portis.provider as unknown as ExternalProvider
      );

      this.provider = new Eip1193Bridge(provider.getSigner(), provider);
    });
  }

  public async activate(configuration: any): Promise<void> {
    this.actions.startActivation();

    await this.startListening(configuration).catch((error: Error) => {
      console.error(error);
    });

    if (this.provider) {
      await Promise.all([
        this.provider.request({ method: "eth_chainId" }) as Promise<string>,
        this.provider.request({ method: "eth_accounts" }) as Promise<string[]>,
      ])
        .then(([chainId, accounts]) => {
          this.actions.update({
            chainId: Number.parseInt(chainId, 16),
            accounts,
          });
          this.portis.showPortis();
        })
        .catch((error: Error) => {
          console.error(error);
        });
    }
  }

  public async deactivate(): Promise<void> {
    this.portis.logout();
    this.actions.resetState();
  }
}
