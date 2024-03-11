#!/bin/sh
# docker build --output type=tar,dest=dist/docker_image.tar .
# docker build --output dist/docker_image .
docker build -t lsq-clean .
docker save --output dist/docker_image.tar lsq-clean
gzip --force dist/docker_image.tar
