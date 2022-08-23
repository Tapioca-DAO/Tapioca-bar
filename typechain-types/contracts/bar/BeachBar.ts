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
  PayableOverrides,
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

export interface BeachBarInterface extends utils.Interface {
  functions: {
    "claimOwnership()": FunctionFragment;
    "executeMixologistFn(address[],bytes[])": FunctionFragment;
    "feeTo()": FunctionFragment;
    "feeVeTap()": FunctionFragment;
    "masterContractLength()": FunctionFragment;
    "masterContracts(uint256)": FunctionFragment;
    "owner()": FunctionFragment;
    "pendingOwner()": FunctionFragment;
    "registerMasterContract(address,uint8)": FunctionFragment;
    "registerMixologist(address,bytes,bool)": FunctionFragment;
    "setFeeTo(address)": FunctionFragment;
    "setFeeVeTap(address)": FunctionFragment;
    "setSwapper(address,bool)": FunctionFragment;
    "swappers(address)": FunctionFragment;
    "tapAssetId()": FunctionFragment;
    "tapToken()": FunctionFragment;
    "tapiocaMarkets()": FunctionFragment;
    "transferOwnership(address,bool,bool)": FunctionFragment;
    "withdrawAllProtocolFees(address[])": FunctionFragment;
    "yieldBox()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "claimOwnership"
      | "executeMixologistFn"
      | "feeTo"
      | "feeVeTap"
      | "masterContractLength"
      | "masterContracts"
      | "owner"
      | "pendingOwner"
      | "registerMasterContract"
      | "registerMixologist"
      | "setFeeTo"
      | "setFeeVeTap"
      | "setSwapper"
      | "swappers"
      | "tapAssetId"
      | "tapToken"
      | "tapiocaMarkets"
      | "transferOwnership"
      | "withdrawAllProtocolFees"
      | "yieldBox"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "claimOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "executeMixologistFn",
    values: [PromiseOrValue<string>[], PromiseOrValue<BytesLike>[]]
  ): string;
  encodeFunctionData(functionFragment: "feeTo", values?: undefined): string;
  encodeFunctionData(functionFragment: "feeVeTap", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "masterContractLength",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "masterContracts",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "pendingOwner",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "registerMasterContract",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "registerMixologist",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<boolean>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "setFeeTo",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "setFeeVeTap",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "setSwapper",
    values: [PromiseOrValue<string>, PromiseOrValue<boolean>]
  ): string;
  encodeFunctionData(
    functionFragment: "swappers",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "tapAssetId",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "tapToken", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "tapiocaMarkets",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<boolean>,
      PromiseOrValue<boolean>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawAllProtocolFees",
    values: [PromiseOrValue<string>[]]
  ): string;
  encodeFunctionData(functionFragment: "yieldBox", values?: undefined): string;

  decodeFunctionResult(
    functionFragment: "claimOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "executeMixologistFn",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "feeTo", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "feeVeTap", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "masterContractLength",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "masterContracts",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "pendingOwner",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "registerMasterContract",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "registerMixologist",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setFeeTo", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setFeeVeTap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setSwapper", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "swappers", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "tapAssetId", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "tapToken", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "tapiocaMarkets",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawAllProtocolFees",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "yieldBox", data: BytesLike): Result;

