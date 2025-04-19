#!/bin/bash
set -euo pipefail

# Config variables
AWS_ACCOUNT=$(aws sts get-caller-identity | jq -r ".Account")
AWS_REGION=$(aws configure get default.region)
REPO_NAME="mbgl-renderer"
IMAGE_TAG="map-renderer"

# Derived variables
ECR_URL=089820091254.dkr.ecr.us-east-2.amazonaws.com/paces-service-repository

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION |
  docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

echo "Building Docker image..."
docker build -f docker/Dockerfile -t "${REPO_NAME}:${IMAGE_TAG}" .

echo "Tagging image for ECR..."
docker tag "${REPO_NAME}:${IMAGE_TAG}" "${ECR_URL}:${IMAGE_TAG}"

echo "Pushing image to ECR..."
docker push "${ECR_URL}:${IMAGE_TAG}"

echo "✅ Done! Image pushed to: ${ECR_URL}:${IMAGE_TAG}"

