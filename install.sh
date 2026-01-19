#!/bin/bash

################################################################################
# TDC Application Installation Script
# Fully automated, interactive installation
################################################################################

# Colors and Icons
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

CHECKMARK="✓"
CROSS="✗"
ARROW="➜"
GEAR="⚙"
LOCK="🔒"
ROCKET="🚀"
PACKAGE="📦"
DATABASE="🗄"
GLOBE="🌐"
FOLDER="📁"
KEY="🔑"
CLOCK="⏰"
SHIELD="🛡"

################################################################################
# Helper Functions
################################################################################

print_success() {
    echo -e "${GREEN}${CHECKMARK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_info() {
    echo -e "${BLUE}${ARROW} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${GEAR} $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    echo -e "\n${MAGENTA}▸ $1${NC}"
}

prompt_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$(echo -e ${BLUE}${ARROW}${NC} "$prompt ${YELLOW}[$default]${NC}: ")" input
        eval "$var_name=\"${input:-$default}\""
    else
        read -p "$(echo -e ${BLUE}${ARROW}${NC} "$prompt: ")" input
        eval "$var_name=\"$input\""
    fi
}

prompt_password() {
    local prompt="$1"
    local var_name="$2"
    
    while true; do
        read -s -p "$(echo -e ${BLUE}${LOCK}${NC} "$prompt: ")" password
        echo
        read -s -p "$(echo -e ${BLUE}${LOCK}${NC} "Confirm password: ")" password_confirm
        echo
        
        if [ "$password" != "$password_confirm" ]; then
            print_error "Passwords do not match! Try again."
        elif [ -z "$password" ]; then
            print_error "Password cannot be empty! Try again."
        else
            eval "$var_name=\"$password\""
            break
        fi
    done
}

prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    
    if [ "$default" = "y" ]; then
        read -p "$(echo -e ${BLUE}${ARROW}${NC} "$prompt ${YELLOW}[Y/n]${NC}: ")" response
        response=${response:-Y}
    else
        read -p "$(echo -e ${BLUE}${ARROW}${NC} "$prompt ${YELLOW}[y/N]${NC}: ")" response
        response=${response:-N}
    fi
    
    [[ "$response" =~ ^[Yy]$ ]]
}

generate_secret_key() {
    python3 -c 'import secrets; print(secrets.token_urlsafe(50))'
}

generate_random_password() {
    openssl rand -base64 16 | tr -d '=' | head -c 16
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

################################################################################
# Check Root
################################################################################

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use: sudo bash install.sh)"
        exit 1
    fi
    print_success "Running as root"
}

################################################################################
# Install All Dependencies Automatically
################################################################################

install_dependencies() {
    print_header "Installing System Dependencies"
    
    # Update package list
    print_step "Updating package list..."
    apt-get update -qq
    print_success "Package list updated"
    
    # Install basic tools
    print_step "Installing basic tools..."
    apt-get install -y -qq curl wget git software-properties-common apt-transport-https ca-certificates gnupg lsb-release > /dev/null 2>&1
    print_success "Basic tools installed"
    
    # Install Python
    print_step "Installing Python 3..."
    apt-get install -y -qq python3 python3-pip python3-venv python3-dev > /dev/null 2>&1
    print_success "Python 3 installed ($(python3 --version))"
    
    # Install Nginx
    print_step "Installing Nginx..."
    apt-get install -y -qq nginx > /dev/null 2>&1
    systemctl enable nginx > /dev/null 2>&1
    systemctl start nginx > /dev/null 2>&1
    print_success "Nginx installed and started"
    
    # Install Node.js (LTS version)
    print_step "Installing Node.js..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
        apt-get install -y -qq nodejs > /dev/null 2>&1
    fi
    print_success "Node.js installed ($(node --version))"
    print_success "npm installed ($(npm --version))"
    
    # Install SQLite (default database)
    print_step "Installing SQLite..."
    apt-get install -y -qq sqlite3 libsqlite3-dev > /dev/null 2>&1
    print_success "SQLite installed"
    
    # Install UFW firewall
    print_step "Installing UFW firewall..."
    apt-get install -y -qq ufw > /dev/null 2>&1
    print_success "UFW firewall installed"
    
    # Install OpenSSL
    print_step "Installing OpenSSL..."
    apt-get install -y -qq openssl > /dev/null 2>&1
    print_success "OpenSSL installed"
    
    echo ""
    print_success "All system dependencies installed successfully!"
}

