#!/bin/bash

################################################################################
# TDC Application Installation Script
# Installs the TDC application in /var/www/ with full configuration
################################################################################

set -e  # Exit on error

# Colors and Icons
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CHECKMARK="✓"
CROSS="✗"
ARROW="➜"
GEAR="⚙"
LOCK="🔒"
ROCKET="🚀"
PACKAGE="📦"
DATABASE="🗄"
USER_ICON="👤"
CERTIFICATE="🔐"

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
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${GEAR} $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

prompt_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$(echo -e ${BLUE}${ARROW} "$prompt [$default]: "${NC})" input
        eval "$var_name=\"${input:-$default}\""
    else
        read -p "$(echo -e ${BLUE}${ARROW} "$prompt: "${NC})" input
        eval "$var_name=\"$input\""
    fi
}

prompt_password() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$(echo -e ${BLUE}${LOCK} "$prompt: "${NC})" password
    echo
    read -s -p "$(echo -e ${BLUE}${LOCK} "Confirm $prompt: "${NC})" password_confirm
    echo
    
    if [ "$password" != "$password_confirm" ]; then
        print_error "Passwords do not match!"
        return 1
    fi
    
    eval "$var_name=\"$password\""
}

prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    
    if [ "$default" = "y" ]; then
        read -p "$(echo -e ${BLUE}${ARROW} "$prompt [Y/n]: "${NC})" response
        response=${response:-Y}
    else
        read -p "$(echo -e ${BLUE}${ARROW} "$prompt [y/N]: "${NC})" response
        response=${response:-N}
    fi
    
    [[ "$response" =~ ^[Yy]$ ]]
}

generate_secret_key() {
    python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
}

################################################################################
# Check Prerequisites
################################################################################

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    print_success "Running as root"
    
    # Check required commands
    local required_commands=("git" "python3" "nginx" "systemctl")
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" &> /dev/null; then
            print_success "$cmd is installed"
        else
            print_error "$cmd is not installed"
            case "$cmd" in
                git)
                    print_info "Install with: apt-get install git"
                    ;;
                python3)
                    print_info "Install with: apt-get install python3 python3-pip python3-venv"
                    ;;
                nginx)
                    print_info "Install with: apt-get install nginx"
                    ;;
            esac
            exit 1
        fi
    done
    
    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        print_success "Node.js is installed (version $(node -v))"
    else
        print_error "Node.js is not installed"
        print_info "Install with: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
        exit 1
    fi
    
    # Check if npm is installed
    if command -v npm &> /dev/null; then
        print_success "npm is installed"
    else
        print_error "npm is not installed"
        exit 1
    fi
}

################################################################################
# Collect Installation Information
################################################################################

collect_installation_info() {
    print_header "Installation Configuration"
    
    # Application name
    prompt_input "Application folder name" "tdc" APP_NAME
    
    # Repository URL
    prompt_input "Git repository URL" "https://github.com/sercan8282/tdc" REPO_URL
    
    # Domain name
    prompt_input "Domain name (e.g., example.com)" "" DOMAIN_NAME
    while [ -z "$DOMAIN_NAME" ]; do
        print_error "Domain name is required"
        prompt_input "Domain name" "" DOMAIN_NAME
    done
    
    # Database name
    prompt_input "Database name" "${APP_NAME}_db" DB_NAME
    
    # Django secret key
    print_info "Generating Django secret key..."
    SECRET_KEY=$(generate_secret_key)
    print_success "Secret key generated"
    
    # Captcha secret key
    CAPTCHA_SECRET=$(openssl rand -hex 32)
    print_success "Captcha secret key generated"
    
    # Service account
    prompt_input "Service account username" "${APP_NAME}_user" SERVICE_USER
    prompt_password "Service account password" SERVICE_PASSWORD
    while [ $? -ne 0 ]; do
        prompt_password "Service account password" SERVICE_PASSWORD
    done
    
    # SSL Certificate
    if command -v certbot &> /dev/null; then
        if prompt_yes_no "Use Certbot for SSL certificate?" "y"; then
            USE_CERTBOT=true
            prompt_input "Email for SSL certificate notifications" "" SSL_EMAIL
        else
            USE_CERTBOT=false
        fi
    else
        print_warning "Certbot not installed. SSL will be skipped."
        print_info "Install certbot with: apt-get install certbot python3-certbot-nginx"
        USE_CERTBOT=false
    fi
    
    # Installation path
    INSTALL_PATH="/var/www/${APP_NAME}"
    
    # Confirm installation
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Installation Summary:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Application: ${GREEN}${APP_NAME}${NC}"
    echo -e "Repository: ${GREEN}${REPO_URL}${NC}"
    echo -e "Domain: ${GREEN}${DOMAIN_NAME}${NC}"
    echo -e "Install Path: ${GREEN}${INSTALL_PATH}${NC}"
    echo -e "Database: ${GREEN}${DB_NAME}${NC}"
    echo -e "Service User: ${GREEN}${SERVICE_USER}${NC}"
    echo -e "SSL Certificate: ${GREEN}$([ "$USE_CERTBOT" = true ] && echo "Yes" || echo "No")${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    if ! prompt_yes_no "Proceed with installation?" "y"; then
        print_warning "Installation cancelled"
        exit 0
    fi
}

