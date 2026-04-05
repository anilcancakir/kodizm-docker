.PHONY: docker-lint docker-build docker-test-static docker-test-runtime docker-test docker-all

IMAGE_TAG ?= kodizm-agent:dev

docker-lint:
	docker run --rm -i hadolint/hadolint < docker/Dockerfile

docker-build:
	docker build -t $(IMAGE_TAG) docker/

docker-test-static: docker-build
	container-structure-test test \
		--image $(IMAGE_TAG) \
		--config docker/tests/structure-test.yaml

docker-test-runtime: docker-build
	cd docker/tests && GOSS_WAIT_OPTS="-r 30s -s 1s" \
		dgoss run $(IMAGE_TAG) bash -c "sleep 120"

docker-test: docker-test-static docker-test-runtime

docker-all: docker-lint docker-build docker-test
