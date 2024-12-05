#!/usr/bin/env bash

# Automatic bucket creation
awslocal s3 mb s3://sprs-bucket
awslocal s3api put-bucket-cors --bucket sprs-bucket --cors-configuration file:///etc/localstack/init/ready.d/cors.json

# You can check your S3 bucket status here after running the ./run-dev.sh script
# https://app.localstack.cloud/inst/default/resources/s3/sprs-bucket