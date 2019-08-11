.PHONY: test

all: lint test

test:
	npm run test

test-watch:
	npm run test -- --watch

lint:
	npm run check

dev-server:
	node_modules/webpack-dev-server/bin/webpack-dev-server.js

install-deps:
	npm install
