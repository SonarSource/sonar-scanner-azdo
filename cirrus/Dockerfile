#------------------------------------------------------------------------------
# Installs NodeJS, which is needed for building.
#
# Build from the basedir:
#   docker build -f cirrus/Dockerfile -t sonar-scanner-vsts-build cirrus
#
# Verify the content of the image by running a shell session in it:
#   docker run -it sonar-scanner-vsts-build
#
# CirrusCI builds the image when needed. No need to manually upload it to
# Google Cloud Container Registry. See section "gke_container" of .cirrus.yml
#------------------------------------------------------------------------------

FROM us.gcr.io/sonarqube-team/base:j11-latest

USER root

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y \
    nodejs \
    libicu66

ENV CYCLONEDX_CLI_VERSION=v0.24.0
ENV CYCLONEDX_CLI_SHA256=691cf7ed82ecce1f85e6d21bccd1ed2d7968e40eb6be7504b392c8b3a0943891
RUN set -o errexit -o nounset \
    && curl --fail --silent --show-error --location --output /usr/bin/cyclonedx "https://github.com/CycloneDX/cyclonedx-cli/releases/download/${CYCLONEDX_CLI_VERSION}/cyclonedx-linux-x64" \
    && echo "${CYCLONEDX_CLI_SHA256} /usr/bin/cyclonedx" | sha256sum --check - \
    && chmod +x /usr/bin/cyclonedx

USER sonarsource