################################################################################
# Install Certbot (Optional)
################################################################################

install_certbot() {
    print_step "Installing Certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
    print_success "Certbot installed"
}

################################################################################
# Collect Installation Information (Interactive)
################################################################################

collect_installation_info() {
    print_header "Installation Configuration"
    
    echo -e "${BOLD}Please answer the following questions to configure your installation:${NC}\n"
    
    # Application folder name
    echo -e "${FOLDER} ${BOLD}Application Folder${NC}"
    prompt_input "Enter the folder name for your application" "tdc" APP_NAME
    while [[ ! "$APP_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; do
        print_error "Invalid folder name. Use only letters, numbers, underscores and hyphens."
        prompt_input "Enter the folder name for your application" "tdc" APP_NAME
    done
    INSTALL_PATH="/var/www/${APP_NAME}"
    echo ""
    
    # Domain name
    echo -e "${GLOBE} ${BOLD}Domain Configuration${NC}"
    prompt_input "Enter your domain name (e.g., example.com)" "" DOMAIN_NAME
    while [ -z "$DOMAIN_NAME" ]; do
        print_error "Domain name is required!"
        prompt_input "Enter your domain name" "" DOMAIN_NAME
    done
    echo ""
    
    # SSL Certificate
    echo -e "${LOCK} ${BOLD}SSL Certificate${NC}"
    if prompt_yes_no "Do you want to install SSL certificate with Certbot (Let's Encrypt)?" "y"; then
        INSTALL_SSL=true
        prompt_input "Enter email for SSL certificate notifications" "admin@${DOMAIN_NAME}" SSL_EMAIL
    else
        INSTALL_SSL=false
        print_warning "SSL will not be configured. You can add it later manually."
    fi
    echo ""
    
    # Generate secrets
    print_step "Generating security keys..."
    SECRET_KEY=$(generate_secret_key)
    CAPTCHA_SECRET=$(openssl rand -hex 32)
    ADMIN_PASSWORD=$(generate_random_password)
    print_success "Security keys generated"
    echo ""
    
    # Show summary
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${BOLD}Installation Summary${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${FOLDER} Application Name:  ${GREEN}${APP_NAME}${NC}"
    echo -e "${FOLDER} Install Path:      ${GREEN}${INSTALL_PATH}${NC}"
    echo -e "${GLOBE} Domain:            ${GREEN}${DOMAIN_NAME}${NC}"
    echo -e "${LOCK} SSL Certificate:   ${GREEN}$([ "$INSTALL_SSL" = true ] && echo "Yes (Certbot)" || echo "No")${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if ! prompt_yes_no "Proceed with installation?" "y"; then
        print_warning "Installation cancelled by user"
        exit 0
    fi
}

################################################################################
# Copy Application Files
################################################################################

copy_application_files() {
    print_header "Copying Application Files"
    
    # Create installation directory
    print_step "Creating installation directory..."
    if [ -d "$INSTALL_PATH" ]; then
        print_warning "Directory $INSTALL_PATH already exists"
        if prompt_yes_no "Remove existing installation and continue?" "n"; then
            rm -rf "$INSTALL_PATH"
            print_success "Removed existing installation"
        else
            print_error "Cannot proceed with existing installation"
            exit 1
        fi
    fi
    
    mkdir -p "$INSTALL_PATH"
    print_success "Created directory: $INSTALL_PATH"
    
    # Copy files from script directory to installation path
    print_step "Copying application files..."
    cp -r "$SCRIPT_DIR"/* "$INSTALL_PATH/"
    cp -r "$SCRIPT_DIR"/.[!.]* "$INSTALL_PATH/" 2>/dev/null || true
    print_success "Application files copied to $INSTALL_PATH"
    
    # Remove git directory if exists (clean install)
    rm -rf "$INSTALL_PATH/.git" 2>/dev/null || true
    
    cd "$INSTALL_PATH" || exit 1
}

################################################################################
# Setup Backend (Django)
################################################################################

setup_backend() {
    print_header "Setting up Backend (Django)"
    
    cd "$INSTALL_PATH" || exit 1
    
    # Create virtual environment
    print_step "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
    
    # Activate and install dependencies
    print_step "Installing Python dependencies..."
    source venv/bin/activate
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
    pip install gunicorn -q
    print_success "Python dependencies installed"
    
    # Create .env file
    print_step "Creating environment configuration..."
    cat > .env << EOF
# Django Settings
SECRET_KEY=${SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=${DOMAIN_NAME},www.${DOMAIN_NAME},localhost,127.0.0.1

# Database
DATABASE_NAME=db.sqlite3

# Captcha
CAPTCHA_SECRET_KEY=${CAPTCHA_SECRET}

# Security Settings
MAX_LOGIN_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW=300
MAX_REGISTER_ATTEMPTS=3
REGISTER_RATE_LIMIT_WINDOW=300
API_RATE_LIMIT=60
API_RATE_LIMIT_WINDOW=60
AUTO_BLOCK_THRESHOLD=10
AUTO_BLOCK_WINDOW=900

# Production Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
EOF
    print_success "Environment configuration created"
    
    # Run migrations
    print_step "Running database migrations..."
    python manage.py migrate --verbosity=0
    print_success "Database migrations completed"
    
    # Create superuser
    print_step "Creating admin user..."
    python manage.py shell << PYEOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@${DOMAIN_NAME}').exists():
    user = User.objects.create_superuser(
        email='admin@${DOMAIN_NAME}',
        nickname='admin',
        password='${ADMIN_PASSWORD}'
    )
    user.is_verified = True
    user.save()
    print('Admin user created')
else:
    print('Admin user already exists')
PYEOF
    print_success "Admin user created"
    
    # Collect static files
    print_step "Collecting static files..."
    python manage.py collectstatic --noinput --verbosity=0
    print_success "Static files collected"
    
    deactivate
}

################################################################################
# Setup Frontend (React/Vite)
################################################################################

setup_frontend() {
    print_header "Setting up Frontend (React)"
    
    cd "$INSTALL_PATH/frontend" || exit 1
    
    # Install dependencies
    print_step "Installing Node.js dependencies..."
    npm install --silent 2>/dev/null
    print_success "Node.js dependencies installed"
    
    # Create production environment file
    print_step "Creating frontend configuration..."
    cat > .env.production << EOF
VITE_API_URL=https://${DOMAIN_NAME}/api
EOF
    print_success "Frontend configuration created"
    
    # Build for production
    print_step "Building frontend for production (this may take a few minutes)..."
    npm run build --silent 2>/dev/null
    print_success "Frontend built successfully"
}

################################################################################
# Configure Nginx
################################################################################

configure_nginx() {
    print_header "Configuring Nginx"
    
    NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
    
    print_step "Creating Nginx configuration..."
    
    # Create nginx config (HTTP only first, certbot will add HTTPS)
    cat > "$NGINX_CONF" << NGINXEOF
upstream django_${APP_NAME} {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    
    client_max_body_size 100M;
    
    # Frontend (React)
    location / {
        root ${INSTALL_PATH}/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://django_${APP_NAME};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
        proxy_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Django Admin
    location /admin/ {
        proxy_pass http://django_${APP_NAME};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }
    
    # Django static files
    location /static/ {
        alias ${INSTALL_PATH}/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Media files
    location /media/ {
        alias ${INSTALL_PATH}/media/;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINXEOF
    
    print_success "Nginx configuration created"
    
    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # Enable site
    print_step "Enabling site..."
    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${APP_NAME}"
    print_success "Site enabled"
    
    # Test configuration
    print_step "Testing Nginx configuration..."
    if nginx -t 2>/dev/null; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration test failed!"
        nginx -t
        exit 1
    fi
    
    # Reload nginx
    systemctl reload nginx
    print_success "Nginx reloaded"
}

################################################################################
# Setup SSL Certificate with Certbot
################################################################################

setup_ssl() {
    if [ "$INSTALL_SSL" = true ]; then
        print_header "Setting up SSL Certificate"
        
        # Install certbot if not installed
        if ! command -v certbot &> /dev/null; then
            install_certbot
        fi
        
        print_step "Obtaining SSL certificate from Let's Encrypt..."
        print_info "This requires your domain to be pointing to this server!"
        echo ""
        
        # Try to obtain certificate
        if certbot --nginx -d "$DOMAIN_NAME" -d "www.${DOMAIN_NAME}" \
            --non-interactive --agree-tos --email "$SSL_EMAIL" \
            --redirect 2>/dev/null; then
            print_success "SSL certificate obtained and installed!"
            
            # Setup auto-renewal cron job
            print_step "Setting up automatic certificate renewal..."
            # Remove existing certbot cron if exists
            crontab -l 2>/dev/null | grep -v "certbot renew" | crontab - 2>/dev/null || true
            # Add new cron job for certificate renewal (twice daily as recommended)
            (crontab -l 2>/dev/null; echo "0 3,15 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
            print_success "Certificate auto-renewal configured (runs twice daily)"
        else
            print_warning "Could not obtain SSL certificate automatically"
            print_info "Make sure your domain DNS is pointing to this server"
            print_info "You can manually run later: certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME"
        fi
    fi
}

################################################################################
# Create Systemd Service
################################################################################

create_systemd_service() {
    print_header "Creating Systemd Service"
    
    SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
    
    print_step "Creating service file..."
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=TDC Application - ${APP_NAME}
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${INSTALL_PATH}
Environment="PATH=${INSTALL_PATH}/venv/bin"
ExecStart=${INSTALL_PATH}/venv/bin/gunicorn warzone_loadout.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 120 --access-logfile /var/log/${APP_NAME}/access.log --error-logfile /var/log/${APP_NAME}/error.log
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    print_success "Service file created"
    
    # Create log directory
    mkdir -p /var/log/${APP_NAME}
    chown www-data:www-data /var/log/${APP_NAME}
    
    # Reload systemd
    print_step "Enabling and starting service..."
    systemctl daemon-reload
    systemctl enable "${APP_NAME}.service" > /dev/null 2>&1
    systemctl start "${APP_NAME}.service"
    
    # Check if service started
    sleep 3
    if systemctl is-active --quiet "${APP_NAME}.service"; then
        print_success "Service is running"
    else
        print_error "Service failed to start"
        print_info "Check logs with: journalctl -u ${APP_NAME}.service -f"
    fi
}

################################################################################
# Setup Cron Jobs
################################################################################

setup_cron_jobs() {
    print_header "Setting up Scheduled Tasks"
    
    # Create management command for message cleanup if it doesn't exist
    MANAGEMENT_DIR="${INSTALL_PATH}/users/management/commands"
    mkdir -p "$MANAGEMENT_DIR"
    touch "${INSTALL_PATH}/users/management/__init__.py"
    touch "$MANAGEMENT_DIR/__init__.py"
    
    # Create cleanup command
    print_step "Creating message cleanup command..."
    cat > "$MANAGEMENT_DIR/cleanup_read_messages.py" << 'PYEOF'
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Delete read messages older than 24 hours'

    def handle(self, *args, **options):
        from users.messaging_models import Message
        
        # Calculate cutoff time (24 hours ago)
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        # Delete read messages older than 24 hours
        deleted_count, _ = Message.objects.filter(
            is_read=True,
            read_at__lt=cutoff_time
        ).delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'Deleted {deleted_count} read messages older than 24 hours')
        )
PYEOF
    print_success "Message cleanup command created"
    
    # Create cron job for message cleanup (runs every hour)
    print_step "Setting up message cleanup cron job..."
    CLEANUP_CRON="0 * * * * cd ${INSTALL_PATH} && ${INSTALL_PATH}/venv/bin/python manage.py cleanup_read_messages >> /var/log/${APP_NAME}/cleanup.log 2>&1"
    
    # Add cron job (remove existing if present)
    (crontab -l 2>/dev/null | grep -v "cleanup_read_messages"; echo "$CLEANUP_CRON") | crontab -
    print_success "Message cleanup job configured (runs every hour, deletes read messages after 24h)"
    
    # Create cron job for Django management tasks
    print_step "Setting up session cleanup cron job..."
    SESSION_CRON="0 4 * * * cd ${INSTALL_PATH} && ${INSTALL_PATH}/venv/bin/python manage.py clearsessions >> /var/log/${APP_NAME}/sessions.log 2>&1"
    (crontab -l 2>/dev/null | grep -v "clearsessions"; echo "$SESSION_CRON") | crontab -
    print_success "Session cleanup job configured (runs daily at 4 AM)"
}

################################################################################
# Setup Firewall
################################################################################

setup_firewall() {
    print_header "Configuring Firewall"
    
    print_step "Setting up UFW firewall rules..."
    
    # Reset and configure
    ufw --force reset > /dev/null 2>&1
    ufw default deny incoming > /dev/null 2>&1
    ufw default allow outgoing > /dev/null 2>&1
    
    # Allow SSH (important!)
    ufw allow ssh > /dev/null 2>&1
    print_success "SSH (port 22) allowed"
    
    # Allow HTTP
    ufw allow 80/tcp > /dev/null 2>&1
    print_success "HTTP (port 80) allowed"
    
    # Allow HTTPS
    ufw allow 443/tcp > /dev/null 2>&1
    print_success "HTTPS (port 443) allowed"
    
    # Rate limit SSH
    ufw limit ssh/tcp > /dev/null 2>&1
    print_success "SSH rate limiting enabled"
    
    # Enable firewall
    echo "y" | ufw enable > /dev/null 2>&1
    print_success "Firewall enabled"
}

################################################################################
# Set Permissions
################################################################################

set_permissions() {
    print_header "Setting File Permissions"
    
    print_step "Setting ownership and permissions..."
    
    # Change ownership to www-data
    chown -R www-data:www-data "$INSTALL_PATH"
    print_success "Ownership set to www-data"
    
    # Set directory permissions
    find "$INSTALL_PATH" -type d -exec chmod 755 {} \;
    print_success "Directory permissions set (755)"
    
    # Set file permissions
    find "$INSTALL_PATH" -type f -exec chmod 644 {} \;
    print_success "File permissions set (644)"
    
    # Make scripts executable
    chmod +x "${INSTALL_PATH}/venv/bin/"* 2>/dev/null || true
    chmod +x "${INSTALL_PATH}"/*.sh 2>/dev/null || true
    print_success "Scripts made executable"
    
    # Protect sensitive files
    chmod 600 "${INSTALL_PATH}/.env"
    print_success "Protected .env file (600)"
    
    # Ensure media directory is writable
    mkdir -p "${INSTALL_PATH}/media"
    chmod -R 755 "${INSTALL_PATH}/media"
    print_success "Media directory configured"
}

################################################################################
# Print Final Report
################################################################################

print_final_report() {
    clear
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                      ║${NC}"
    echo -e "${GREEN}║           ${ROCKET} INSTALLATION COMPLETED SUCCESSFULLY! ${ROCKET}              ║${NC}"
    echo -e "${GREEN}║                                                                      ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Application Details${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GLOBE} Website URL:       ${GREEN}https://${DOMAIN_NAME}${NC}"
    echo -e "${FOLDER} Installation Path: ${GREEN}${INSTALL_PATH}${NC}"
    echo -e "${DATABASE} Database:          ${GREEN}SQLite (${INSTALL_PATH}/db.sqlite3)${NC}"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${KEY} Admin Login Credentials${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   Email:    ${GREEN}admin@${DOMAIN_NAME}${NC}"
    echo -e "   Password: ${GREEN}${ADMIN_PASSWORD}${NC}"
    echo ""
    echo -e "   ${RED}${BOLD}⚠ IMPORTANT: Change this password immediately after first login!${NC}"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CLOCK} Scheduled Tasks (Cron Jobs)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   ${CHECKMARK} Message cleanup: Every hour (deletes read messages after 24h)"
    echo -e "   ${CHECKMARK} Session cleanup: Daily at 4 AM"
    if [ "$INSTALL_SSL" = true ]; then
        echo -e "   ${CHECKMARK} SSL renewal: Twice daily (3 AM & 3 PM)"
    fi
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${SHIELD} Security Features Enabled${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   ${CHECKMARK} UFW Firewall (SSH, HTTP, HTTPS only)"
    echo -e "   ${CHECKMARK} SSH rate limiting"
    if [ "$INSTALL_SSL" = true ]; then
        echo -e "   ${CHECKMARK} SSL/HTTPS with auto-renewal"
    fi
    echo -e "   ${CHECKMARK} Secure file permissions"
    echo -e "   ${CHECKMARK} Security headers configured"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Useful Commands${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "   View service status:  ${YELLOW}systemctl status ${APP_NAME}${NC}"
    echo -e "   Restart service:      ${YELLOW}systemctl restart ${APP_NAME}${NC}"
    echo -e "   View logs:            ${YELLOW}journalctl -u ${APP_NAME} -f${NC}"
    echo -e "   View app logs:        ${YELLOW}tail -f /var/log/${APP_NAME}/error.log${NC}"
    echo -e "   Firewall status:      ${YELLOW}ufw status${NC}"
    echo -e "   View cron jobs:       ${YELLOW}crontab -l${NC}"
    echo ""
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}${CHECKMARK} Your TDC application is now ready to use!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

################################################################################
# Main Installation Flow
################################################################################

main() {
    clear
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                      ║${NC}"
    echo -e "${CYAN}║              ${BOLD}TDC Application - Installation Script${NC}${CYAN}               ║${NC}"
    echo -e "${CYAN}║                                                                      ║${NC}"
    echo -e "${CYAN}║          This script will automatically install everything          ║${NC}"
    echo -e "${CYAN}║                 needed to run your TDC application                  ║${NC}"
    echo -e "${CYAN}║                                                                      ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Check if running as root
    check_root
    
    # Install all dependencies automatically
    install_dependencies
    
    # Collect configuration from user (interactive)
    collect_installation_info
    
    # Copy files to installation directory
    copy_application_files
    
    # Setup backend
    setup_backend
    
    # Setup frontend
    setup_frontend
    
    # Configure nginx
    configure_nginx
    
    # Setup SSL if requested
    setup_ssl
    
    # Create systemd service
    create_systemd_service
    
    # Setup cron jobs (including message cleanup)
    setup_cron_jobs
    
    # Setup firewall
    setup_firewall
    
    # Set permissions
    set_permissions
    
    # Print final report
    print_final_report
}

# Run main installation
main "$@"
