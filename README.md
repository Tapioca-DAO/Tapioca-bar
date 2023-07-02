# Tapioca Bar🍹 & Singularity 🤙
# Full testnet deployment

Host chain is `arbitrum_goerli`

Some args are not needed within the CLI as it'll be asked live within the task execution

  

Note: make sure to get the latest deployments for tapioca-sdk by executing:

```plain
git submodule update --init
```

  

**Deployment steps \[UPDATED\]:**

1. use `tapioca-mocks`to deploy WETHMock token on all chains
    1. npx hardhat deployERC20Mock --network goerli --save
2. use `tapioca-mocks` to deploy "native" tokens for each chain (WETH for goerli, ARB for arbitrum, MATIC for mumbai, AVAX for fuji, BNB for bsc testnet)
    1. `npx hardhat deployERC20Mock --network goerli --save`
3. use `tap-token` to deploy TapOFT and export it to the SDK
    1. `npx hardhat deployTapOFT --network arbitrum_goerli`
    2. `npx hardhat exportSDK` (make sure to first do a git pull on the submodule folder)
4. use tap-token
    1. `npx hardhat setLZConfig --network <each network>`
        1. for TapOFT
5. use Tapioca-bar
    1. `npx hardhat deployFullStack --network arbitrum_goerli`
    2. `npx hardhat deployLinkedChainStack --network <everything else>`
    3. `npx hardhat setLZConfig --network <each network>`
        1. for each token
6. use TapiocaZ to deploy TapiocaWrapper to each chain
    1. `npx hardhat deployTapiocaWrapper --network arbitrum_goerli`
7. use TapiocaZ to deploy TOFT to each chain + linked TOFTs
    1. `npx hardhat deployTOFT --network`
    2. `npx hardhat setLZConfig --is-toft --network` for each TOFT, for each chain
8. deploy strategies for YB asset registration (for host chain, no need to deploy for USDO and Tap as these 2 are already registered from previous deployments)
    1. `npx hardhat deployEmptyStrats --type 0 --network` , for each chain, for each token
    2. `npx hardhat deployEmptyStrats --type 1 --network` , for each chain, for each token
    3. `npx hardhat deployEmptyStrats --type 2 --network` , for each chain, for each token
9. register YB assets on Tapioca-bar by using `npx hardhat registerYbAssets --network`
10. deploy SGL market on Tapioca-bar by using `npx hardhat deploySGLMarket --network`

  

## Big Bang markets

1. deploy empty strategy for the token you want to use `npx hardhat deployEmptyStrateg --type 3 --network arbitrum_goerli`
2. register yb asset
3. deploy BB `npx hardhat deployBigBangMarket --network arbitrum_goerli`

  

## TapOFT/twAML

  

1. Use `tap-token` repo
    1. `hh deployStack --network arbitrum_goerli` to deploy the entire stack on the native chain
    2. `hh deployTapOFT --network fuji_avalanche` for linked chain