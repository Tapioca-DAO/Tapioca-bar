import { formatUnits } from '@ethersproject/units';
import { useEthers, useTokenBalance } from '@usedapp/core';

interface Props{
    name:string
    holder:string
    tokenAddr:string
}

export function TokenBalance(props:Props) {
    const tokenBalance = useTokenBalance(props.tokenAddr, props.holder);

    return (
        <div>
            {props.name}{' '}
            {tokenBalance && `${formatUnits(tokenBalance, 18)}`}
        </div>
    );
}