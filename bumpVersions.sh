#!/usr/bin/env bash

# Modify the version numbers of dependencies as needed. Then run ./bumpVersions.sh to create updated versions of
# * packages.dhall
# * createPerspectivesLinks.sh
# * package.json

PERSPECTIVESPROXY=v1.21.1
PERSPECTIVESCORE=v0.26.1

sed "s/PERSPECTIVESPROXY/${PERSPECTIVESPROXY}/g;\
s/PERSPECTIVESCORE/${PERSPECTIVESCORE}/g;" package.template.json > package.json