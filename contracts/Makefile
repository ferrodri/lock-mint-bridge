-include .env

.PHONY: Deploy

Deploy :; @forge clean && forge script script/Deploy.s.sol:Deploy --private-key ${PRIVATE_KEY} --broadcast -vvvv --slow --multi --verify --etherscan-api-key ${ETHERSCAN_API_KEY}
