# Tapioca Bar🍹 & Mixologist 🤙
## The gist of it

`BeachBar` : Serves as a vault to store assets/collaterals, strategies can later be used on those vaults to yield farm.
* `deposit(uint256 assetId, address from, address to, uint256 amount, uint256 share)` Used to deposit, it’s the first step to enter a market.
* `withdraw(uint256 assetId, address from, address to, uint256 amount, uint256 share, bool withdrawNative)` Used to withdraw asset from `BeachBar` , if the asset if the wrapped native, the last parameter is to decide to unwrap or not the asset.
* `setApprovalForAll(address operator, bool approved)` Used to allow a `Mixologist` market to use the user’s `BeachBar` assets.
* `toShare(uint256 assetId, uint256 amount, roundUp)` Convert from an asset amount to a `BeachBar`  share.
* `toAmount(uint256 assetId, uint256 share, roundUp)` Convert from a `Beachbar` share to an asset amount.
* `amountOf(address user, uint256 assetId)` The amount in underlying token that a user has stored in.
* `balanceOf(address user, uint256 assetId)` The amount of shares a user has.

`Mixologist` : Users can deposit / withdraw from `Beachbar` to `Mixologist` to enter / exit markets.
 * `addCollateral(address to, bool skim, uint256 share)` Users can add collateral from the `Beachbar` deposit to the `Mixologist` market.
* `removeCollateral(address to, uint256 share)`  Users can remove collateral and exit their position, if they are solvent.
* `addAsset(address to, bool skim, uint256 share)` Users can lend `Beachbar` deposited asset with it.
* `removeAsset(address to, uint256 fraction)` Users can exist lending position with this.
* `borrow(address to, uint256 amount)` Users can borrow the lent asset of the market, they need to addCollateral  first.
* `repay(address to, bool skim, uint256 part)` Users can repay their positions with it. Since we’ll have self-repaying loans technically it’s not gonna be used but it’s good to have it.
* `mix(uint8[] calldata actions, uint256[] calldata values, bytes[] calldata datas)` Used to make multiple actions in one Tx.
* `balanceOf(address user)` The balance in fraction unit of a user, we can use `MixologistHelper` to compute the real asset amount.

`MixologistHelper` : A helper contract for `Mixologist` .
* `getCollateralSharesForBorrowPart(Mixologist mixologist, uint256 borrowPart)` Used to compute the amount of shares needed for an amount of asset to be borrowed.
* `getAmountForAssetFraction(Mixologist mixologist, uint256 fraction)` Used to compute the amount of assets based on a fraction. Can be used to get asset amounts from `Mixologist.balanceOf`.