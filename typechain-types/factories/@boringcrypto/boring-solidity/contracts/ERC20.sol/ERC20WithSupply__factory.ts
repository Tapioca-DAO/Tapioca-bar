/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../../common";
import type {
  ERC20WithSupply,
  ERC20WithSupplyInterface,
} from "../../../../../@boringcrypto/boring-solidity/contracts/ERC20.sol/ERC20WithSupply";

const _abi = [
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
  "0x60c060405234801561001057600080fd5b504660a081905261007481604080517f47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a794692186020820152908101829052306060820152600090608001604051602081830303815290604052805190602001209050919050565b6080525060805160a051610a8861009d6000396000610713015260006107480152610a886000f3fe608060405234801561001057600080fd5b50600436106100835760003560e01c8063095ea7b31461008857806318160ddd146100b057806323b872dd146100c75780633644e515146100da57806370a08231146100e25780637ecebe0014610102578063a9059cbb14610122578063d505accf14610135578063dd62ed3e1461014a575b600080fd5b61009b610096366004610820565b610175565b60405190151581526020015b60405180910390f35b6100b960035481565b6040519081526020016100a7565b61009b6100d536600461084a565b6101e1565b6100b96103b1565b6100b96100f0366004610886565b60006020819052908152604090205481565b6100b9610110366004610886565b60026020526000908152604090205481565b61009b610130366004610820565b6103c0565b6101486101433660046108a8565b6104c5565b005b6100b961015836600461091b565b600160209081526000928352604080842090915290825290205481565b3360008181526001602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906101d09086815260200190565b60405180910390a350600192915050565b6000811561035a576001600160a01b0384166000908152602081905260409020548281101561022b5760405162461bcd60e51b81526004016102229061094e565b60405180910390fd5b836001600160a01b0316856001600160a01b031614610358576001600160a01b038516600090815260016020908152604080832033845290915290205460001981146102eb57838110156102bc5760405162461bcd60e51b815260206004820152601860248201527745524332303a20616c6c6f77616e636520746f6f206c6f7760401b6044820152606401610222565b6102c68482610994565b6001600160a01b03871660009081526001602090815260408083203384529091529020555b6001600160a01b0385166103115760405162461bcd60e51b8152600401610222906109ab565b61031b8483610994565b6001600160a01b0380881660009081526020819052604080822093909355908716815290812080548692906103519084906109db565b9091555050505b505b826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161039f91815260200190565b60405180910390a35060019392505050565b60006103bb61070e565b905090565b6000811515806103d85750336001600160a01b038416145b1561048857336000908152602081905260409020548281101561040d5760405162461bcd60e51b81526004016102229061094e565b336001600160a01b03851614610486576001600160a01b0384166104435760405162461bcd60e51b8152600401610222906109ab565b61044d8382610994565b33600090815260208190526040808220929092556001600160a01b038616815290812080548592906104809084906109db565b90915550505b505b6040518281526001600160a01b0384169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef906020016101d0565b6001600160a01b0387166105165760405162461bcd60e51b8152602060048201526018602482015277045524332303a204f776e65722063616e6e6f7420626520360441b6044820152606401610222565b8342106105565760405162461bcd60e51b815260206004820152600e60248201526d115490cc8c0e88115e1c1a5c995960921b6044820152606401610222565b6001600160a01b03871660008181526002602052604081208054600192610600927f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9928d928d928d92916105a9836109f3565b909155506040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810188905260e0016040516020818303038152906040528051906020012061076e565b6040805160008152602081018083529290925260ff871690820152606081018590526080810184905260a0016020604051602081039080840390855afa15801561064e573d6000803e3d6000fd5b505050602060405103516001600160a01b0316146106a95760405162461bcd60e51b815260206004820152601860248201527745524332303a20496e76616c6964205369676e617475726560401b6044820152606401610222565b6001600160a01b038781166000818152600160209081526040808320948b168084529482529182902089905590518881527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a350505050505050565b6000467f0000000000000000000000000000000000000000000000000000000000000000811461074657610741816107c3565b610768565b7f00000000000000000000000000000000000000000000000000000000000000005b91505090565b600060405180604001604052806002815260200161190160f01b81525061079361070e565b836040516020016107a693929190610a0c565b604051602081830303815290604052805190602001209050919050565b604080517f47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a7946921860208201529081018290523060608201526000906080016107a6565b80356001600160a01b038116811461081b57600080fd5b919050565b6000806040838503121561083357600080fd5b61083c83610804565b946020939093013593505050565b60008060006060848603121561085f57600080fd5b61086884610804565b925061087660208501610804565b9150604084013590509250925092565b60006020828403121561089857600080fd5b6108a182610804565b9392505050565b600080600080600080600060e0888a0312156108c357600080fd5b6108cc88610804565b96506108da60208901610804565b95506040880135945060608801359350608088013560ff811681146108fe57600080fd5b9699959850939692959460a0840135945060c09093013592915050565b6000806040838503121561092e57600080fd5b61093783610804565b915061094560208401610804565b90509250929050565b60208082526016908201527545524332303a2062616c616e636520746f6f206c6f7760501b604082015260600190565b634e487b7160e01b600052601160045260246000fd5b6000828210156109a6576109a661097e565b500390565b60208082526016908201527545524332303a206e6f207a65726f206164647265737360501b604082015260600190565b600082198211156109ee576109ee61097e565b500190565b600060018201610a0557610a0561097e565b5060010190565b6000845160005b81811015610a2d5760208188018101518583015201610a13565b81811115610a3c576000828501525b509190910192835250602082015260400191905056fea2646970667358221220d6405e041ac21fbac99e9c853b4725182334fdfbf77da24238b1f4352ea7ab3464736f6c634300080f0033";

type ERC20WithSupplyConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ERC20WithSupplyConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ERC20WithSupply__factory extends ContractFactory {
  constructor(...args: ERC20WithSupplyConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ERC20WithSupply> {
    return super.deploy(overrides || {}) as Promise<ERC20WithSupply>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): ERC20WithSupply {
    return super.attach(address) as ERC20WithSupply;
  }
  override connect(signer: Signer): ERC20WithSupply__factory {
    return super.connect(signer) as ERC20WithSupply__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ERC20WithSupplyInterface {
    return new utils.Interface(_abi) as ERC20WithSupplyInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ERC20WithSupply {
    return new Contract(address, _abi, signerOrProvider) as ERC20WithSupply;
  }
}
