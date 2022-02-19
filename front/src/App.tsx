import { formatEther } from '@ethersproject/units';
import { useEtherBalance, useEthers } from '@usedapp/core';
import './App.css';
import { Lend } from './components/Lend';
import { TokenBalance } from './components/TokenBalance';
import { usdc, weth } from './deployment';

function App() {
    const { activateBrowserWallet, account } = useEthers();
    const etherBalance = useEtherBalance(account);
    return (
        <div>
            <div>
                <button onClick={() => activateBrowserWallet()}>Connect</button>
            </div>
            {
                account && (
                    <>
                        {account && <p>Account: {account}</p>}
                        {/* {etherBalance && <p>Balance: {formatEther(etherBalance)}</p>} */}
                        <TokenBalance name='WETH' holder={account} tokenAddr={weth.address}/>
                        <TokenBalance name='USDC' holder={account} tokenAddr={usdc.address}/>
                        <div style={{marginTop: 15}}>
                            Lend: WETH
                            <Lend/>
                        </div>
                    </>
                )
            }
        </div>
    );
}

export default App;
