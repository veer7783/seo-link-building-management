# Simple PostgreSQL Setup Script
Write-Host "Setting up PostgreSQL for Link Management System..." -ForegroundColor Green

# Check if PostgreSQL is installed
$pgPath = "C:\Program Files\PostgreSQL\16\bin"
if (Test-Path $pgPath) {
    Write-Host "PostgreSQL found at: $pgPath" -ForegroundColor Green
    
    # Add to PATH for current session
    $env:PATH = "$env:PATH;$pgPath"
    
    Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow
    Write-Host "Please enter your PostgreSQL postgres user password when prompted." -ForegroundColor Yellow
    
    # Test connection and create database
    & "$pgPath\psql.exe" -U postgres -d postgres -c "CREATE DATABASE IF NOT EXISTS linkmanagement;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database setup completed successfully!" -ForegroundColor Green
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Update your .env file with the correct password" -ForegroundColor White
        Write-Host "2. Run: cd backend" -ForegroundColor White
        Write-Host "3. Run: npx prisma migrate dev" -ForegroundColor White
    }
} else {
    Write-Host "PostgreSQL not found. Please install PostgreSQL 16 first." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
}
