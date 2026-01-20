#!/bin/bash

################################################################################
# TDC Application Update Script
# Autonomous update script for pulling latest changes and updating the app
################################################################################

set -e  # Exit on error

# Colors and Icons
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

CHECKMARK="✓"
CROSS="✗"
ARROW="➜"
GEAR="⚙"
LOCK="🔒"
ROCKET="🚀"
PACKAGE="📦"
DATABASE="🗄"
REFRESH="🔄"
STOP="🛑"
START="▶"

################################################################################
# Configuration
################################################################################

# Detect script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"
APP_NAME="$(basename "$APP_DIR")"
SERVICE_NAME="$APP_NAME"

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
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${GEAR} $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    echo -e "${BLUE}${REFRESH} $1...${NC}"
}

################################################################################
# Check if running as service user or root
################################################################################

check_user() {
    CURRENT_USER=$(whoami)
    
    # Load .env to get service user if exists
    if [ -f "$APP_DIR/.env" ]; then
        # Extract any service user info from installation
        # For now, check ownership of the directory
        SERVICE_USER=$(stat -c '%U' "$APP_DIR" 2>/dev/null || stat -f '%Su' "$APP_DIR" 2>/dev/null)
    else
        SERVICE_USER="$CURRENT_USER"
    fi
    
    if [ "$CURRENT_USER" = "root" ]; then
        print_warning "Running as root - will switch to service user: $SERVICE_USER"
        
        # Ask for service user password
        read -s -p "$(echo -e ${BLUE}${LOCK} "Enter password for $SERVICE_USER: "${NC})" SERVICE_PASSWORD
        echo
        
        # Re-run this script as service user
        print_info "Switching to service user..."
        exec su - "$SERVICE_USER" -c "cd '$APP_DIR' && bash '$0'"
        exit 0
    elif [ "$CURRENT_USER" != "$SERVICE_USER" ]; then
        print_error "Must run as $SERVICE_USER or root"
        exit 1
    fi
    
    print_success "Running as service user: $CURRENT_USER"
}

################################################################################
# Load Environment Variables
################################################################################

load_environment() {
    print_header "Loading Environment"
    
    if [ ! -f "$APP_DIR/.env" ]; then
        print_error ".env file not found in $APP_DIR"
        exit 1
    fi
    
    # Export all variables from .env
    set -a
    source "$APP_DIR/.env"
    set +a
    
    print_success "Environment variables loaded"
}

################################################################################
# Check Git Status
################################################################################

check_git_status() {
    print_header "Checking Git Status"
    
    cd "$APP_DIR" || exit 1
    
    # Check if git repository
    if [ ! -d ".git" ]; then
        print_error "Not a git repository"
        exit 1
    fi
    
    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    print_info "Current branch: $CURRENT_BRANCH"
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "Uncommitted changes detected"
        print_info "Stashing local changes..."
        git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)"
        print_success "Changes stashed"
    fi
    
    # Fetch latest changes
    print_step "Fetching latest changes"
    git fetch origin
    
    # Check if updates available
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        print_info "Already up to date"
        NO_UPDATES=true
    else
        print_success "Updates available"
        NO_UPDATES=false
    fi
}

################################################################################
# Stop Service
################################################################################

stop_service() {
    print_header "Stopping Application Service"
    
    # Check if service exists
    if systemctl list-units --full -all | grep -Fq "$SERVICE_NAME.service"; then
        print_step "Stopping $SERVICE_NAME service"
        
        # Use sudo to stop service (requires sudoers configuration)
        if sudo systemctl stop "$SERVICE_NAME.service"; then
            print_success "Service stopped"
        else
            print_error "Failed to stop service"
            print_info "Attempting manual stop..."
            pkill -f "gunicorn.*$APP_NAME" || true
            sleep 2
            print_success "Manual stop completed"
        fi
    else
        print_warning "Service $SERVICE_NAME.service not found"
        print_info "Attempting to stop any running processes..."
        pkill -f "gunicorn.*$APP_NAME" || true
        pkill -f "python.*manage.py.*runserver" || true
        print_success "Process cleanup completed"
    fi
}

################################################################################
# Pull Latest Changes
################################################################################

