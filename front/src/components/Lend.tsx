import { useEthers } from '@usedapp/core';
import { ethers } from 'ethers';
import React from 'react';
import { usdc, weth } from '../deployment';
import { useContractApprovals, useDepositAsset, useLendAsset, useViewAssetInBar, useViewAssetLend } from '../hooks/utils';
import { TokenBalance } from './TokenBalance';


export  function Lend() {
    const [lendValue, setLendValue] = React.useState(0);
    const { account } = useEthers();
    
    const {approveUsdc, approveWeth, isMixologistApproved, isUsdcApproved,
        isWethApproved, setApprovalMixologist, isAllApproved} = useContractApprovals();
    
    const depositAsset = useDepositAsset(ethers.BigNumber.from(1e18.toString()).mul(lendValue));
    const lendAsset = useLendAsset(ethers.BigNumber.from(1e18.toString()).mul(lendValue));

    const assetInBar = useViewAssetInBar();
    const assetInMixologist = useViewAssetLend();

    const onClickDeposit = async ()=>{
        if(isAllApproved){
            console.log('deposit');
            
            depositAsset();
        }
    };

    const onClickLend = async ()=>{
        if(isAllApproved){
            lendAsset();
        }
    };
    
    const onClickApprove = async (type: 'weth'|'usdc'|'mixologist') => {
        if(type==='weth') approveWeth();
        else if(type === 'usdc') approveUsdc();
        else if(type==='mixologist')setApprovalMixologist();
    };
    console.log(isAllApproved);

    return isAllApproved !== undefined && account ?(
        <div>
            <TokenBalance name='Total WETH in Bar: ' holder={account} tokenAddr={weth.address}/>
            {
                isAllApproved ? (
                    <>
                        <input type="text" onChange={(e)=>setLendValue(Number(e.target.value))} />
                        <input type="button" onClick={onClickDeposit} value="Deposit"/>
                        <input type="button" onClick={onClickLend} value="Lend"/>
                    </>
                ) : (
                    <>
                        {!isWethApproved && <input type="button" onClick={()=>onClickApprove('weth')} value="Approve WETH"/>}
                        {!isUsdcApproved && <input type="button" onClick={()=>onClickApprove('usdc')} value="Approve USDC"/>}
                        {!isMixologistApproved && <input type="button" onClick={()=>onClickApprove('mixologist')} value="Approve Mixologist"/>}
                    </>
                )
            }
            <div style={{marginTop: 10}}>My deposited WETH in Bar: {assetInBar}</div>
            <div>My lent asset in Mixologist: {assetInMixologist}</div>
        </div>
    ) : null;
}