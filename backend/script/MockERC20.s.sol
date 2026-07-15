// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract DeployMockERC20 is Script {
    function run() external returns (MockERC20) {
        vm.startBroadcast();
        MockERC20 token = new MockERC20();
        token.mint(msg.sender, 1_000_000 ether);
        vm.stopBroadcast();

        console.log("MockERC20 deployed at:", address(token));
        console.log("Minted 1,000,000 mUSDC to:", msg.sender);
        return token;
    }
}