pull_changes() {
    print_header "Pulling Latest Changes"
    
    cd "$APP_DIR" || exit 1
    
    print_step "Pulling from origin/$CURRENT_BRANCH"
    if git pull origin "$CURRENT_BRANCH"; then
        print_success "Code updated successfully"
    else
        print_error "Failed to pull changes"
        exit 1
    fi
    
    # Show commit info
    LATEST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%an, %ar)")
    print_info "Latest commit: $LATEST_COMMIT"
}

################################################################################
# Update Backend Dependencies
################################################################################

update_backend() {
    print_header "Updating Backend Dependencies"
    
    cd "$APP_DIR" || exit 1
    
    # Activate virtual environment
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found"
        exit 1
    fi
    
    print_step "Activating virtual environment"
    source venv/bin/activate
    print_success "Virtual environment activated"
    
    # Upgrade pip
    print_step "Upgrading pip"
    pip install --upgrade pip --quiet
    print_success "Pip upgraded"
    
    # Install/update requirements
    print_step "Installing/updating Python dependencies"
    if pip install -r requirements.txt --quiet; then
        print_success "Python dependencies updated"
    else
        print_error "Failed to install Python dependencies"
        deactivate
        exit 1
    fi
    
    # Run migrations (NEVER deletes data)
    print_step "Running database migrations"
    if python manage.py migrate --noinput; then
        print_success "Database migrations completed"
    else
        print_error "Database migrations failed"
        deactivate
        exit 1
    fi
    
    # Collect static files
    print_step "Collecting static files"
    if python manage.py collectstatic --noinput --clear; then
        print_success "Static files collected"
    else
        print_warning "Static files collection had issues (non-critical)"
    fi
    
    deactivate
}

################################################################################
# Update Frontend
################################################################################

update_frontend() {
    print_header "Updating Frontend"
    
    cd "$APP_DIR/frontend" || exit 1
    
    # Check if package.json changed
    if git diff HEAD@{1} --name-only | grep -q "package.json"; then
        print_step "package.json changed - reinstalling dependencies"
        npm install
        print_success "Node dependencies updated"
    else
        print_info "No package.json changes detected"
    fi
    
    # Rebuild frontend
    print_step "Building frontend for production"
    if npm run build; then
        print_success "Frontend built successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
}

################################################################################
# Verify Environment Configuration
################################################################################

verify_environment() {
    print_header "Verifying Environment Configuration"
    
    cd "$APP_DIR" || exit 1
    
    # Check if .env file has all required variables
    REQUIRED_VARS=("SECRET_KEY" "DATABASE_NAME" "CAPTCHA_SECRET_KEY")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            print_success "$var is configured"
        else
            print_error "$var is missing from .env"
            exit 1
        fi
    done
}

################################################################################
# Start Service
################################################################################

start_service() {
    print_header "Starting Application Service"
    
    # Check if running as systemd service first
    if systemctl list-units --full -all | grep -Fq "$SERVICE_NAME.service"; then
        print_step "Starting $SERVICE_NAME service"
        
        if sudo systemctl start "$SERVICE_NAME.service"; then
            print_success "Service started"
            
            # Wait for service to be ready
            sleep 3
            
            # Check if service is running
            if sudo systemctl is-active --quiet "$SERVICE_NAME.service"; then
                print_success "Service is running"
            else
                print_error "Service failed to start"
                print_info "Check logs with: journalctl -u $SERVICE_NAME.service -n 50"
                exit 1
            fi
        else
            print_error "Failed to start service"
            exit 1
        fi
    else
        # No systemd service - try to restart Gunicorn directly
        print_warning "Systemd service not found - restarting Gunicorn manually"
        
        # Find Gunicorn master process
        GUNICORN_PID=$(pgrep -f "gunicorn.*warzone_loadout.wsgi" | head -1)
        
        if [ -n "$GUNICORN_PID" ]; then
            print_step "Sending reload signal to Gunicorn (PID: $GUNICORN_PID)"
            sudo kill -HUP "$GUNICORN_PID"
            sleep 2
            
            # Verify it's still running
            if pgrep -f "gunicorn.*warzone_loadout.wsgi" > /dev/null; then
                print_success "Gunicorn reloaded successfully"
            else
                print_error "Gunicorn stopped - restarting..."
                cd "$APP_DIR" || exit 1
                source venv/bin/activate
                gunicorn warzone_loadout.wsgi:application \
                    --bind 127.0.0.1:8000 \
                    --workers 3 \
                    --timeout 120 \
                    --access-logfile /var/log/turkdostclan/access.log \
                    --error-logfile /var/log/turkdostclan/error.log \
                    --daemon
                print_success "Gunicorn started"
            fi
        else
            print_error "Gunicorn is not running"
            print_info "Starting Gunicorn..."
            cd "$APP_DIR" || exit 1
            source venv/bin/activate
            gunicorn warzone_loadout.wsgi:application \
                --bind 127.0.0.1:8000 \
                --workers 3 \
                --timeout 120 \
                --access-logfile /var/log/turkdostclan/access.log \
                --error-logfile /var/log/turkdostclan/error.log \
                --daemon
            print_success "Gunicorn started"
        fi
    fi
}