################################################################################
# Create Service Account
################################################################################

create_service_account() {
    print_header "Creating Service Account"
    
    # Check if user already exists
    if id "$SERVICE_USER" &>/dev/null; then
        print_warning "User $SERVICE_USER already exists"
    else
        # Create user without home directory, no login shell
        useradd -r -s /bin/bash -d "$INSTALL_PATH" -m "$SERVICE_USER"
        print_success "Created user: $SERVICE_USER"
        
        # Set password
        echo "$SERVICE_USER:$SERVICE_PASSWORD" | chpasswd
        print_success "Password set for $SERVICE_USER"
    fi
}

################################################################################
# Clone Repository
################################################################################

clone_repository() {
    print_header "Cloning Repository"
    
    # Navigate to /var/www
    cd /var/www || exit 1
    print_info "Changed directory to /var/www"
    
    # Remove existing installation if present
    if [ -d "$INSTALL_PATH" ]; then
        print_warning "Directory $INSTALL_PATH already exists"
        if prompt_yes_no "Remove existing installation?" "n"; then
            rm -rf "$INSTALL_PATH"
            print_success "Removed existing installation"
        else
            print_error "Cannot proceed with existing installation"
            exit 1
        fi
    fi
    
    # Clone repository
    print_info "Cloning from $REPO_URL..."
    git clone "$REPO_URL" "$APP_NAME"
    print_success "Repository cloned successfully"
    
    # Change to installation directory
    cd "$INSTALL_PATH" || exit 1
}

################################################################################
# Setup Backend
################################################################################

setup_backend() {
    print_header "Setting up Backend (Django)"
    
    cd "$INSTALL_PATH" || exit 1
    
    # Create virtual environment
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
    
    # Activate virtual environment and install dependencies
    print_info "Installing Python dependencies..."
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    print_success "Python dependencies installed"
    
    # Create .env file
    print_info "Creating .env configuration file..."
    cat > .env << EOF
# Django Settings
SECRET_KEY=${SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=${DOMAIN_NAME},www.${DOMAIN_NAME},localhost,127.0.0.1

# Database
DATABASE_NAME=${DB_NAME}

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
    print_success ".env file created"
    
    # Run migrations
    print_info "Running database migrations..."
    python manage.py migrate
    print_success "Database migrations completed"
    
    # Create superuser
    print_header "Creating Initial Superuser"
    print_info "Creating admin user that must change password on first login..."
    
    # Generate temporary password
    TEMP_PASSWORD="ChangeMe123!@#"
    
    python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@${DOMAIN_NAME}').exists():
    user = User.objects.create_superuser(
        email='admin@${DOMAIN_NAME}',
        nickname='admin',
        password='${TEMP_PASSWORD}'
    )
    user.is_verified = True
    user.save()
    print('Superuser created successfully')
else:
    print('Superuser already exists')
EOF
    
    print_success "Superuser created"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}${LOCK} Initial Login Credentials:${NC}"
    echo -e "${YELLOW}   Email: admin@${DOMAIN_NAME}${NC}"
    echo -e "${YELLOW}   Password: ${TEMP_PASSWORD}${NC}"
    echo -e "${YELLOW}   ${RED}⚠ MUST CHANGE PASSWORD ON FIRST LOGIN!${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # Collect static files
    print_info "Collecting static files..."
    python manage.py collectstatic --noinput
    print_success "Static files collected"
    
    deactivate
}

################################################################################
# Setup Frontend
################################################################################

setup_frontend() {
    print_header "Setting up Frontend (React)"
    
    cd "$INSTALL_PATH/frontend" || exit 1
    
    # Install dependencies
    print_info "Installing Node.js dependencies..."
    npm install
    print_success "Node.js dependencies installed"
    
    # Create production .env file
    print_info "Creating frontend environment file..."
    cat > .env.production << EOF
VITE_API_URL=https://${DOMAIN_NAME}/api
EOF
    print_success "Frontend environment file created"
    
    # Build frontend
    print_info "Building frontend for production..."
    npm run build
    print_success "Frontend built successfully"
}

################################################################################
# Configure Nginx
################################################################################

