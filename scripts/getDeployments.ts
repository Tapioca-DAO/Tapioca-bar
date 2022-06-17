import hre from 'hardhat';
import { getDeployments } from './getDeployment-script';

async function main() {
    (await getDeployments(hre)).map((e) => console.log(e));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