################################################################################
# Health Check
################################################################################

health_check() {
    print_header "Running Health Check"
    
    # Wait a moment for app to fully start
    sleep 2
    
    # Check if service is responding
    print_step "Checking application health"
    
    # Try to access the application
    if command -v curl &> /dev/null; then
        if curl -f -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/admin/ | grep -q "200\|301\|302"; then
            print_success "Application is responding"
        else
            print_warning "Application may not be responding correctly"
            print_info "Check logs for details"
        fi
    else
        print_info "curl not available - skipping HTTP health check"
    fi
    
    # Check service status
    if systemctl list-units --full -all | grep -Fq "$SERVICE_NAME.service"; then
        if sudo systemctl is-active --quiet "$SERVICE_NAME.service"; then
            print_success "Service is active"
        else
            print_error "Service is not active"
        fi
    fi
}

################################################################################
# Cleanup
################################################################################

cleanup() {
    print_header "Cleanup"
    
    cd "$APP_DIR" || exit 1
    
    # Clean Python cache
    print_step "Cleaning Python cache"
    find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    print_success "Python cache cleaned"
    
    # Clean old log files (older than 30 days)
    if [ -d "logs" ]; then
        print_step "Cleaning old log files"
        find logs -type f -name "*.log" -mtime +30 -delete 2>/dev/null || true
        print_success "Old logs cleaned"
    fi
}

################################################################################
# Generate Update Report
################################################################################

generate_report() {
    print_header "Update Complete!"
    
    echo -e "${GREEN}${ROCKET} Application updated successfully!${NC}\n"
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Update Summary:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "📁 Application: ${GREEN}$APP_NAME${NC}"
    echo -e "📍 Location: ${GREEN}$APP_DIR${NC}"
    echo -e "🔄 Latest Commit: ${GREEN}$LATEST_COMMIT${NC}"
    echo -e "⚡ Service Status: ${GREEN}$(systemctl is-active $SERVICE_NAME.service 2>/dev/null || echo "check manually")${NC}"
    echo -e ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "   View logs: ${GREEN}journalctl -u $SERVICE_NAME.service -f${NC}"
    echo -e "   Restart: ${GREEN}sudo systemctl restart $SERVICE_NAME.service${NC}"
    echo -e "   Status: ${GREEN}sudo systemctl status $SERVICE_NAME.service${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${GREEN}${CHECKMARK} Update completed successfully!${NC}\n"
}

################################################################################
# Main Update Flow
################################################################################

main() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║            TDC Application Update Script                    ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    # Check user and switch if needed
    check_user
    
    # Load environment
    load_environment
    
    # Check git status
    check_git_status
    
    # If no updates, exit
    if [ "$NO_UPDATES" = true ]; then
        print_info "No updates available - exiting"
        exit 0
    fi
    
    # Stop service
    stop_service
    
    # Pull changes
    pull_changes
    
    # Verify environment
    verify_environment
    
    # Update backend
    update_backend
    
    # Update frontend
    update_frontend
    
    # Cleanup
    cleanup
    
    # Start service
    start_service
    
    # Health check
    health_check
    
    # Generate report
    generate_report
}

# Run main update
main "$@"
