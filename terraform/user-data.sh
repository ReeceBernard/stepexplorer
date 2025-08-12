#!/bin/bash

# Update system
yum update -y

# Install Docker
yum install -y docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker service
service docker start

# Add ec2-user to docker group (so they can run docker commands)
usermod -a -G docker ec2-user

# Enable Docker to start on boot
chkconfig docker on

# Install git (needed for deployment)
yum install -y git

# Create app directory
mkdir -p /home/ec2-user/stepexplorer
chown ec2-user:ec2-user /home/ec2-user/stepexplorer