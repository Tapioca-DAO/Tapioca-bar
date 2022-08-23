/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../common";

export interface AssetRegisterInterface extends utils.Interface {
  functions: {
    "assetCount()": FunctionFragment;
    "assets(uint256)": FunctionFragment;
    "balanceOf(address,uint256)": FunctionFragment;
    "balanceOfBatch(address[],uint256[])": FunctionFragment;
    "ids(uint8,address,address,uint256)": FunctionFragment;
    "isApprovedForAll(address,address)": FunctionFragment;
    "registerAsset(uint8,address,address,uint256)": FunctionFragment;
    "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)": FunctionFragment;
    "safeTransferFrom(address,address,uint256,uint256,bytes)": FunctionFragment;
    "setApprovalForAll(address,bool)": FunctionFragment;
    "supportsInterface(bytes4)": FunctionFragment;
    "totalSupply(uint256)": FunctionFragment;
    "uri(uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "assetCount"
      | "assets"
      | "balanceOf"
      | "balanceOfBatch"
      | "ids"
      | "isApprovedForAll"
      | "registerAsset"
      | "safeBatchTransferFrom"
      | "safeTransferFrom"
      | "setApprovalForAll"
      | "supportsInterface"
      | "totalSupply"
      | "uri"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "assetCount",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "assets",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "balanceOf",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "balanceOfBatch",
    values: [PromiseOrValue<string>[], PromiseOrValue<BigNumberish>[]]
  ): string;
  encodeFunctionData(
    functionFragment: "ids",
    values: [
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "isApprovedForAll",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "registerAsset",
    values: [
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "safeBatchTransferFrom",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>[],
      PromiseOrValue<BigNumberish>[],
      PromiseOrValue<BytesLike>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "safeTransferFrom",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BytesLike>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "setApprovalForAll",
    values: [PromiseOrValue<string>, PromiseOrValue<boolean>]
  ): string;
  encodeFunctionData(
    functionFragment: "supportsInterface",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "totalSupply",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "uri",
    values: [PromiseOrValue<BigNumberish>]
  ): string;

  decodeFunctionResult(functionFragment: "assetCount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "assets", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "balanceOfBatch",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "ids", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "isApprovedForAll",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "registerAsset",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "safeBatchTransferFrom",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "safeTransferFrom",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setApprovalForAll",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "supportsInterface",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalSupply",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "uri", data: BytesLike): Result;

  events: {
    "ApprovalForAll(address,address,bool)": EventFragment;
    "AssetRegistered(uint8,address,address,uint256,uint256)": EventFragment;
    "TransferBatch(address,address,address,uint256[],uint256[])": EventFragment;
    "TransferSingle(address,address,address,uint256,uint256)": EventFragment;
    "URI(string,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ApprovalForAll"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "AssetRegistered"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "TransferBatch"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "TransferSingle"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "URI"): EventFragment;
}

export interface ApprovalForAllEventObject {
  _owner: string;
  _operator: string;
  _approved: boolean;
}
export type ApprovalForAllEvent = TypedEvent<
  [string, string, boolean],
  ApprovalForAllEventObject
>;

export type ApprovalForAllEventFilter = TypedEventFilter<ApprovalForAllEvent>;

export interface AssetRegisteredEventObject {
  tokenType: number;
  contractAddress: string;
  strategy: string;
  tokenId: BigNumber;
  assetId: BigNumber;
}
export type AssetRegisteredEvent = TypedEvent<
  [number, string, string, BigNumber, BigNumber],
  AssetRegisteredEventObject
>;

export type AssetRegisteredEventFilter = TypedEventFilter<AssetRegisteredEvent>;

export interface TransferBatchEventObject {
  _operator: string;
  _from: string;
  _to: string;
  _ids: BigNumber[];
  _values: BigNumber[];
}
export type TransferBatchEvent = TypedEvent<
  [string, string, string, BigNumber[], BigNumber[]],
  TransferBatchEventObject
>;

export type TransferBatchEventFilter = TypedEventFilter<TransferBatchEvent>;

export interface TransferSingleEventObject {
  _operator: string;
  _from: string;
  _to: string;
  _id: BigNumber;
  _value: BigNumber;
}
export type TransferSingleEvent = TypedEvent<
  [string, string, string, BigNumber, BigNumber],
  TransferSingleEventObject
>;

export type TransferSingleEventFilter = TypedEventFilter<TransferSingleEvent>;

export interface URIEventObject {
  _value: string;
  _id: BigNumber;
}
export type URIEvent = TypedEvent<[string, BigNumber], URIEventObject>;

export type URIEventFilter = TypedEventFilter<URIEvent>;

export interface AssetRegister extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: AssetRegisterInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    assetCount(overrides?: CallOverrides): Promise<[BigNumber]>;

    assets(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<
      [number, string, string, BigNumber] & {
        tokenType: number;
        contractAddress: string;
        strategy: string;
        tokenId: BigNumber;
      }
    >;

    balanceOf(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    balanceOfBatch(
      owners: PromiseOrValue<string>[],
      ids: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides
    ): Promise<[BigNumber[]] & { balances: BigNumber[] }>;

    ids(
      arg0: PromiseOrValue<BigNumberish>,
      arg1: PromiseOrValue<string>,
      arg2: PromiseOrValue<string>,
      arg3: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    isApprovedForAll(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    registerAsset(
      tokenType: PromiseOrValue<BigNumberish>,
      contractAddress: PromiseOrValue<string>,
      strategy: PromiseOrValue<string>,
      tokenId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    safeBatchTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      ids: PromiseOrValue<BigNumberish>[],
      values: PromiseOrValue<BigNumberish>[],
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    safeTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      id: PromiseOrValue<BigNumberish>,
      value: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setApprovalForAll(
      operator: PromiseOrValue<string>,
      approved: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    supportsInterface(
      interfaceID: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    totalSupply(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    uri(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[string]>;
  };

  assetCount(overrides?: CallOverrides): Promise<BigNumber>;

  assets(
    arg0: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<
    [number, string, string, BigNumber] & {
      tokenType: number;
      contractAddress: string;
      strategy: string;
      tokenId: BigNumber;
    }
  >;

  balanceOf(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  balanceOfBatch(
    owners: PromiseOrValue<string>[],
    ids: PromiseOrValue<BigNumberish>[],
    overrides?: CallOverrides
  ): Promise<BigNumber[]>;

  ids(
    arg0: PromiseOrValue<BigNumberish>,
    arg1: PromiseOrValue<string>,
    arg2: PromiseOrValue<string>,
    arg3: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  isApprovedForAll(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  registerAsset(
    tokenType: PromiseOrValue<BigNumberish>,
    contractAddress: PromiseOrValue<string>,
    strategy: PromiseOrValue<string>,
    tokenId: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  safeBatchTransferFrom(
    from: PromiseOrValue<string>,
    to: PromiseOrValue<string>,
    ids: PromiseOrValue<BigNumberish>[],
    values: PromiseOrValue<BigNumberish>[],
    data: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  safeTransferFrom(
    from: PromiseOrValue<string>,
    to: PromiseOrValue<string>,
    id: PromiseOrValue<BigNumberish>,
    value: PromiseOrValue<BigNumberish>,
    data: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setApprovalForAll(
    operator: PromiseOrValue<string>,
    approved: PromiseOrValue<boolean>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  supportsInterface(
    interfaceID: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  totalSupply(
    arg0: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  uri(
    arg0: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<string>;

  callStatic: {
    assetCount(overrides?: CallOverrides): Promise<BigNumber>;

    assets(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<
      [number, string, string, BigNumber] & {
        tokenType: number;
        contractAddress: string;
        strategy: string;
        tokenId: BigNumber;
      }
    >;

    balanceOf(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    balanceOfBatch(
      owners: PromiseOrValue<string>[],
      ids: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides
    ): Promise<BigNumber[]>;

    ids(
      arg0: PromiseOrValue<BigNumberish>,
      arg1: PromiseOrValue<string>,
      arg2: PromiseOrValue<string>,
      arg3: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isApprovedForAll(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    registerAsset(
      tokenType: PromiseOrValue<BigNumberish>,
      contractAddress: PromiseOrValue<string>,
      strategy: PromiseOrValue<string>,
      tokenId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    safeBatchTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      ids: PromiseOrValue<BigNumberish>[],
      values: PromiseOrValue<BigNumberish>[],
      data: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<void>;

    safeTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      id: PromiseOrValue<BigNumberish>,
      value: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<void>;

    setApprovalForAll(
      operator: PromiseOrValue<string>,
      approved: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<void>;

    supportsInterface(
      interfaceID: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    totalSupply(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    uri(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {
    "ApprovalForAll(address,address,bool)"(
      _owner?: PromiseOrValue<string> | null,
      _operator?: PromiseOrValue<string> | null,
      _approved?: null
    ): ApprovalForAllEventFilter;
    ApprovalForAll(
      _owner?: PromiseOrValue<string> | null,
      _operator?: PromiseOrValue<string> | null,
      _approved?: null
    ): ApprovalForAllEventFilter;

    "AssetRegistered(uint8,address,address,uint256,uint256)"(
      tokenType?: PromiseOrValue<BigNumberish> | null,
      contractAddress?: PromiseOrValue<string> | null,
      strategy?: null,
      tokenId?: PromiseOrValue<BigNumberish> | null,
      assetId?: null
    ): AssetRegisteredEventFilter;
    AssetRegistered(
      tokenType?: PromiseOrValue<BigNumberish> | null,
      contractAddress?: PromiseOrValue<string> | null,
      strategy?: null,
      tokenId?: PromiseOrValue<BigNumberish> | null,
      assetId?: null
    ): AssetRegisteredEventFilter;

    "TransferBatch(address,address,address,uint256[],uint256[])"(
      _operator?: PromiseOrValue<string> | null,
      _from?: PromiseOrValue<string> | null,
      _to?: PromiseOrValue<string> | null,
      _ids?: null,
      _values?: null
    ): TransferBatchEventFilter;
    TransferBatch(
      _operator?: PromiseOrValue<string> | null,
      _from?: PromiseOrValue<string> | null,
      _to?: PromiseOrValue<string> | null,
      _ids?: null,
      _values?: null
    ): TransferBatchEventFilter;

    "TransferSingle(address,address,address,uint256,uint256)"(
      _operator?: PromiseOrValue<string> | null,
      _from?: PromiseOrValue<string> | null,
      _to?: PromiseOrValue<string> | null,
      _id?: null,
      _value?: null
    ): TransferSingleEventFilter;
    TransferSingle(
      _operator?: PromiseOrValue<string> | null,
      _from?: PromiseOrValue<string> | null,
      _to?: PromiseOrValue<string> | null,
      _id?: null,
      _value?: null
    ): TransferSingleEventFilter;

    "URI(string,uint256)"(
      _value?: null,
      _id?: PromiseOrValue<BigNumberish> | null
    ): URIEventFilter;
    URI(
      _value?: null,
      _id?: PromiseOrValue<BigNumberish> | null
    ): URIEventFilter;
  };

  estimateGas: {
    assetCount(overrides?: CallOverrides): Promise<BigNumber>;

    assets(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    balanceOf(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    balanceOfBatch(
      owners: PromiseOrValue<string>[],
      ids: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    ids(
      arg0: PromiseOrValue<BigNumberish>,
      arg1: PromiseOrValue<string>,
      arg2: PromiseOrValue<string>,
      arg3: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isApprovedForAll(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    registerAsset(
      tokenType: PromiseOrValue<BigNumberish>,
      contractAddress: PromiseOrValue<string>,
      strategy: PromiseOrValue<string>,
      tokenId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    safeBatchTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      ids: PromiseOrValue<BigNumberish>[],
      values: PromiseOrValue<BigNumberish>[],
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    safeTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      id: PromiseOrValue<BigNumberish>,
      value: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setApprovalForAll(
      operator: PromiseOrValue<string>,
      approved: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    supportsInterface(
      interfaceID: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    totalSupply(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    uri(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    assetCount(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    assets(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    balanceOf(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    balanceOfBatch(
      owners: PromiseOrValue<string>[],
      ids: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    ids(
      arg0: PromiseOrValue<BigNumberish>,
      arg1: PromiseOrValue<string>,
      arg2: PromiseOrValue<string>,
      arg3: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    isApprovedForAll(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    registerAsset(
      tokenType: PromiseOrValue<BigNumberish>,
      contractAddress: PromiseOrValue<string>,
      strategy: PromiseOrValue<string>,
      tokenId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    safeBatchTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      ids: PromiseOrValue<BigNumberish>[],
      values: PromiseOrValue<BigNumberish>[],
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    safeTransferFrom(
      from: PromiseOrValue<string>,
      to: PromiseOrValue<string>,
      id: PromiseOrValue<BigNumberish>,
      value: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setApprovalForAll(
      operator: PromiseOrValue<string>,
      approved: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    supportsInterface(
      interfaceID: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    totalSupply(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    uri(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