  events: {
    "FeeToUpdate(address)": EventFragment;
    "FeeVeTapUpdate(address)": EventFragment;
    "OwnershipTransferred(address,address)": EventFragment;
    "ProtocolWithdrawal(address[],uint256)": EventFragment;
    "RegisterMasterContract(address,uint8)": EventFragment;
    "RegisterMixologist(address,address)": EventFragment;
    "SwapperUpdate(address,bool)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "FeeToUpdate"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "FeeVeTapUpdate"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "OwnershipTransferred"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ProtocolWithdrawal"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RegisterMasterContract"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RegisterMixologist"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SwapperUpdate"): EventFragment;
}

export interface FeeToUpdateEventObject {
  newFeeTo: string;
}
export type FeeToUpdateEvent = TypedEvent<[string], FeeToUpdateEventObject>;

export type FeeToUpdateEventFilter = TypedEventFilter<FeeToUpdateEvent>;

export interface FeeVeTapUpdateEventObject {
  newFeeVeTap: string;
}
export type FeeVeTapUpdateEvent = TypedEvent<
  [string],
  FeeVeTapUpdateEventObject
>;

export type FeeVeTapUpdateEventFilter = TypedEventFilter<FeeVeTapUpdateEvent>;

export interface OwnershipTransferredEventObject {
  previousOwner: string;
  newOwner: string;
}
export type OwnershipTransferredEvent = TypedEvent<
  [string, string],
  OwnershipTransferredEventObject
>;

export type OwnershipTransferredEventFilter =
  TypedEventFilter<OwnershipTransferredEvent>;

export interface ProtocolWithdrawalEventObject {
  markets: string[];
  timestamp: BigNumber;
}
export type ProtocolWithdrawalEvent = TypedEvent<
  [string[], BigNumber],
  ProtocolWithdrawalEventObject
>;

export type ProtocolWithdrawalEventFilter =
  TypedEventFilter<ProtocolWithdrawalEvent>;

export interface RegisterMasterContractEventObject {
  location: string;
  risk: number;
}
export type RegisterMasterContractEvent = TypedEvent<
  [string, number],
  RegisterMasterContractEventObject
>;

export type RegisterMasterContractEventFilter =
  TypedEventFilter<RegisterMasterContractEvent>;

export interface RegisterMixologistEventObject {
  location: string;
  masterContract: string;
}
export type RegisterMixologistEvent = TypedEvent<
  [string, string],
  RegisterMixologistEventObject
>;

export type RegisterMixologistEventFilter =
  TypedEventFilter<RegisterMixologistEvent>;

export interface SwapperUpdateEventObject {
  swapper: string;
  isRegistered: boolean;
}
export type SwapperUpdateEvent = TypedEvent<
  [string, boolean],
  SwapperUpdateEventObject
>;

export type SwapperUpdateEventFilter = TypedEventFilter<SwapperUpdateEvent>;

export interface BeachBar extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: BeachBarInterface;

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
    claimOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    executeMixologistFn(
      mc: PromiseOrValue<string>[],
      data: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    feeTo(overrides?: CallOverrides): Promise<[string]>;

    feeVeTap(overrides?: CallOverrides): Promise<[string]>;

    masterContractLength(overrides?: CallOverrides): Promise<[BigNumber]>;

    masterContracts(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[string, number] & { location: string; risk: number }>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    pendingOwner(overrides?: CallOverrides): Promise<[string]>;

    registerMasterContract(
      mcAddress: PromiseOrValue<string>,
      contractType_: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    registerMixologist(
      mc: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      useCreate2: PromiseOrValue<boolean>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setFeeTo(
      feeTo_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setFeeVeTap(
      feeVeTap_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setSwapper(
      swapper: PromiseOrValue<string>,
      enable: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    swappers(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    tapAssetId(overrides?: CallOverrides): Promise<[BigNumber]>;

    tapToken(overrides?: CallOverrides): Promise<[string]>;

    tapiocaMarkets(
      overrides?: CallOverrides
    ): Promise<[string[]] & { markets: string[] }>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      direct: PromiseOrValue<boolean>,
      renounce: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    withdrawAllProtocolFees(
      swappers_: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    yieldBox(overrides?: CallOverrides): Promise<[string]>;
  };

  claimOwnership(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  executeMixologistFn(
    mc: PromiseOrValue<string>[],
    data: PromiseOrValue<BytesLike>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  feeTo(overrides?: CallOverrides): Promise<string>;

  feeVeTap(overrides?: CallOverrides): Promise<string>;

  masterContractLength(overrides?: CallOverrides): Promise<BigNumber>;

  masterContracts(
    arg0: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<[string, number] & { location: string; risk: number }>;

  owner(overrides?: CallOverrides): Promise<string>;

  pendingOwner(overrides?: CallOverrides): Promise<string>;

  registerMasterContract(
    mcAddress: PromiseOrValue<string>,
    contractType_: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  registerMixologist(
    mc: PromiseOrValue<string>,
    data: PromiseOrValue<BytesLike>,
    useCreate2: PromiseOrValue<boolean>,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setFeeTo(
    feeTo_: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setFeeVeTap(
    feeVeTap_: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setSwapper(
    swapper: PromiseOrValue<string>,
    enable: PromiseOrValue<boolean>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  swappers(
    arg0: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  tapAssetId(overrides?: CallOverrides): Promise<BigNumber>;

  tapToken(overrides?: CallOverrides): Promise<string>;

  tapiocaMarkets(overrides?: CallOverrides): Promise<string[]>;

  transferOwnership(
    newOwner: PromiseOrValue<string>,
    direct: PromiseOrValue<boolean>,
    renounce: PromiseOrValue<boolean>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  withdrawAllProtocolFees(
    swappers_: PromiseOrValue<string>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  yieldBox(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    claimOwnership(overrides?: CallOverrides): Promise<void>;

    executeMixologistFn(
      mc: PromiseOrValue<string>[],
      data: PromiseOrValue<BytesLike>[],
      overrides?: CallOverrides
    ): Promise<
      [boolean[], string[]] & { success: boolean[]; result: string[] }
    >;

    feeTo(overrides?: CallOverrides): Promise<string>;

    feeVeTap(overrides?: CallOverrides): Promise<string>;

    masterContractLength(overrides?: CallOverrides): Promise<BigNumber>;

    masterContracts(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[string, number] & { location: string; risk: number }>;

    owner(overrides?: CallOverrides): Promise<string>;

    pendingOwner(overrides?: CallOverrides): Promise<string>;

    registerMasterContract(
      mcAddress: PromiseOrValue<string>,
      contractType_: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    registerMixologist(
      mc: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      useCreate2: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<string>;

    setFeeTo(
      feeTo_: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    setFeeVeTap(
      feeVeTap_: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    setSwapper(
      swapper: PromiseOrValue<string>,
      enable: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<void>;

    swappers(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    tapAssetId(overrides?: CallOverrides): Promise<BigNumber>;

    tapToken(overrides?: CallOverrides): Promise<string>;

    tapiocaMarkets(overrides?: CallOverrides): Promise<string[]>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      direct: PromiseOrValue<boolean>,
      renounce: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<void>;

    withdrawAllProtocolFees(
      swappers_: PromiseOrValue<string>[],
      overrides?: CallOverrides
    ): Promise<void>;

    yieldBox(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    "FeeToUpdate(address)"(newFeeTo?: null): FeeToUpdateEventFilter;
    FeeToUpdate(newFeeTo?: null): FeeToUpdateEventFilter;

    "FeeVeTapUpdate(address)"(newFeeVeTap?: null): FeeVeTapUpdateEventFilter;
    FeeVeTapUpdate(newFeeVeTap?: null): FeeVeTapUpdateEventFilter;

    "OwnershipTransferred(address,address)"(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null
    ): OwnershipTransferredEventFilter;
    OwnershipTransferred(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null
    ): OwnershipTransferredEventFilter;

    "ProtocolWithdrawal(address[],uint256)"(
      markets?: null,
      timestamp?: null
    ): ProtocolWithdrawalEventFilter;
    ProtocolWithdrawal(
      markets?: null,
      timestamp?: null
    ): ProtocolWithdrawalEventFilter;

    "RegisterMasterContract(address,uint8)"(
      location?: null,
      risk?: null
    ): RegisterMasterContractEventFilter;
    RegisterMasterContract(
      location?: null,
      risk?: null
    ): RegisterMasterContractEventFilter;

    "RegisterMixologist(address,address)"(
      location?: null,
      masterContract?: null
    ): RegisterMixologistEventFilter;
    RegisterMixologist(
      location?: null,
      masterContract?: null
    ): RegisterMixologistEventFilter;

    "SwapperUpdate(address,bool)"(
      swapper?: null,
      isRegistered?: null
    ): SwapperUpdateEventFilter;
    SwapperUpdate(
      swapper?: null,
      isRegistered?: null
    ): SwapperUpdateEventFilter;
  };

  estimateGas: {
    claimOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    executeMixologistFn(
      mc: PromiseOrValue<string>[],
      data: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    feeTo(overrides?: CallOverrides): Promise<BigNumber>;

    feeVeTap(overrides?: CallOverrides): Promise<BigNumber>;

    masterContractLength(overrides?: CallOverrides): Promise<BigNumber>;

    masterContracts(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    pendingOwner(overrides?: CallOverrides): Promise<BigNumber>;

    registerMasterContract(
      mcAddress: PromiseOrValue<string>,
      contractType_: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    registerMixologist(
      mc: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      useCreate2: PromiseOrValue<boolean>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setFeeTo(
      feeTo_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setFeeVeTap(
      feeVeTap_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setSwapper(
      swapper: PromiseOrValue<string>,
      enable: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    swappers(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    tapAssetId(overrides?: CallOverrides): Promise<BigNumber>;

    tapToken(overrides?: CallOverrides): Promise<BigNumber>;

    tapiocaMarkets(overrides?: CallOverrides): Promise<BigNumber>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      direct: PromiseOrValue<boolean>,
      renounce: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    withdrawAllProtocolFees(
      swappers_: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    yieldBox(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    claimOwnership(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    executeMixologistFn(
      mc: PromiseOrValue<string>[],
      data: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    feeTo(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    feeVeTap(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    masterContractLength(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    masterContracts(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    pendingOwner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    registerMasterContract(
      mcAddress: PromiseOrValue<string>,
      contractType_: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    registerMixologist(
      mc: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      useCreate2: PromiseOrValue<boolean>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setFeeTo(
      feeTo_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setFeeVeTap(
      feeVeTap_: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setSwapper(
      swapper: PromiseOrValue<string>,
      enable: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    swappers(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    tapAssetId(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    tapToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    tapiocaMarkets(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    transferOwnership(
      newOwner: PromiseOrValue<string>,
      direct: PromiseOrValue<boolean>,
      renounce: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    withdrawAllProtocolFees(
      swappers_: PromiseOrValue<string>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    yieldBox(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
