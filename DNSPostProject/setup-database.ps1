# SQL Server Database Setup using SMO (SQL Management Objects)
# This doesn't require sqlcmd to be installed

[void][System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SqlServer.SMO")

$connectionServers = @(
    "(localdb)\MSSQLLocalDB",
    ".\SQLEXPRESS",
    "."
)

$connected = $false
$smServer = $null
$selectedServer = ""

Write-Host "Attempting to connect to SQL Server..." -ForegroundColor Green

foreach ($server in $connectionServers) {
    try {
        Write-Host "Trying: $server" -ForegroundColor Yellow
        $smServer = New-Object Microsoft.SqlServer.Management.Smo.Server($server)
        $info = $smServer.Information
        Write-Host "[SUCCESS] Connected to $server" -ForegroundColor Green
        $connected = $true
        $selectedServer = $server
        break
    } catch {
        Write-Host "[FAILED] $($_.Exception.Message)" -ForegroundColor Red
    }
}

if (-not $connected) {
    Write-Host "`nSQL Server is not installed or not accessible." -ForegroundColor Red
    Write-Host "Please install SQL Server from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads" -ForegroundColor Yellow
    Write-Host "Alternatively, you can manually run the setup_sqlserver.sql file in SQL Server Management Studio." -ForegroundColor Cyan
    exit 1
}

try {
    Write-Host "`nSetting up database..." -ForegroundColor Green
    
    # Check if database exists
    if (-not $smServer.Databases.Contains("OnlineExam")) {
        Write-Host "Creating OnlineExam database..." -ForegroundColor Cyan
        $db = New-Object Microsoft.SqlServer.Management.Smo.Database($smServer, "OnlineExam")
        $db.Create()
        Write-Host "[SUCCESS] Database created." -ForegroundColor Green
    } else {
        Write-Host "[SUCCESS] Database OnlineExam already exists." -ForegroundColor Green
    }
    
    $db = $smServer.Databases["OnlineExam"]
    
    # Create Users table
    $tableExists = $false
    foreach ($table in $db.Tables) {
        if ($table.Name -eq "Users") {
            $tableExists = $true
            break
        }
    }
    
    if (-not $tableExists) {
        Write-Host "Creating Users table..." -ForegroundColor Cyan
        $sql = "CREATE TABLE Users (Id INT IDENTITY(1,1) PRIMARY KEY, Username NVARCHAR(100) UNIQUE NOT NULL, Password NVARCHAR(100) NOT NULL, Role NVARCHAR(50) NOT NULL DEFAULT 'Student')"
        $db.ExecuteNonQuery($sql)
        Write-Host "[SUCCESS] Users table created." -ForegroundColor Green
    } else {
        Write-Host "[SUCCESS] Users table already exists." -ForegroundColor Green
    }
    
    # Insert test data
    $result = $db.ExecuteWithResults("SELECT COUNT(*) as cnt FROM Users WHERE Username = 'admin'")
    
    if ($result.Tables[0].Rows[0]["cnt"] -eq 0) {
        Write-Host "Inserting test credentials..." -ForegroundColor Cyan
        $sql = "INSERT INTO Users (Username, Password, Role) VALUES ('admin', 'admin123', 'Admin'), ('student1', 'pass1', 'Student')"
        $db.ExecuteNonQuery($sql)
        Write-Host "[SUCCESS] Test credentials inserted." -ForegroundColor Green
    } else {
        Write-Host "[SUCCESS] Test data already exists." -ForegroundColor Green
    }
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`nLogin Credentials:" -ForegroundColor Green
    Write-Host "  Admin:   username: admin    password: admin123" -ForegroundColor Cyan
    Write-Host "  Student: username: student1 password: pass1" -ForegroundColor Cyan
    Write-Host "`nDatabase: OnlineExam" -ForegroundColor Yellow
    Write-Host "Server: $selectedServer" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Green
    
} catch {
    Write-Host "`nError during setup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
