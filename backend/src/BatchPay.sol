// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BatchPay {
    using SafeERC20 for IERC20;

    error ArrayLengthMismatch();
    error EmptyRecipientList();
    error ZeroAddressRecipient();
    error ZeroAddressToken();

    event Airdropped(
        address indexed sender,
        address indexed token,
        uint256 recipientCount,
        uint256 totalAmount
    );

    function airdropERC20(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        if (token == address(0)) revert ZeroAddressToken();
        if (recipients.length == 0) revert EmptyRecipientList();
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();

        uint256 totalAmount;

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddressRecipient();

            totalAmount += amounts[i];

            IERC20(token).safeTransferFrom(msg.sender, recipients[i], amounts[i]);
        }

        emit Airdropped(msg.sender, token, recipients.length, totalAmount);
    }
}