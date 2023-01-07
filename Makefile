fix:
	npx eslint --fix .

compile-oracle:
	cd oracle && npx truffle compile

compile-caller:
	cd caller && npx truffle compile

truffle-compile: compile-caller compile-oracle
