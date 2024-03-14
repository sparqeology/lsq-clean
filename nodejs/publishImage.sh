#!/bin/sh
docker build -t lsq-clean .
docker tag lsq-clean sparqeology/lsq-clean:latest
docker push sparqeology/lsq-clean:latest 
