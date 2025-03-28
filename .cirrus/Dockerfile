#------------------------------------------------------------------------------
# Installs NodeJS, which is needed for building.
#
# Build from the basedir:
#   docker build -f cirrus/Dockerfile -t sonar-scanner-azdo-build cirrus
#
# Verify the content of the image by running a shell session in it:
#   docker run -it sonar-scanner-azdo-build
#
# CirrusCI builds the image when needed. No need to manually upload it to
# AWS Registry. See section "eks_container" of .cirrus.yml
#------------------------------------------------------------------------------
ARG CIRRUS_AWS_ACCOUNT
FROM ${CIRRUS_AWS_ACCOUNT}.dkr.ecr.eu-central-1.amazonaws.com/base:j17-latest

USER root

RUN apt-get update -y && \
    apt-get install -y libicu-dev nodejs


ENV CYCLONEDX_CLI_VERSION=v0.24.0
ENV CYCLONEDX_CLI_SHA256=691cf7ed82ecce1f85e6d21bccd1ed2d7968e40eb6be7504b392c8b3a0943891
RUN set -o errexit -o nounset && \
    curl --fail --silent --show-error --location --output /usr/bin/cyclonedx "https://github.com/CycloneDX/cyclonedx-cli/releases/download/${CYCLONEDX_CLI_VERSION}/cyclonedx-linux-x64" && \
    echo "${CYCLONEDX_CLI_SHA256} /usr/bin/cyclonedx" | sha256sum --check - && \
    chmod +x /usr/bin/cyclonedx

USER sonarsource
