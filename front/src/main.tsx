import { Config, DAppProvider, Rinkeby } from '@usedapp/core';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';



const config: Config = {
    readOnlyChainId: Rinkeby.chainId,
    readOnlyUrls: {
        [Rinkeby.chainId]: 'https://rinkeby.infura.io/v3/388b073a6a1541a1a1dbd83379822cca',
    },
};
ReactDOM.render(
    <React.StrictMode>
        <DAppProvider config={config}>
            <App />
        </DAppProvider>
    </React.StrictMode>,
    document.getElementById('root'),
);
