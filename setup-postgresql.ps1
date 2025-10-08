# PostgreSQL Setup Script for Link Management System
# Run this script as Administrator in PowerShell

Write-Host "🐘 Setting up PostgreSQL for Link Management System..." -ForegroundColor Green

# Check if PostgreSQL is already installed
$pgPath = "C:\Program Files\PostgreSQL\16\bin"
$pgService = Get-Service -Name "postgresql-x64-16" -ErrorAction SilentlyContinue

if ($pgService) {
    Write-Host "✅ PostgreSQL service found" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL not installed. Please install PostgreSQL 16 first." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Add PostgreSQL to PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
if ($currentPath -notlike "*$pgPath*") {
    Write-Host "📝 Adding PostgreSQL to system PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$pgPath", "Machine")
    $env:PATH = "$env:PATH;$pgPath"
    Write-Host "✅ PostgreSQL added to PATH" -ForegroundColor Green
} else {
    Write-Host "✅ PostgreSQL already in PATH" -ForegroundColor Green
}

# Test PostgreSQL connection
Write-Host "🔍 Testing PostgreSQL connection..." -ForegroundColor Yellow
$password = Read-Host "Enter your PostgreSQL postgres user password" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Set PGPASSWORD environment variable temporarily
$env:PGPASSWORD = $plainPassword

try {
    # Test connection
    & "$pgPath\psql.exe" -U postgres -d postgres -c "SELECT version();" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL connection successful" -ForegroundColor Green
        
        # Create database
        Write-Host "📊 Creating linkmanagement database..." -ForegroundColor Yellow
        & "$pgPath\psql.exe" -U postgres -d postgres -c "CREATE DATABASE linkmanagement;" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database 'linkmanagement' created successfully" -ForegroundColor Green
        } else {
            Write-Host "ℹ️ Database 'linkmanagement' may already exist" -ForegroundColor Yellow
        }
        
        # Update .env file
        $envPath = ".\backend\.env"
        if (Test-Path $envPath) {
            Write-Host "📝 Updating .env file..." -ForegroundColor Yellow
            $envContent = Get-Content $envPath
            $newEnvContent = $envContent -replace 'DATABASE_URL=".*"', "DATABASE_URL=`"postgresql://postgres:$plainPassword@localhost:5432/linkmanagement`""
            $newEnvContent | Set-Content $envPath
            Write-Host "✅ .env file updated with database connection" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ Failed to connect to PostgreSQL. Please check your password." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error connecting to PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🎉 PostgreSQL setup completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen your terminal to refresh PATH" -ForegroundColor White
Write-Host "2. Run: cd backend" -ForegroundColor White
Write-Host "3. Run: npx prisma migrate dev" -ForegroundColor White
Write-Host "4. Run: npx prisma db seed" -ForegroundColor White
