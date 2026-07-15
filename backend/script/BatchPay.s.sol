// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BatchPay} from "../src/BatchPay.sol";

contract DeployBatchPay is Script {
    function run() external returns (BatchPay) {
        vm.startBroadcast();
        BatchPay batchPay = new BatchPay();
        vm.stopBroadcast();

        console.log("BatchPay deployed at:", address(batchPay));
        return batchPay;
    }
}