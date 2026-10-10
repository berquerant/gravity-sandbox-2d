# -----------------------------------------------------------------------------
# Gravity Sandbox 2D - Development Tasks
# -----------------------------------------------------------------------------

PORT ?= 8000
SHELL := /bin/bash

# JavaScript source files
JS_FILES := $(shell find src scripts -name '*.js' | sort)

.PHONY: help
help: ## Display available commands
	@echo "Gravity Sandbox 2D - Development Tasks"
	@echo "--------------------------------------------------"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo "--------------------------------------------------"
	@echo "Example: make serve PORT=8080"

.PHONY: serve
serve: ## Start local HTTP server (default port: 8000)
	@node scripts/serve.js $(PORT)


.PHONY: dev
dev: serve ## Alias for serve

.PHONY: check
check: lint ## Run syntax validation (alias for lint)

.PHONY: lint
lint: ## Validate syntax of all JavaScript files
	@echo "Validating JavaScript syntax..."
	@node -c $(JS_FILES) && echo "✅ No syntax errors found in any module."

.PHONY: test
test: lint ## Run unit tests (node --test) and syntax validation
	@echo "Running unit tests..."
	@node --test tests/**/*.test.js
	@echo "✅ All tests and syntax validation passed"

.PHONY: stats
stats: ## Count lines of code and file statistics
	@echo "=== Line Count Statistics ==="
	@wc -l index.html css/style.css $(JS_FILES) | sort -nr
	@echo ""
	@echo "=== File Composition ==="
	@echo "JS Files: $$(ls -1 src/**/*.js | wc -l | tr -d ' ')"
	@echo "CSS Files: $$(ls -1 css/*.css | wc -l | tr -d ' ')"

.PHONY: clean
clean: ## Remove temporary files and caches
	@echo "Cleaning up..."
	@find . -name ".DS_Store" -delete
	@find . -name "*~" -delete
	@echo "✅ Clean completed"
