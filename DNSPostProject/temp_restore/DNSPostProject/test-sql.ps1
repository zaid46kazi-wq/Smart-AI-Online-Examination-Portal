$servers = @("Server=(localdb)\MSSQLLocalDB;Database=master;Integrated Security=True", "Server=.\SQLEXPRESS;Database=master;Integrated Security=True", "Server=.;Database=master;Integrated Security=True")
foreach ($s in $servers) {
    try {
        $conn = New-Object System.Data.SqlClient.SqlConnection($s)
        $conn.Open()
        Write-Output "SUCCESS: $s"
        $conn.Close()
    } catch {
        Write-Output "FAILED: $s"
    }
}
