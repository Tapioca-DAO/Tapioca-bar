/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  BigNumberish,
  Overrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../common";
import type {
  ERC20Mock,
  ERC20MockInterface,
} from "../../../../../contracts/mixologist/legacy/mocks/ERC20Mock";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_initialAmount",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_val",
        type: "uint256",
      },
    ],
    name: "freeMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner_",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60c060405234801561001057600080fd5b50604051610c6e380380610c6e83398101604081905261002f9161009e565b4660a081905261009281604080517f47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a794692186020820152908101829052306060820152600090608001604051602081830303815290604052805190602001209050919050565b608052506003556100b7565b6000602082840312156100b057600080fd5b5051919050565b60805160a051610b926100dc600039600061072a0152600061075f0152610b926000f3fe608060405234801561001057600080fd5b506004361061009e5760003560e01c80637c928fe9116100665780637c928fe91461011d5780637ecebe0014610132578063a9059cbb14610152578063d505accf14610165578063dd62ed3e1461017857600080fd5b8063095ea7b3146100a357806318160ddd146100cb57806323b872dd146100e25780633644e515146100f557806370a08231146100fd575b600080fd5b6100b66100b13660046108f1565b6101a3565b60405190151581526020015b60405180910390f35b6100d460035481565b6040519081526020016100c2565b6100b66100f036600461091b565b61020f565b6100d46103cd565b6100d461010b366004610957565b60006020819052908152604090205481565b61013061012b366004610979565b6103dc565b005b6100d4610140366004610957565b60026020526000908152604090205481565b6100b66101603660046108f1565b6103e9565b610130610173366004610992565b6104dc565b6100d4610186366004610a05565b600160209081526000928352604080842090915290825290205481565b3360008181526001602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906101fe9086815260200190565b60405180910390a350600192915050565b60008115610388576001600160a01b038416600090815260208190526040902054828110156102595760405162461bcd60e51b815260040161025090610a38565b60405180910390fd5b836001600160a01b0316856001600160a01b031614610386576001600160a01b0385166000908152600160209081526040808320338452909152902054600019811461031957838110156102ea5760405162461bcd60e51b815260206004820152601860248201527745524332303a20616c6c6f77616e636520746f6f206c6f7760401b6044820152606401610250565b6102f48482610a7e565b6001600160a01b03871660009081526001602090815260408083203384529091529020555b6001600160a01b03851661033f5760405162461bcd60e51b815260040161025090610a95565b6103498483610a7e565b6001600160a01b03808816600090815260208190526040808220939093559087168152908120805486929061037f908490610ac5565b9091555050505b505b826001600160a01b0316846001600160a01b0316600080516020610b3d833981519152846040516103bb91815260200190565b60405180910390a35060019392505050565b60006103d7610725565b905090565b6103e63382610785565b50565b6000811515806104015750336001600160a01b038416145b156104b15733600090815260208190526040902054828110156104365760405162461bcd60e51b815260040161025090610a38565b336001600160a01b038516146104af576001600160a01b03841661046c5760405162461bcd60e51b815260040161025090610a95565b6104768382610a7e565b33600090815260208190526040808220929092556001600160a01b038616815290812080548592906104a9908490610ac5565b90915550505b505b6040518281526001600160a01b038416903390600080516020610b3d833981519152906020016101fe565b6001600160a01b03871661052d5760405162461bcd60e51b8152602060048201526018602482015277045524332303a204f776e65722063616e6e6f7420626520360441b6044820152606401610250565b83421061056d5760405162461bcd60e51b815260206004820152600e60248201526d115490cc8c0e88115e1c1a5c995960921b6044820152606401610250565b6001600160a01b03871660008181526002602052604081208054600192610617927f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9928d928d928d92916105c083610add565b909155506040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810188905260e0016040516020818303038152906040528051906020012061083f565b6040805160008152602081018083529290925260ff871690820152606081018590526080810184905260a0016020604051602081039080840390855afa158015610665573d6000803e3d6000fd5b505050602060405103516001600160a01b0316146106c05760405162461bcd60e51b815260206004820152601860248201527745524332303a20496e76616c6964205369676e617475726560401b6044820152606401610250565b6001600160a01b038781166000818152600160209081526040808320948b168084529482529182902089905590518881527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a350505050505050565b6000467f0000000000000000000000000000000000000000000000000000000000000000811461075d5761075881610894565b61077f565b7f00000000000000000000000000000000000000000000000000000000000000005b91505090565b6000816003546107959190610ac5565b90506003548110156107d95760405162461bcd60e51b815260206004820152600d60248201526c4d696e74206f766572666c6f7760981b6044820152606401610250565b60038190556001600160a01b03831660009081526020819052604081208054849290610806908490610ac5565b90915550506040518281526001600160a01b03841690600090600080516020610b3d8339815191529060200160405180910390a3505050565b600060405180604001604052806002815260200161190160f01b815250610864610725565b8360405160200161087793929190610af6565b604051602081830303815290604052805190602001209050919050565b604080517f47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a794692186020820152908101829052306060820152600090608001610877565b80356001600160a01b03811681146108ec57600080fd5b919050565b6000806040838503121561090457600080fd5b61090d836108d5565b946020939093013593505050565b60008060006060848603121561093057600080fd5b610939846108d5565b9250610947602085016108d5565b9150604084013590509250925092565b60006020828403121561096957600080fd5b610972826108d5565b9392505050565b60006020828403121561098b57600080fd5b5035919050565b600080600080600080600060e0888a0312156109ad57600080fd5b6109b6886108d5565b96506109c4602089016108d5565b95506040880135945060608801359350608088013560ff811681146109e857600080fd5b9699959850939692959460a0840135945060c09093013592915050565b60008060408385031215610a1857600080fd5b610a21836108d5565b9150610a2f602084016108d5565b90509250929050565b60208082526016908201527545524332303a2062616c616e636520746f6f206c6f7760501b604082015260600190565b634e487b7160e01b600052601160045260246000fd5b600082821015610a9057610a90610a68565b500390565b60208082526016908201527545524332303a206e6f207a65726f206164647265737360501b604082015260600190565b60008219821115610ad857610ad8610a68565b500190565b600060018201610aef57610aef610a68565b5060010190565b6000845160005b81811015610b175760208188018101518583015201610afd565b81811115610b26576000828501525b509190910192835250602082015260400191905056feddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa2646970667358221220b8bd581554410672b13b98519f16bd5b15bc522f83449319ed314e00c2ce4e8464736f6c634300080f0033";

type ERC20MockConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ERC20MockConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ERC20Mock__factory extends ContractFactory {
  constructor(...args: ERC20MockConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    _initialAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ERC20Mock> {
    return super.deploy(_initialAmount, overrides || {}) as Promise<ERC20Mock>;
  }
  override getDeployTransaction(
    _initialAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_initialAmount, overrides || {});
  }
  override attach(address: string): ERC20Mock {
    return super.attach(address) as ERC20Mock;
  }
  override connect(signer: Signer): ERC20Mock__factory {
    return super.connect(signer) as ERC20Mock__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ERC20MockInterface {
    return new utils.Interface(_abi) as ERC20MockInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ERC20Mock {
    return new Contract(address, _abi, signerOrProvider) as ERC20Mock;
  }
}