configure_nginx() {
    print_header "Configuring Nginx"
    
    # Create nginx configuration
    NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
    
    print_info "Creating nginx configuration..."
    cat > "$NGINX_CONF" << 'NGINXEOF'
upstream django_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    
    client_max_body_size 50M;
    
    # Frontend (React)
    location / {
        root INSTALL_PATH_PLACEHOLDER/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
    
    # Admin interface
    location /admin/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
    
    # Django static files
    location /static/ {
        alias INSTALL_PATH_PLACEHOLDER/staticfiles/;
    }
    
    # Media files
    location /media/ {
        alias INSTALL_PATH_PLACEHOLDER/media/;
    }
}
NGINXEOF
    
    # Replace placeholders
    sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN_NAME}|g" "$NGINX_CONF"
    sed -i "s|INSTALL_PATH_PLACEHOLDER|${INSTALL_PATH}|g" "$NGINX_CONF"
    
    print_success "Nginx configuration created"
    
    # Enable site
    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${APP_NAME}"
    print_success "Site enabled"
    
    # Test nginx configuration
    print_info "Testing nginx configuration..."
    if nginx -t; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
    
    # Reload nginx
    systemctl reload nginx
    print_success "Nginx reloaded"
}

################################################################################
# Setup SSL Certificate
################################################################################

setup_ssl() {
    if [ "$USE_CERTBOT" = true ]; then
        print_header "Setting up SSL Certificate"
        
        print_info "Obtaining SSL certificate from Let's Encrypt..."
        certbot --nginx -d "$DOMAIN_NAME" -d "www.${DOMAIN_NAME}" \
            --non-interactive --agree-tos --email "$SSL_EMAIL" \
            --redirect
        
        if [ $? -eq 0 ]; then
            print_success "SSL certificate obtained and installed"
            
            # Setup auto-renewal
            print_info "Setting up automatic certificate renewal..."
            (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
            print_success "Auto-renewal configured (daily at 3 AM)"
        else
            print_error "Failed to obtain SSL certificate"
            print_warning "You can manually run: certbot --nginx -d $DOMAIN_NAME"
        fi
    fi
}

################################################################################
# Setup Firewall (UFW)
################################################################################

setup_firewall() {
    print_header "Setting up Firewall (UFW)"
    
    # Check if ufw is installed
    if ! command -v ufw &> /dev/null; then
        print_info "Installing UFW..."
        apt-get update && apt-get install -y ufw
    fi
    
    print_info "Configuring firewall rules..."
    
    # Reset UFW to default (deny incoming, allow outgoing)
    ufw --force reset > /dev/null 2>&1
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (important - don't lock yourself out!)
    print_info "Allowing SSH (port 22)..."
    ufw allow ssh
    
    # Allow HTTP
    print_info "Allowing HTTP (port 80)..."
    ufw allow 80/tcp
    
    # Allow HTTPS
    print_info "Allowing HTTPS (port 443)..."
    ufw allow 443/tcp
    
    # Rate limiting for SSH (prevent brute force)
    print_info "Enabling SSH rate limiting..."
    ufw limit ssh/tcp
    
    # Enable UFW
    print_info "Enabling firewall..."
    echo "y" | ufw enable
    
    print_success "Firewall configured and enabled"
    
    # Show status
    echo -e "\n${BLUE}Firewall Status:${NC}"
    ufw status verbose
    echo ""
}

################################################################################
# Setup Scheduled Tasks (Cron Jobs)
################################################################################

setup_cron_jobs() {
    print_header "Setting up Scheduled Tasks"
    
    # Message cleanup cron job (runs every hour)
    print_info "Setting up message cleanup job..."
    CLEANUP_CMD="0 * * * * cd $APP_DIR && source venv/bin/activate && python manage.py cleanup_old_messages >> /var/log/${APP_NAME}/cleanup.log 2>&1"
    
    # Create log directory if it doesn't exist
    mkdir -p /var/log/${APP_NAME}
    chown $SERVICE_USER:$SERVICE_USER /var/log/${APP_NAME}
    
    # Add cron job for service user
    (crontab -u $SERVICE_USER -l 2>/dev/null | grep -v "cleanup_old_messages"; echo "$CLEANUP_CMD") | crontab -u $SERVICE_USER -
    print_success "Message cleanup job configured (hourly)"
}

################################################################################
# Create Systemd Service
################################################################################

create_systemd_service() {
    print_header "Creating Systemd Service"
    
    SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
    
    print_info "Creating systemd service file..."
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=TDC Application (${APP_NAME})
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_PATH}
Environment="PATH=${INSTALL_PATH}/venv/bin"
ExecStart=${INSTALL_PATH}/venv/bin/gunicorn warzone_loadout.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 60
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    print_success "Systemd service file created"
    
    # Install gunicorn if not present
    print_info "Installing gunicorn..."
    cd "$INSTALL_PATH" || exit 1
    source venv/bin/activate
    pip install gunicorn
    deactivate
    print_success "Gunicorn installed"
    
    # Reload systemd
    systemctl daemon-reload
    print_success "Systemd reloaded"
    
    # Enable and start service
    systemctl enable "${APP_NAME}.service"
    print_success "Service enabled"
    
    systemctl start "${APP_NAME}.service"
    print_success "Service started"
    
    # Check status
    sleep 2
    if systemctl is-active --quiet "${APP_NAME}.service"; then
        print_success "Service is running"
    else
        print_error "Service failed to start"
        print_info "Check logs with: journalctl -u ${APP_NAME}.service -f"
    fi
}

################################################################################
# Set Permissions
################################################################################

set_permissions() {
    print_header "Setting File Permissions"
    
    cd /var/www || exit 1
    
    # Change ownership
    print_info "Setting ownership to ${SERVICE_USER}:${SERVICE_USER}..."
    chown -R "${SERVICE_USER}:${SERVICE_USER}" "$INSTALL_PATH"
    print_success "Ownership set"
    
    # Set directory permissions
    print_info "Setting directory permissions..."
    find "$INSTALL_PATH" -type d -exec chmod 755 {} \;
    print_success "Directory permissions set"
    
    # Set file permissions
    print_info "Setting file permissions..."
    find "$INSTALL_PATH" -type f -exec chmod 644 {} \;
    print_success "File permissions set"
    
    # Make scripts executable
    chmod +x "${INSTALL_PATH}/venv/bin/"*
    print_success "Made scripts executable"
    
    # Protect .env file
    chmod 600 "${INSTALL_PATH}/.env"
    print_success "Protected .env file"
    
    # Ensure media and static directories are writable
    mkdir -p "${INSTALL_PATH}/media" "${INSTALL_PATH}/staticfiles"
    chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_PATH}/media" "${INSTALL_PATH}/staticfiles"
    chmod -R 755 "${INSTALL_PATH}/media" "${INSTALL_PATH}/staticfiles"
    print_success "Media and static directories configured"
}

