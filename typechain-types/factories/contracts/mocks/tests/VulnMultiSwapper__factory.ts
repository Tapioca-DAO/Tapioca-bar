/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../common";
import type {
  VulnMultiSwapper,
  VulnMultiSwapperInterface,
} from "../../../../contracts/mocks/tests/VulnMultiSwapper";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract BeachBar",
        name: "beachbar",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "assetId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
    ],
    name: "counterfeitSwap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610309806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806347feaff914610030575b600080fd5b61004361003e366004610230565b610045565b005b826001600160a01b031663de4065776040518163ffffffff1660e01b8152600401602060405180830381865afa158015610083573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906100a79190610272565b6001600160a01b0316638d2e63b8838333876001600160a01b031663de4065776040518163ffffffff1660e01b8152600401602060405180830381865afa1580156100f6573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061011a9190610272565b604051632a18be8b60e11b81526001600160a01b038881166004830152602482018a905291909116906354317d1690604401602060405180830381865afa158015610169573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061018d9190610296565b6040516001600160e01b031960e087901b16815260048101949094526001600160a01b0392831660248501529116604483015260648201526000608482015260a40160408051808303816000875af11580156101ed573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061021191906102af565b5050505050565b6001600160a01b038116811461022d57600080fd5b50565b60008060006060848603121561024557600080fd5b833561025081610218565b925060208401359150604084013561026781610218565b809150509250925092565b60006020828403121561028457600080fd5b815161028f81610218565b9392505050565b6000602082840312156102a857600080fd5b5051919050565b600080604083850312156102c257600080fd5b50508051602090910151909290915056fea26469706673582212203efc8e82c6b6a8df59ce59fae577b0f447c306fdee53e7b5b32dbd3af459e3c464736f6c634300080f0033";

type VulnMultiSwapperConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: VulnMultiSwapperConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class VulnMultiSwapper__factory extends ContractFactory {
  constructor(...args: VulnMultiSwapperConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<VulnMultiSwapper> {
    return super.deploy(overrides || {}) as Promise<VulnMultiSwapper>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): VulnMultiSwapper {
    return super.attach(address) as VulnMultiSwapper;
  }
  override connect(signer: Signer): VulnMultiSwapper__factory {
    return super.connect(signer) as VulnMultiSwapper__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): VulnMultiSwapperInterface {
    return new utils.Interface(_abi) as VulnMultiSwapperInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): VulnMultiSwapper {
    return new Contract(address, _abi, signerOrProvider) as VulnMultiSwapper;
  }
}
