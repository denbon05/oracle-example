ITEMS = oracle caller

ci:
	npm ci

fix:
	npx eslint --fix .

compile-oracle:
	cd oracle && npx truffle compile

compile-caller:
	cd caller && npx truffle compile

generate-keys:
	for name in $(ITEMS); do \
		node scripts/gen-key.js "$$name"/"$$name"_private_key; \
	done

deploy-oracle:
	cd oracle && npx truffle migrate --network extdev --reset -all

deploy-caller:
	cd caller && npx truffle migrate --network extdev --reset -all

deploy-all: deploy-oracle deploy-caller

truffle-compile: compile-caller compile-oracle

start-oracle:
	npm run start-oracle

start-client:
	npm run start-client

# Dev

dev:
	npm run dev

deploy-ganche:
	for name in $(ITEMS); do \
		cd $$name && npx truffle migrate --network development --reset -all; \
	done
