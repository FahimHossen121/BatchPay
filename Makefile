# BatchPay — local dev automation
# Run `make help` to see available commands.

ACCOUNT := anvilAccount
SENDER := 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
RPC_URL := http://127.0.0.1:8545
ANVIL_LOG := /tmp/batchpay-anvil.log
ANVIL_PID_FILE := /tmp/batchpay-anvil.pid

.PHONY: help anvil-start anvil-stop deploy test up down frontend clean-artifacts

help:
	@echo "make up              - start Anvil + deploy both contracts (main command)"
	@echo "make down            - stop the background Anvil node"
	@echo "make test            - run the Foundry test suite"
	@echo "make frontend        - start the Next.js dev server"
	@echo "make deploy          - redeploy BatchPay + MockERC20 (Anvil must already be running)"
	@echo "make clean-artifacts - forge clean, clears stale build warnings"

anvil-start:
	@if [ -f $(ANVIL_PID_FILE) ] && kill -0 $$(cat $(ANVIL_PID_FILE)) 2>/dev/null; then \
		echo "Anvil already running (PID $$(cat $(ANVIL_PID_FILE)))"; \
	else \
		echo "Starting Anvil in background, logging to $(ANVIL_LOG)..."; \
		nohup anvil > $(ANVIL_LOG) 2>&1 & echo $$! > $(ANVIL_PID_FILE); \
		sleep 2; \
		echo "Anvil started (PID $$(cat $(ANVIL_PID_FILE)))"; \
	fi

anvil-stop:
	@if [ -f $(ANVIL_PID_FILE) ]; then \
		kill $$(cat $(ANVIL_PID_FILE)) 2>/dev/null || true; \
		rm -f $(ANVIL_PID_FILE); \
		echo "Anvil stopped."; \
	else \
		echo "No Anvil PID file found — is it running?"; \
	fi

deploy:
	@echo "Deploying BatchPay (you'll be prompted for your keystore password)..."
	@cd backend && forge script script/BatchPay.s.sol \
		--rpc-url $(RPC_URL) \
		--broadcast \
		--account $(ACCOUNT) \
		--sender $(SENDER)
	@echo ""
	@echo "Deploying MockERC20 (password prompt again — Foundry doesn't cache it across script runs)..."
	@cd backend && forge script script/MockERC20.s.sol \
		--rpc-url $(RPC_URL) \
		--broadcast \
		--account $(ACCOUNT) \
		--sender $(SENDER)

test:
	@cd backend && forge test

clean-artifacts:
	@cd backend && forge clean

up: anvil-start deploy test
	@echo ""
	@echo "=================================================="
	@echo "Anvil running (PID in $(ANVIL_PID_FILE), logs in $(ANVIL_LOG))"
	@echo "Contracts deployed — see addresses above."
	@echo "Run 'make frontend' next to start the Next.js dev server."
	@echo "Run 'make down' when you're done to stop Anvil."
	@echo "=================================================="

down: anvil-stop

frontend:
	@cd front