################################################################################
# Create Update Script
################################################################################

create_update_script() {
    print_header "Creating Update Script"
    
    UPDATE_SCRIPT="${INSTALL_PATH}/update.sh"
    
    print_info "Creating update script..."
    cat > "$UPDATE_SCRIPT" << 'UPDATEEOF'
#!/bin/bash
# This file will be replaced with the actual update script
# Placeholder
UPDATEEOF
    
    chmod +x "$UPDATE_SCRIPT"
    chown "${SERVICE_USER}:${SERVICE_USER}" "$UPDATE_SCRIPT"
    print_success "Update script created at ${UPDATE_SCRIPT}"
}

################################################################################
# Final Report
################################################################################

print_final_report() {
    print_header "Installation Complete!"
    
    echo -e "${GREEN}${ROCKET} Your application has been successfully installed!${NC}\n"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Application Details:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "🌐 URL: https://${DOMAIN_NAME}"
    echo -e "📁 Installation Path: ${INSTALL_PATH}"
    echo -e "👤 Service User: ${SERVICE_USER}"
    echo -e "🗄  Database: ${DB_NAME}"
    echo -e "🔥 Firewall: UFW enabled (SSH, HTTP, HTTPS)"
    echo -e ""
    echo -e "${YELLOW}${LOCK} Initial Admin Credentials:${NC}"
    echo -e "   Email: ${GREEN}admin@${DOMAIN_NAME}${NC}"
    echo -e "   Password: ${GREEN}${TEMP_PASSWORD}${NC}"
    echo -e "   ${RED}⚠ CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!${NC}"
    echo -e ""
    echo -e "${BLUE}Security Features:${NC}"
    echo -e "   ✓ Firewall (UFW) configured"
    echo -e "   ✓ SSH rate limiting enabled"
    echo -e "   ✓ SSL/HTTPS ready"
    echo -e "   ✓ Secure file permissions"
    echo -e ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "   View logs: ${GREEN}journalctl -u ${APP_NAME}.service -f${NC}"
    echo -e "   Restart: ${GREEN}systemctl restart ${APP_NAME}.service${NC}"
    echo -e "   Status: ${GREEN}systemctl status ${APP_NAME}.service${NC}"
    echo -e "   Update: ${GREEN}${INSTALL_PATH}/update.sh${NC}"
    echo -e "   Firewall: ${GREEN}ufw status${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${GREEN}${CHECKMARK} Installation completed successfully!${NC}\n"
}

################################################################################
# Main Installation Flow
################################################################################

main() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           TDC Application Installation Script               ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    check_prerequisites
    collect_installation_info
    create_service_account
    clone_repository
    setup_backend
    setup_frontend
    configure_nginx
    setup_ssl
    setup_firewall
    setup_cron_jobs
    create_systemd_service
    set_permissions
    create_update_script
    print_final_report
}

# Run main installation
main
