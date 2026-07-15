// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BatchPay} from "../src/BatchPay.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ReentrantERC20 is ERC20 {
    BatchPay public target;
    address[] internal reentryRecipients;
    uint256[] internal reentryAmounts;
    bool internal attacking;

    constructor() ERC20("Reentrant Token", "REENT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setAttack(
        BatchPay _target,
        address[] memory _recipients,
        uint256[] memory _amounts
    ) external {
        target = _target;
        reentryRecipients = _recipients;
        reentryAmounts = _amounts;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (!attacking && address(target) != address(0)) {
            attacking = true;
            target.airdropERC20(
                address(this),
                reentryRecipients,
                reentryAmounts
            );
            attacking = false;
        }
        return super.transferFrom(from, to, amount);
    }
}

contract BatchPayTest is Test {
    BatchPay public batchPay;
    MockERC20 public token;

    address public sender = makeAddr("sender");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        batchPay = new BatchPay();
        token = new MockERC20();

        token.mint(sender, 1_000_000 ether);
    }

    function test_AirdropERC20_HappyPath() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 ether;
        amounts[1] = 200 ether;

        vm.startPrank(sender);
        token.approve(address(batchPay), 300 ether);
        batchPay.airdropERC20(address(token), recipients, amounts);
        vm.stopPrank();

        assertEq(token.balanceOf(alice), 100 ether);
        assertEq(token.balanceOf(bob), 200 ether);
        assertEq(token.balanceOf(sender), 1_000_000 ether - 300 ether);
    }

    function test_RevertWhen_TokenIsZeroAddress() public {
        address[] memory recipients = new address[](1);
        recipients[0] = alice;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.expectRevert(BatchPay.ZeroAddressToken.selector);
        batchPay.airdropERC20(address(0), recipients, amounts);
    }

    function test_RevertWhen_RecipientListIsEmpty() public {
        address[] memory recipients = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.expectRevert(BatchPay.EmptyRecipientList.selector);
        batchPay.airdropERC20(address(token), recipients, amounts);
    }

    function test_RevertWhen_ArrayLengthsMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.expectRevert(BatchPay.ArrayLengthMismatch.selector);
        batchPay.airdropERC20(address(token), recipients, amounts);
    }

    function test_RevertWhen_RecipientIsZeroAddress() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.expectRevert(BatchPay.ZeroAddressRecipient.selector);
        batchPay.airdropERC20(address(token), recipients, amounts);
    }

    function test_RevertWhen_AllowanceIsInsufficient() public {
        address[] memory recipients = new address[](1);
        recipients[0] = alice;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.startPrank(sender);
        token.approve(address(batchPay), 50 ether); // less than the 100 ether needed
        vm.expectRevert();
        batchPay.airdropERC20(address(token), recipients, amounts);
        vm.stopPrank();
    }

    function test_RevertWhen_BalanceIsInsufficient() public {
        address poorSender = makeAddr("poorSender");
        token.mint(poorSender, 10 ether); // less than the 100 ether we'll try to send

        address[] memory recipients = new address[](1);
        recipients[0] = alice;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        vm.startPrank(poorSender);
        token.approve(address(batchPay), 100 ether); // allowance is fine, balance isn't
        vm.expectRevert();
        batchPay.airdropERC20(address(token), recipients, amounts);
        vm.stopPrank();
    }

    function testFuzz_AirdropERC20_HappyPath(
        uint8 recipientCount,
        uint256 amountSeed
    ) public {
        uint256 count = bound(recipientCount, 1, 50);

        address[] memory recipients = new address[](count);
        uint256[] memory amounts = new uint256[](count);

        uint256 totalAmount;

        for (uint256 i = 0; i < count; i++) {
            recipients[i] = makeAddr(string(abi.encodePacked("recipient", i)));
            uint256 amount = bound(
                uint256(keccak256(abi.encode(amountSeed, i))),
                1,
                1_000 ether
            );
            amounts[i] = amount;
            totalAmount += amount;
        }

        token.mint(sender, totalAmount);

        vm.startPrank(sender);
        token.approve(address(batchPay), totalAmount);
        batchPay.airdropERC20(address(token), recipients, amounts);
        vm.stopPrank();

        for (uint256 i = 0; i < count; i++) {
            assertEq(token.balanceOf(recipients[i]), amounts[i]);
        }
    }

    function test_Gas_Airdrop_1Recipient() public {
        _runGasBenchmark(1);
    }

    function test_Gas_Airdrop_5Recipients() public {
        _runGasBenchmark(5);
    }

    function test_Gas_Airdrop_10Recipients() public {
        _runGasBenchmark(10);
    }

    function test_Gas_Airdrop_50Recipients() public {
        _runGasBenchmark(50);
    }

    function _runGasBenchmark(uint256 count) internal {
        address[] memory recipients = new address[](count);
        uint256[] memory amounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            recipients[i] = makeAddr(
                string(abi.encodePacked("gasRecipient", i))
            );
            amounts[i] = 1 ether;
        }

        vm.startPrank(sender);
        token.approve(address(batchPay), count * 1 ether);
        batchPay.airdropERC20(address(token), recipients, amounts);
        vm.stopPrank();
    }

    function test_ReentrancyAttempt_RevertsEntireTransaction() public {
        ReentrantERC20 evilToken = new ReentrantERC20();
        evilToken.mint(sender, 1_000 ether);

        address[] memory recipients = new address[](1);
        recipients[0] = alice;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 50 ether;

        evilToken.setAttack(batchPay, recipients, amounts);

        vm.startPrank(sender);
        evilToken.approve(address(batchPay), 1_000 ether);

        vm.expectRevert();
        batchPay.airdropERC20(address(evilToken), recipients, amounts);
        vm.stopPrank();

        // Nothing should have moved — the whole transaction reverted atomically
        assertEq(evilToken.balanceOf(alice), 0);
        assertEq(evilToken.balanceOf(sender), 1_000 ether);
    }
}
