import { exportSDK } from './exportSDK';

exportSDK(true)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
