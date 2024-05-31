import '@nomiclabs/hardhat-ethers';
import { scope } from 'hardhat/config';
import { TAP_TASK } from 'tapioca-sdk';
import { misc__sandbox__task } from 'tasks/misc/misc__sandbox__task';

const miscScope = scope('misc', 'misc tasks');

TAP_TASK(
    miscScope.task(
        'sandbox',
        'A sandbox task to test things out',
        misc__sandbox__task,
    ),
);
