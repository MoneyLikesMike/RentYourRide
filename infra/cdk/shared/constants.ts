export namespace Constants {
export const NGINX_CODE_DEPLOY_COMMAND = `
  #!/bin/bash
  
  yum update -y
   amazon-linux-extras install nginx1 -y

   cat << 'EOF' | sudo tee /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 2048;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    server {
        listen 80;
        server_name localhost;

        root /var/www/html;  # Serve React app from this directory
        index index.html;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "Healthy";
            add_header Content-Type text/plain;
        }

        # Serve React app ($uri/index.html = prerendered listing share previews)
        location / {
            try_files $uri $uri/index.html /index.html;
        }
    }
}
EOF

   systemctl start nginx
   systemctl enable nginx
   chown -R ec2-user:ec2-user /var/www/html
   chmod 755 /var/www/html
   `;

  export const CODE_DEPLOY_COMMAND = `
 #!/bin/bash

# Install the CodeDeploy agent
dnf update -y
dnf install -y ruby wget curl tar gzip shadow-utils
# Create ec2-user if it doesn't exist (some AL2023 AMIs may not include it)

id ec2-user &>/dev/null || useradd ec2-user

cd /tmp
wget https://aws-codedeploy-us-east-2.s3.us-east-2.amazonaws.com/latest/install
chmod +x ./install
./install auto



# Switch to ec2-user to install nvm and pm2
sudo -u ec2-user bash << 'EOF'
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"

# Install Node.js 20
nvm install 20

# Install PM2 globally
npm install -g pm2

# Optionally: make nvm available in future sessions
echo 'export NVM_DIR="$HOME/.nvm"' >> $HOME/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"' >> $HOME/.bashrc
EOF

# Restart the CodeDeploy agent to ensure it's running
systemctl enable codedeploy-agent
systemctl start codedeploy-agent
`;

  export const CLOUD_WATCH_COMMANDS = (groupName: string) => [
    "dnf update -y",

    // Install CloudWatch Agent
    "dnf install -y amazon-cloudwatch-agent",

    // Create CloudWatch agent configuration
    "cat <<EOF > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json",
    "{",
    '  "logs": {',
    '    "logs_collected": {',
    '      "files": {',
    '        "collect_list": [',
    "          {",
    '            "file_path": "/home/ec2-user/.pm2/logs/main-out.log",',
    `            "log_group_name": "/${groupName}/logs",`,
    '            "log_stream_name": "{instance_id}-backend-pm2-main-out",',
    '            "timezone": "UTC"',
    "          },",
    "          {",
    '            "file_path": "/home/ec2-user/.pm2/logs/main-error.log",',
    `            "log_group_name": "/${groupName}/logs",`,
    '            "log_stream_name": "{instance_id}--backend-pm2-main-error",',
    '            "timezone": "UTC"',
    "          }",
    "        ]",
    "      }",
    "    }",
    "  }",
    "}",
    "EOF",

    // Start the CloudWatch agent
    "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s",
  ];

export const PROD_ACCOUNT_ID = '897729110915';
export const PROD_REGION_ID = 'us-east-2';

  export const SES_PROD_ARN = `arn:aws:ses:${PROD_REGION_ID}:${PROD_ACCOUNT_ID}:identity/rentyourride.ca`;

}
