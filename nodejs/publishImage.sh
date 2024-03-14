#!/bin/sh
docker build -t lsq-clean .
docker tag lsq-clean miguel76/lsq-clean:latest
docker push miguel76/lsq-clean:latest 
