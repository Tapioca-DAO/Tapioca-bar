import React from 'react';
import { useEthers, useCall, useContractFunction, useSendTransaction } from '@usedapp/core';
import { signDaiPermit } from 'eth-permit';
import { usdc, bar, weth, mixologist } from '../deployment';
import { Contract, ethers } from 'ethers';


export const useWethContract = ()=> new ethers.Contract(weth.address, weth.abi);
export const useUsdcContract = ()=> new ethers.Contract(usdc.address, usdc.abi);
export const useBarContract = ()=> new ethers.Contract(bar.address, bar.abi);
export const useMixologistContract = ()=> new ethers.Contract(mixologist.address, mixologist.abi);

export const useWethApprove = () =>{
    const {send} = useContractFunction(useWethContract(), 'approve');

    return () => send(bar.address, ethers.constants.MaxUint256);
};

export const useUsdcApprove = () =>{
    const {send} = useContractFunction(useUsdcContract(), 'approve');

    return () => send(bar.address, ethers.constants.MaxUint256);
};

export const useSetApprovalForAll = () =>{
    const {send} = useContractFunction(useBarContract(), 'setApprovalForAll');

    return () => send(mixologist.address, true);
};

export const useContractView = (contract:Contract, method:string, args:any[]) =>{
    const {account} = useEthers();
    const res = useCall(contract.address && account &&  {
        contract,
        method,
        args,
    });
    if(res?.error ||res?.value?.[0] === undefined){
        return;
    }
    return res?.value;
};


export const useIsWethApproved = () =>{
    const {account} = useEthers();
    const res = useContractView(useWethContract(), 'allowance', [account ?? '', bar.address]);

    return res?.[0]  && ethers.BigNumber.from(res?.[0] ?? 0).gt(0);
};

export const useIsUsdcApproved = () =>{
    const {account} = useEthers();
    const res = useContractView(useUsdcContract(), 'allowance', [account ?? '', bar.address]);

    return res?.[0]  && ethers.BigNumber.from(res?.[0]).gt(0);
};


export const useIsMixologistApproved = () =>{
    const {account} = useEthers();
    const res = useContractView(useBarContract(), 'isApprovedForAll', [account ?? '', mixologist.address]);

    return res?.[0];
};

export const useContractApprovals = () =>{
    const isWethApproved = useIsWethApproved();
    const isUsdcApproved = useIsUsdcApproved();
    const isMixologistApproved = useIsMixologistApproved();
    const isAllApproved = isMixologistApproved && isMixologistApproved && isMixologistApproved;

    console.log({isMixologistApproved});

    const approveWeth = useWethApprove();
    const approveUsdc = useUsdcApprove();
    const setApprovalMixologist = useSetApprovalForAll();

    return {isAllApproved, isWethApproved, isUsdcApproved, isMixologistApproved, approveWeth, approveUsdc, setApprovalMixologist};

};

export const useGetAssetId = () =>{
    const res = useContractView(useMixologistContract(), 'assetId', []);
    return res?.[0];
};

export const useGetCollateralId = () =>{
    const res = useContractView(useMixologistContract(), 'collateralId', []);
    return res?.[0];
};

export const useToShare = (amount:any, assetId:number) =>{
    const res = useContractView(useBarContract(), 'toShare', [assetId, amount, false]);
    return res?.[0];
};

export const useDepositAsset = (amount:any) =>{
    const {account} = useEthers();
    const {send: barDeposit} = useContractFunction(useBarContract(), 'deposit');

    const assetId = useGetAssetId();
    const shares = useToShare(amount, assetId);
    return () => barDeposit(assetId, account, account, 0, shares);
};

export const useLendAsset = (amount:any) =>{
    const {account} = useEthers();
    const {send: mixologistDeposit} = useContractFunction(useMixologistContract(), 'addAsset');

    const assetId = useGetAssetId();
    const shares = useToShare(amount, assetId);
    return () => mixologistDeposit( account, false, shares);
};

export const useViewAssetInBar = () =>{
    const {account} = useEthers();
    const res = useContractView(useBarContract(), 'balanceOf', [account, useGetAssetId()]);
    return ethers.utils.formatEther(res?.[0] ?? 0);
};

export const useViewAssetLend= () =>{
    const {account} = useEthers();
    const res = useContractView(useMixologistContract(), 'balanceOf', [account]);
    return ethers.utils.formatEther(res?.[0] ?? 0);
};