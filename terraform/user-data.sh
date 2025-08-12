#!/bin/bash

# Update system
yum update -y

# Install Docker
yum install -y docker ecs-init

# Start services
service docker start
service ecs start

# Configure ECS
echo ECS_CLUSTER=stepexplorer-cluster >> /etc/ecs/ecs.config

# Enable services on boot
chkconfig docker on
chkconfig ecs on

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install git
yum install -y git