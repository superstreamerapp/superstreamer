#!/usr/bin/env bash

# Automatic bucket creation
awslocal s3 mb s3://sprs-bucket

# You can check your S3 bucket status here after running the ./run-dev.sh script
# https://app.localstack.cloud/inst/default/resources/s3/sprs-bucket